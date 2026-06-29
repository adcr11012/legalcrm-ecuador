// Edge Function: leer-documento-ahora
// Versión "a pedido" del worker procesar-documentos: el usuario pide
// forzar la lectura de UN documento puntual en vez de esperar la próxima
// ronda del cron. Misma lógica de lectura, pero autenticada con el JWT
// del usuario (RLS confirma que tiene acceso al documento).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
// @deno-types="npm:@types/pdf-parse@1"
import pdfParse from 'npm:pdf-parse@1.1.1'
import mammoth from 'npm:mammoth@1.8.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const MAX_CHARS = 6000

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const j = await res.json()
    return res.ok ? j.access_token : null
  } catch {
    return null
  }
}

async function leerImagenConVision(buffer: ArrayBuffer, mimeType: string, apiKey: string): Promise<string> {
  const base64 = Buffer.from(buffer).toString('base64')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe todo el texto visible en esta imagen, en español si aplica. Si no hay texto, describe brevemente qué se ve.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'El modelo de visión no respondió')
  const texto = data.choices?.[0]?.message?.content?.trim()
  if (!texto) throw new Error('El modelo de visión no devolvió texto')
  return texto.slice(0, MAX_CHARS)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { documento_id } = await req.json()
    if (!documento_id) return json({ error: 'Falta documento_id' }, 400)

    // RLS confirma que el usuario tiene acceso a este documento (vía su caso).
    const { data: doc, error: docError } = await userClient
      .from('documentos')
      .select('id, caso_id, drive_file_id, mime_type, estado_lectura')
      .eq('id', documento_id)
      .maybeSingle()
    if (docError || !doc) return json({ error: 'Documento no encontrado o sin acceso' }, 404)
    if (doc.estado_lectura === 'no_aplica') return json({ error: 'Este tipo de archivo no se puede leer' }, 400)
    if (!doc.drive_file_id) return json({ error: 'Documento sin archivo en Drive' }, 400)

    const { data: caso } = await admin.from('casos').select('workspace_id').eq('id', doc.caso_id).single()
    if (!caso) return json({ error: 'Caso no encontrado' }, 404)

    await admin.from('documentos').update({ estado_lectura: 'procesando' }).eq('id', doc.id)

    try {
      const { data: driveConexion } = await admin
        .from('drive_conexion')
        .select('refresh_token')
        .eq('workspace_id', caso.workspace_id)
        .maybeSingle()
      const accessToken = driveConexion ? await getAccessToken(driveConexion.refresh_token) : null
      if (!accessToken) throw new Error('Google Drive no está conectado en este workspace')

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!fileRes.ok) throw new Error(`No se pudo descargar el archivo (${fileRes.status})`)
      const bytes = await fileRes.arrayBuffer()
      const mime = doc.mime_type ?? ''
      let texto: string | null = null

      if (mime === 'application/pdf') {
        const parsed = await pdfParse(Buffer.from(bytes))
        texto = parsed.text?.trim().slice(0, MAX_CHARS) || null
        if (!texto) throw new Error('PDF escaneado: la lectura de PDFs sin texto (imagen) todavía no está soportada')
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
        texto = result.value?.trim().slice(0, MAX_CHARS) || null
      } else if (mime.startsWith('image/')) {
        const { data: orConexion } = await admin
          .from('openrouter_conexion')
          .select('api_key')
          .eq('workspace_id', caso.workspace_id)
          .maybeSingle()
        if (!orConexion) throw new Error('La lectura de imágenes (OpenRouter) no está conectada en este workspace')
        texto = await leerImagenConVision(bytes, mime, orConexion.api_key)
      } else {
        throw new Error(`Tipo de archivo no soportado para lectura (${mime || 'desconocido'})`)
      }

      await admin.from('documentos').update({ estado_lectura: 'listo', contenido_texto: texto, error_lectura: null }).eq('id', doc.id)
      return json({ ok: true, estado_lectura: 'listo' })
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err)
      await admin.from('documentos').update({ estado_lectura: 'error', error_lectura: mensaje }).eq('id', doc.id)
      return json({ error: mensaje }, 400)
    }
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado leyendo el documento' }, 500)
  }
})
