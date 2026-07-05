// Edge Function: workspace-ia
// Asistente de IA con contexto general del workspace: lista de casos,
// clientes y plazos próximos. No lee contenido de documentos (eso es
// específico de cada caso, ver caso-ia).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const IDENTIDAD_TEMIS = `Tu nombre es Temis. Eres la asistente de inteligencia artificial de TSADOQ.

SOBRE TU NOMBRE: Temis (Θέμις) es la diosa titánide griega de la justicia divina, la ley y el orden sagrado. Hija de Urano y Gea, consejera de Zeus. Se la representa con una balanza —símbolo de equidad— y a veces con los ojos vendados, porque la justicia no distingue personas. "Temis" en griego significa "lo establecido", la ley como fundamento inamovible. Ese nombre fue elegido porque encarna los valores del derecho: imparcialidad, orden y justicia.

SOBRE TSADOQ: TSADOQ es el nombre de la aplicación. Viene del hebreo bíblico צָדוֹק (Tsadoq/Zadok), que significa "justo" o "el que es recto". En la Biblia, Sadoc fue el sumo sacerdote leal al rey David y Salomón, reconocido por su integridad y apego a la ley divina. El nombre fue elegido para este gestor legal porque evoca rectitud y fidelidad a la ley. Tanto Temis (griega) como Tsadoq (hebrea) convergen en el mismo valor: la justicia como absoluto.

SOBRE EL LOGO: El logo de TSADOQ es una balanza de la justicia vista desde arriba. Esta perspectiva cenital convierte los platillos en una figura simétrica que evoca equilibrio e imparcialidad — la misma balanza que porta Temis, contemplada desde una mirada elevada.

SOBRE EL CREADOR DE LA APLICACIÓN: TSADOQ fue creado por el Lcdo. Andrés Castro Rodríguez, ecuatoriano, consultor de gestión documental, magnate del cacao y banano, padre y esposo fiel (¡certificado!), pastor supremo de borregos y chivos lecheros, filántropo e interesado por un mundo más organizado. Cuando pregunten quién creó la aplicación o quién es el autor de TSADOQ, di exactamente eso. Si preguntan quién te creó a ti como IA, explica que eres una IA basada en modelos de lenguaje, integrada en TSADOQ con el nombre de Temis.`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 404)

    // RLS del cliente del usuario filtra automáticamente por su workspace y permisos.
    const [{ data: casos }, { data: etapas }, { data: clientes }, { data: plazos }] = await Promise.all([
      userClient.from('casos').select('titulo, materia, etapa_id, numero_causa').order('created_at', { ascending: false }).limit(100),
      userClient.from('etapas').select('id, nombre'),
      userClient.from('clientes').select('nombre, estado').order('created_at', { ascending: false }).limit(100),
      userClient
        .from('plazos')
        .select('titulo, fecha, tipo, caso_id')
        .gte('fecha', new Date().toISOString().slice(0, 10))
        .order('fecha')
        .limit(30),
    ])

    const etapaNombre = new Map((etapas ?? []).map((e) => [e.id, e.nombre]))
    const casosTexto = (casos ?? [])
      .map((c) => `- "${c.titulo}" · ${c.materia ?? 'sin materia'} · etapa: ${etapaNombre.get(c.etapa_id) ?? 'sin etapa'}${c.numero_causa ? ` · causa ${c.numero_causa}` : ''}`)
      .join('\n')
    const clientesTexto = (clientes ?? []).map((c) => `- ${c.nombre} (${c.estado})`).join('\n')
    const plazosTexto = (plazos ?? []).map((p) => `- ${p.fecha}: ${p.titulo} (${p.tipo})`).join('\n')

    const contexto = `
Casos del workspace (${casos?.length ?? 0}):
${casosTexto || '(sin casos)'}

Clientes (${clientes?.length ?? 0}):
${clientesTexto || '(sin clientes)'}

Próximos plazos y audiencias:
${plazosTexto || '(sin plazos próximos)'}
`.trim()

    const { data: groqApiKey } = await admin.rpc('get_groq_key', { p_workspace_id: perfil.workspace_id })
    if (!groqApiKey) return json({ error: 'TSADOQ IA no está conectada en este workspace' }, 400)

    const { pregunta } = await req.json()
    const pregFinal = typeof pregunta === 'string' && pregunta.trim() ? pregunta.trim() : '¿Qué debería priorizar hoy?'

    const messages = [
      {
        role: 'system',
        content: IDENTIDAD_TEMIS + '\n\nDATOS DEL WORKSPACE:\n' + contexto + '\n\nResponde en español, claro y breve. Usa los datos del workspace para preguntas sobre casos, clientes o plazos. Si no tienes el dato, dilo. Para preguntas sobre ti, TSADOQ, el logo o el creador, usa tu identidad.',
      },
      { role: 'user', content: pregFinal },
    ]

    let respuesta: string | null = null
    let lastError = 'La IA no respondió'
    for (const model of GROQ_MODELS) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const data = await res.json()
      if (res.ok) {
        respuesta = data.choices?.[0]?.message?.content ?? '(sin respuesta)'
        break
      }
      lastError = data.error?.message ?? lastError
      if (res.status !== 429 && res.status !== 503) break
    }

    if (!respuesta) return json({ error: lastError }, 400)
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado consultando la IA del workspace' }, 500)
  }
})
