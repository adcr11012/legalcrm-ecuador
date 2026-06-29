// Edge Function: workspace-ia
// Asistente de IA con contexto general del workspace: lista de casos,
// clientes y plazos próximos. No lee contenido de documentos (eso es
// específico de cada caso, ver caso-ia).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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

    const { data: groqConexion } = await admin
      .from('groq_conexion')
      .select('api_key')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()
    if (!groqConexion) return json({ error: 'TSADOQ IA no está conectada en este workspace' }, 400)

    const { pregunta } = await req.json()
    const pregFinal = typeof pregunta === 'string' && pregunta.trim() ? pregunta.trim() : '¿Qué debería priorizar hoy?'

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqConexion.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Eres el asistente de TSADOQ, un gestor legal de casos. Responde en español, claro y breve, usando ÚNICAMENTE la información del workspace que se te da a continuación. Si no tienes la información para responder algo, dilo explícitamente en vez de inventar.\n\n' +
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
    return json({ error: 'Error inesperado consultando la IA del workspace' }, 500)
  }
})
