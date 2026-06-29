// Edge Function: procesar-documentos
// Worker invocado por un cron de Supabase cada pocos minutos. Toma un lote
// pequeño de documentos en estado "pendiente" (de cualquier workspace),
// extrae su texto según el tipo de archivo, y guarda el resultado — para
// que caso-ia solo tenga que leer texto ya calculado, sin procesar nada
// en vivo ni arriesgar timeouts.
//
// Rutas según mime_type:
//  - application/pdf con texto real -> pdf-parse
//  - application/pdf escaneado (sin texto) -> por ahora queda en error;
//    convertir páginas a imagen no está soportado todavía.
//  - image/* -> modelo de visión gratis de OpenRouter (Nemotron)
//  - Word (.docx) -> extracción directa de texto (mammoth)
//  - cualquier otro tipo no llega aquí (queda en 'no_aplica' desde la subida)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
// @deno-types="npm:@types/pdf-parse@1"
import pdfParse from 'npm:pdf-parse@1.1.1'
import mammoth from 'npm:mammoth@1.8.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const MAX_CHARS = 6000
const LOTE = 5

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

async function descargarArchivo(fileId: string, accessToken: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`)
  return await res.arrayBuffer()
}

async function leerPdf(buffer: Buffer): Promise<{ texto: string | null; escaneado: boolean }> {
  const parsed = await pdfParse(buffer)
  const texto = parsed.text?.trim().slice(0, MAX_CHARS) || null
  return { texto, escaneado: !texto }
}

async function leerDocx(buffer: Buffer): Promise<string | null> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value?.trim().slice(0, MAX_CHARS) || null
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

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: 'No autorizado' }, 401)
  }

  try {
    const { data: pendientes, error: pendError } = await admin
      .from('documentos')
      .select('id, caso_id, drive_file_id, mime_type')
      .eq('estado_lectura', 'pendiente')
      .order('created_at', { ascending: true })
      .limit(LOTE)
    if (pendError) throw pendError
    if (!pendientes || pendientes.length === 0) return json({ procesados: 0 })

    const casoIds = [...new Set(pendientes.map((d) => d.caso_id))]
    const { data: casos } = await admin.from('casos').select('id, workspace_id').in('id', casoIds)
    const workspaceDeCaso = new Map((casos ?? []).map((c) => [c.id, c.workspace_id]))

    const tokenCache = new Map<string, string | null>()
    const visionKeyCache = new Map<string, string | null>()

    async function tokenParaWorkspace(workspaceId: string): Promise<string | null> {
      if (tokenCache.has(workspaceId)) return tokenCache.get(workspaceId)!
      const { data } = await admin.from('drive_conexion').select('refresh_token').eq('workspace_id', workspaceId).maybeSingle()
      const token = data ? await getAccessToken(data.refresh_token) : null
      tokenCache.set(workspaceId, token)
      return token
    }

    async function visionKeyParaWorkspace(workspaceId: string): Promise<string | null> {
      if (visionKeyCache.has(workspaceId)) return visionKeyCache.get(workspaceId)!
      const { data } = await admin.from('openrouter_conexion').select('api_key').eq('workspace_id', workspaceId).maybeSingle()
      visionKeyCache.set(workspaceId, data?.api_key ?? null)
      return data?.api_key ?? null
    }

    let procesados = 0
    for (const doc of pendientes) {
      const workspaceId = workspaceDeCaso.get(doc.caso_id)
      await admin.from('documentos').update({ estado_lectura: 'procesando' }).eq('id', doc.id)

      try {
        if (!workspaceId) throw new Error('Caso sin workspace')
        if (!doc.drive_file_id) throw new Error('Documento sin archivo en Drive')

        const accessToken = await tokenParaWorkspace(workspaceId)
        if (!accessToken) throw new Error('Google Drive no está conectado en este workspace')

        const bytes = await descargarArchivo(doc.drive_file_id, accessToken)
        const mime = doc.mime_type ?? ''
        let texto: string | null = null

        if (mime === 'application/pdf') {
          const { texto: textoPdf, escaneado } = await leerPdf(Buffer.from(bytes))
          if (escaneado) throw new Error('PDF escaneado: la lectura de PDFs sin texto (imagen) todavía no está soportada')
          texto = textoPdf
        } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          texto = await leerDocx(Buffer.from(bytes))
        } else if (mime.startsWith('image/')) {
          const apiKey = await visionKeyParaWorkspace(workspaceId)
          if (!apiKey) throw new Error('La lectura de imágenes (OpenRouter) no está conectada en este workspace')
          texto = await leerImagenConVision(bytes, mime, apiKey)
        } else {
          throw new Error(`Tipo de archivo no soportado para lectura (${mime || 'desconocido'})`)
        }

        await admin
          .from('documentos')
          .update({ estado_lectura: 'listo', contenido_texto: texto, error_lectura: null })
          .eq('id', doc.id)
        procesados++
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err)
        console.error('procesar-documentos error', doc.id, mensaje)
        await admin.from('documentos').update({ estado_lectura: 'error', error_lectura: mensaje }).eq('id', doc.id)
      }
    }

    return json({ procesados, total: pendientes.length })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado procesando documentos' }, 500)
  }
})
