// Edge Function: leer-documento-ahora

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
// @deno-types="npm:@types/pdf-parse@1"
import pdfParse from 'npm:pdf-parse@1.1.1'
import mammoth from 'npm:mammoth@1.8.0'
import { init as initPdfium } from 'npm:@embedpdf/pdfium@2'
import { PNG } from 'npm:pngjs@7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const PDF_VISION_MODEL = 'openrouter/auto'
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

// Rasteriza la primera página del PDF a PNG usando PDFium WASM (Apache 2.0 / MIT)
async function pdfAPng(pdfBytes: ArrayBuffer): Promise<Buffer> {
  const pdfium = await initPdfium()
  pdfium.PDFiumExt_Init()

  const wasm = (pdfium as unknown as { pdfium: { _malloc: (n: number) => number; _free: (p: number) => void; HEAPU8: Uint8Array } }).pdfium
  const buf = new Uint8Array(pdfBytes)
  const ptr = wasm._malloc(buf.byteLength)
  wasm.HEAPU8.set(buf, ptr)
  const docPtr = pdfium.FPDF_LoadMemDocument(ptr, buf.byteLength, '')
  if (!docPtr) { wasm._free(ptr); throw new Error(`PDFium no pudo abrir el PDF (error ${pdfium.FPDF_GetLastError()})`) }

  const pagePtr = pdfium.FPDF_LoadPage(docPtr, 0)
  if (!pagePtr) throw new Error('PDFium: no se pudo cargar la página 0')

  const scale = 150 / 72
  const renderW = Math.round(pdfium.FPDF_GetPageWidth(pagePtr) * scale)
  const renderH = Math.round(pdfium.FPDF_GetPageHeight(pagePtr) * scale)

  const bmpPtr = pdfium.FPDFBitmap_Create(renderW, renderH, 0)
  pdfium.FPDFBitmap_FillRect(bmpPtr, 0, 0, renderW, renderH, 0xFFFFFFFF)
  pdfium.FPDF_RenderPageBitmap(bmpPtr, pagePtr, 0, 0, renderW, renderH, 0, 0)

  const stride = pdfium.FPDFBitmap_GetStride(bmpPtr)
  const bmpDataPtr = pdfium.FPDFBitmap_GetBuffer(bmpPtr)
  const raw = wasm.HEAPU8.slice(bmpDataPtr, bmpDataPtr + stride * renderH)

  // BGRA → RGBA
  const rgba = new Uint8Array(renderW * renderH * 4)
  for (let i = 0; i < renderW * renderH; i++) {
    const s = i * 4
    rgba[s] = raw[s + 2]; rgba[s + 1] = raw[s + 1]; rgba[s + 2] = raw[s]; rgba[s + 3] = 255
  }

  pdfium.FPDFBitmap_Destroy(bmpPtr)
  pdfium.FPDF_ClosePage(pagePtr)
  pdfium.FPDF_CloseDocument(docPtr)
  wasm._free(ptr)

  // Encodear a PNG
  const png = new PNG({ width: renderW, height: renderH })
  png.data = Buffer.from(rgba)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    const s = png.pack()
    s.on('data', (c: Buffer) => chunks.push(c))
    s.on('end', resolve)
    s.on('error', reject)
  })
  return Buffer.concat(chunks)
}

async function leerImagenConVision(buffer: ArrayBuffer | Buffer, mimeType: string, apiKey: string, model = VISION_MODEL): Promise<string> {
  const base64 = Buffer.from(buffer as ArrayBuffer).toString('base64')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe todo el texto visible en esta imagen, en español si aplica. Si no hay texto, describe brevemente qué se ve.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'El modelo de visión no respondió')
  const raw = data.choices?.[0]?.message?.content
  const texto = (Array.isArray(raw) ? raw.map((b: { text?: string }) => b.text ?? '').join('') : raw ?? '').trim()
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
      let modeloUsado: string | null = null

      if (mime === 'application/pdf') {
        const parsed = await pdfParse(Buffer.from(bytes))
        texto = parsed.text?.trim().slice(0, MAX_CHARS) || null
        if (!texto) {
          const { data: orApiKey } = await admin.rpc('get_openrouter_key', { p_workspace_id: caso.workspace_id })
          if (!orApiKey) throw new Error('PDF escaneado: conecta OpenRouter (Visión) para leer este tipo de archivo')
          const pngBuf = await pdfAPng(bytes)
          texto = await leerImagenConVision(pngBuf, 'image/png', orApiKey, PDF_VISION_MODEL)
          modeloUsado = PDF_VISION_MODEL
        } else {
          modeloUsado = 'pdf-parse'
        }
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
        texto = result.value?.trim().slice(0, MAX_CHARS) || null
        modeloUsado = 'mammoth'
      } else if (mime.startsWith('image/')) {
        const { data: orApiKey } = await admin.rpc('get_openrouter_key', { p_workspace_id: caso.workspace_id })
        if (!orApiKey) throw new Error('La lectura de imágenes (OpenRouter) no está conectada en este workspace')
        texto = await leerImagenConVision(bytes, mime, orApiKey)
        modeloUsado = VISION_MODEL
      } else {
        throw new Error(`Tipo de archivo no soportado (${mime || 'desconocido'})`)
      }

      await admin.from('documentos').update({ estado_lectura: 'listo', contenido_texto: texto, error_lectura: null, modelo_lectura: modeloUsado }).eq('id', doc.id)
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
