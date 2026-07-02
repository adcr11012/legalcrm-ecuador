// Edge Function: caso-ia
// Asistente de IA con contexto de un caso específico: datos del caso,
// partes, plazos, historial, y el texto de los documentos. El texto de
// los documentos ya fue extraído de antemano por el worker en segundo
// plano (procesar-documentos) — aquí solo se lee lo que ya está calculado,
// sin descargar ni procesar nada en vivo.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

function descripcionDocumento(doc: { nombre: string; created_at: string; estado_lectura: string; contenido_texto: string | null; error_lectura: string | null }): string {
  const fecha = doc.created_at.slice(0, 10)
  if (doc.estado_lectura === 'listo' && doc.contenido_texto) {
    return `### Documento: "${doc.nombre}" (subido ${fecha})\nTEXTO:\n${doc.contenido_texto}`
  }
  if (doc.estado_lectura === 'pendiente' || doc.estado_lectura === 'procesando') {
    return `### Documento: "${doc.nombre}" (subido ${fecha}) — todavía se está procesando, vuelve a preguntar en unos minutos`
  }
  if (doc.estado_lectura === 'error') {
    return `### Documento: "${doc.nombre}" (subido ${fecha}) — no se pudo leer su contenido (${doc.error_lectura ?? 'error desconocido'})`
  }
  return `### Documento: "${doc.nombre}" (subido ${fecha}) — solo nombre, sin lectura de contenido para este tipo de archivo`
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
    const [{ data: caso, error: casoError }, { data: personas }, { data: plazos }, { data: historial }, { data: documentos }, { data: anticipos }, { data: gastos }, { data: horas }] =
      await Promise.all([
        userClient.from('casos').select('*').eq('id', caso_id).maybeSingle(),
        userClient.from('caso_personas').select('*').eq('caso_id', caso_id),
        userClient.from('plazos').select('*').eq('caso_id', caso_id).order('fecha'),
        userClient.from('historial').select('*').eq('caso_id', caso_id).order('created_at', { ascending: false }).limit(12),
        userClient.from('documentos').select('nombre, created_at, estado_lectura, contenido_texto, error_lectura').eq('caso_id', caso_id).order('created_at', { ascending: false }),
        userClient.from('caso_anticipos').select('fecha, monto, detalle').eq('caso_id', caso_id).order('fecha'),
        userClient.from('caso_gastos').select('fecha, monto, descripcion, cobrable').eq('caso_id', caso_id).order('fecha'),
        userClient.from('caso_horas').select('fecha, descripcion, horas, valor_hora').eq('caso_id', caso_id).order('fecha'),
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
    const documentosTexto = documentos && documentos.length > 0 ? documentos.map(descripcionDocumento).join('\n\n') : '(sin documentos)'

    const fmt = (n: number) => `$${Number(n).toFixed(2)}`
    const anticiposTexto = (anticipos ?? []).length > 0
      ? (anticipos ?? []).map((a) => `- ${a.fecha}: ${fmt(a.monto)}${a.detalle ? ' — ' + a.detalle : ''}`).join('\n')
      : '(sin anticipos)'
    const gastosTexto = (gastos ?? []).length > 0
      ? (gastos ?? []).map((g) => `- ${g.fecha}: ${fmt(g.monto)} — ${g.descripcion} (${g.cobrable ? 'cobrable al cliente' : 'informativo'})`).join('\n')
      : '(sin gastos)'
    const horasTexto = (horas ?? []).length > 0
      ? (horas ?? []).map((h) => `- ${h.fecha}: ${h.horas}hrs × ${fmt(h.valor_hora)}/hr = ${fmt(Number(h.horas) * Number(h.valor_hora))} — ${h.descripcion}`).join('\n')
      : null

    const totalAnticipos = (anticipos ?? []).reduce((s, a) => s + Number(a.monto), 0)
    const totalGastosCob = (gastos ?? []).filter((g) => g.cobrable).reduce((s, g) => s + Number(g.monto), 0)
    const totalHoras = (horas ?? []).reduce((s, h) => s + Number(h.horas) * Number(h.valor_hora), 0)
    const honorarioBase = caso.honorarios_tipo === 'por_hora' ? totalHoras : (Number(caso.honorarios_monto) || 0)
    const saldo = honorarioBase + totalGastosCob - totalAnticipos

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

Estado de cuenta:
${horasTexto ? `Horas trabajadas:\n${horasTexto}\nTotal honorarios por hora: ${fmt(totalHoras)}\n` : ''}Anticipos recibidos:\n${anticiposTexto}
Gastos:\n${gastosTexto}
Saldo pendiente: ${fmt(saldo)} ${saldo <= 0 ? '(SALDADO)' : ''}

Documentos:
${documentosTexto}
`.trim()

    const pregFinal = typeof pregunta === 'string' && pregunta.trim() ? pregunta.trim() : 'Resume este caso en pocas oraciones, en español.'

    const messages = [
      {
        role: 'system',
        content:
          'Eres el asistente de TSADOQ, un gestor legal de casos. Responde en español, de forma clara y breve, usando ÚNICAMENTE la información del caso que se te da a continuación. Si no tienes la información para responder algo, dilo explícitamente en vez de inventar.\n\n' +
          contexto,
      },
      { role: 'user', content: pregFinal },
    ]

    let respuesta: string | null = null
    let lastError = 'La IA no respondió'
    for (const model of GROQ_MODELS) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqConexion.api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const data = await res.json()
      if (res.ok) {
        respuesta = data.choices?.[0]?.message?.content ?? '(sin respuesta)'
        break
      }
      lastError = data.error?.message ?? lastError
      // Solo reintenta si es error de capacidad/rate limit
      if (res.status !== 429 && res.status !== 503) break
    }

    if (!respuesta) return json({ error: lastError }, 400)
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado consultando la IA del caso' }, 500)
  }
})
