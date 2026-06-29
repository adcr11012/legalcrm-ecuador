// Edge Function: caso-ia
// Asistente de IA con contexto de un caso específico: datos del caso,
// partes, plazos, historial, y el TEXTO real de los documentos PDF
// subidos a Drive (los demás tipos de archivo solo aportan su nombre).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
// @deno-types="npm:@types/pdf-parse@1"
import pdfParse from 'npm:pdf-parse@1.1.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const MAX_DOCS_CON_TEXTO = 5
const MAX_CHARS_POR_DOC = 3000

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

async function extraerTextoPdf(fileId: string, accessToken: string): Promise<{ texto: string | null; motivo: string }> {
  try {
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const meta = await metaRes.json()
    if (!metaRes.ok) return { texto: null, motivo: `no se pudo leer metadata (${metaRes.status}: ${meta.error?.message ?? 'sin detalle'})` }
    if (meta.mimeType !== 'application/pdf') return { texto: null, motivo: `tipo de archivo "${meta.mimeType}", no es PDF` }

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fileRes.ok) return { texto: null, motivo: `no se pudo descargar el archivo (${fileRes.status})` }
    const buffer = Buffer.from(await fileRes.arrayBuffer())
    const parsed = await pdfParse(buffer)
    const texto = parsed.text?.trim().slice(0, MAX_CHARS_POR_DOC) || null
    return texto ? { texto, motivo: 'ok' } : { texto: null, motivo: 'el PDF no tiene texto extraíble (puede ser escaneado/imagen)' }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err)
    console.error('extraerTextoPdf error', fileId, err)
    return { texto: null, motivo: `error al procesar el PDF: ${mensaje}` }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { caso_id, pregunta } = await req.json()
    if (!caso_id) return json({ error: 'Falta caso_id' }, 400)

    // RLS del propio cliente filtra automáticamente por permisos del usuario.
    const [{ data: caso, error: casoError }, { data: personas }, { data: plazos }, { data: historial }, { data: documentos }] =
      await Promise.all([
        userClient.from('casos').select('*').eq('id', caso_id).maybeSingle(),
        userClient.from('caso_personas').select('*').eq('caso_id', caso_id),
        userClient.from('plazos').select('*').eq('caso_id', caso_id).order('fecha'),
        userClient.from('historial').select('*').eq('caso_id', caso_id).order('created_at', { ascending: false }).limit(12),
        userClient.from('documentos').select('*').eq('caso_id', caso_id).order('created_at', { ascending: false }),
      ])
    if (casoError || !caso) return json({ error: 'Caso no encontrado o sin acceso' }, 404)

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 404)

    const { data: etapa } = caso.etapa_id ? await userClient.from('etapas').select('nombre').eq('id', caso.etapa_id).maybeSingle() : { data: null }

    const userIds = (personas ?? []).map((p) => p.user_id).filter(Boolean)
    const { data: usuarios } = userIds.length ? await admin.from('users').select('id, nombre').in('id', userIds) : { data: [] }
    const nombreUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]))

    const partesTexto = (personas ?? [])
      .map((p) => `- ${p.nombre_externo ?? nombreUsuario.get(p.user_id) ?? 'Sin nombre'} (${p.rol})`)
      .join('\n')

    const plazosTexto = (plazos ?? []).map((p) => `- ${p.fecha}: ${p.titulo} (${p.tipo})`).join('\n')
    const historialTexto = (historial ?? []).map((h) => `- ${h.created_at.slice(0, 10)}: ${h.accion}${h.detalle ? ' — ' + h.detalle : ''}`).join('\n')

    // Lectura de texto real de documentos PDF (los más recientes, vía Drive).
    let documentosTexto = '(sin documentos)'
    if (documentos && documentos.length > 0) {
      const { data: driveConexion } = await admin
        .from('drive_conexion')
        .select('refresh_token')
        .eq('workspace_id', perfil.workspace_id)
        .maybeSingle()
      const accessToken = driveConexion ? await getAccessToken(driveConexion.refresh_token) : null
      const sinConexionMotivo = !driveConexion
        ? 'Google Drive no está conectado en este workspace'
        : !accessToken
          ? 'no se pudo obtener un token de acceso de Google (revisa la conexión de Drive)'
          : null

      const partes: string[] = []
      let leidos = 0
      for (const doc of documentos) {
        if (accessToken && doc.drive_file_id && leidos < MAX_DOCS_CON_TEXTO) {
          const { texto, motivo } = await extraerTextoPdf(doc.drive_file_id, accessToken)
          if (texto) leidos++
          partes.push(
            texto
              ? `### Documento: "${doc.nombre}" (subido ${doc.created_at.slice(0, 10)})\nTEXTO:\n${texto}`
              : `### Documento: "${doc.nombre}" — no se pudo leer su contenido (${motivo})`,
          )
        } else {
          partes.push(
            `### Documento: "${doc.nombre}" (subido ${doc.created_at.slice(0, 10)}) — solo nombre, sin texto leído${sinConexionMotivo ? ` (${sinConexionMotivo})` : ''}`,
          )
        }
      }
      documentosTexto = partes.join('\n\n')
    }

    const { data: groqConexion } = await admin
      .from('groq_conexion')
      .select('api_key')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()
    if (!groqConexion) return json({ error: 'TSADOQ IA no está conectada en este workspace' }, 400)

    const contexto = `
Caso: ${caso.titulo}
Materia: ${caso.materia ?? 'no especificada'} · Tipo de acción: ${caso.tipo_accion ?? 'no especificado'}
Etapa actual: ${etapa?.nombre ?? 'sin etapa'} · Instancia: ${caso.instancia_actual}
N° de causa: ${caso.numero_causa ?? 'sin registrar'} · Juzgado: ${caso.juzgado ?? 'sin registrar'}
Contencioso: ${caso.es_contencioso ? 'sí' : 'no'}${caso.contraparte_nombre ? ` · Contraparte: ${caso.contraparte_nombre}` : ''}
Honorarios: ${caso.honorarios_tipo ?? 'sin registrar'}${caso.honorarios_monto ? ` · $${caso.honorarios_monto}` : ''}

Partes/equipo:
${partesTexto || '(sin personas asignadas)'}

Plazos y audiencias:
${plazosTexto || '(sin plazos registrados)'}

Historial reciente:
${historialTexto || '(sin actividad registrada)'}

Documentos:
${documentosTexto}
`.trim()

    const pregFinal = typeof pregunta === 'string' && pregunta.trim() ? pregunta.trim() : 'Resume este caso en pocas oraciones, en español.'

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqConexion.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Eres el asistente de TSADOQ, un gestor legal de casos. Responde en español, de forma clara y breve, usando ÚNICAMENTE la información del caso que se te da a continuación. Si no tienes la información para responder algo, dilo explícitamente en vez de inventar.\n\n' +
              contexto,
          },
          { role: 'user', content: pregFinal },
        ],
      }),
    })
    const groqJson = await groqRes.json()
    if (!groqRes.ok) {
      console.error('Groq call failed', groqJson)
      return json({ error: groqJson.error?.message ?? 'La IA no respondió' }, 400)
    }

    const respuesta = groqJson.choices?.[0]?.message?.content ?? '(sin respuesta)'
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado consultando la IA del caso' }, 500)
  }
})
