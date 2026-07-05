// Edge Function: procesar-documentos
// Worker invocado por un cron de Supabase cada pocos minutos.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
// @deno-types="npm:@types/pdf-parse@1"
import pdfParse from 'npm:pdf-parse@1.1.1'
import mammoth from 'npm:mammoth@1.8.0'
import { init as initPdfium } from 'npm:@embedpdf/pdfium@2'
import { PNG } from 'npm:pngjs@7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const PDF_VISION_MODEL = 'openrouter/auto'
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

  const rgba = new Uint8Array(renderW * renderH * 4)
  for (let i = 0; i < renderW * renderH; i++) {
    const s = i * 4
    rgba[s] = raw[s + 2]; rgba[s + 1] = raw[s + 1]; rgba[s + 2] = raw[s]; rgba[s + 3] = 255
  }

  pdfium.FPDFBitmap_Destroy(bmpPtr)
  pdfium.FPDF_ClosePage(pagePtr)
  pdfium.FPDF_CloseDocument(docPtr)
  wasm._free(ptr)

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

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) return json({ error: 'No autorizado' }, 401)

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
      const { data } = await admin.rpc('get_openrouter_key', { p_workspace_id: workspaceId })
      visionKeyCache.set(workspaceId, data ?? null)
      return data ?? null
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

        const bytes = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => { if (!r.ok) throw new Error(`Drive error ${r.status}`); return r.arrayBuffer() })

        const mime = doc.mime_type ?? ''
        let texto: string | null = null
        let modeloUsado: string | null = null

        if (mime === 'application/pdf') {
          const parsed = await pdfParse(Buffer.from(bytes))
          texto = parsed.text?.trim().slice(0, MAX_CHARS) || null
          if (!texto) {
            const apiKey = await visionKeyParaWorkspace(workspaceId)
            if (!apiKey) throw new Error('PDF escaneado: conecta OpenRouter (Visión) para leer este tipo de archivo')
            const pngBuf = await pdfAPng(bytes)
            texto = await leerImagenConVision(pngBuf, 'image/png', apiKey, PDF_VISION_MODEL)
            modeloUsado = PDF_VISION_MODEL
          } else {
            modeloUsado = 'pdf-parse'
          }
        } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
          texto = result.value?.trim().slice(0, MAX_CHARS) || null
          modeloUsado = 'mammoth'
        } else if (mime.startsWith('image/')) {
          const apiKey = await visionKeyParaWorkspace(workspaceId)
          if (!apiKey) throw new Error('La lectura de imágenes (OpenRouter) no está conectada en este workspace')
          texto = await leerImagenConVision(bytes, mime, apiKey)
          modeloUsado = VISION_MODEL
        } else {
          throw new Error(`Tipo de archivo no soportado (${mime || 'desconocido'})`)
        }

        await admin.from('documentos').update({ estado_lectura: 'listo', contenido_texto: texto, error_lectura: null, modelo_lectura: modeloUsado }).eq('id', doc.id)
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
