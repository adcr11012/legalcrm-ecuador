// Edge Function: groq-test
// Envía un prompt a Groq usando la clave guardada del workspace y
// devuelve la respuesta. Cualquier miembro del workspace puede usarla
// (es de solo lectura hacia Groq, no modifica nada).

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'No autenticado' }, 401)
    }

    const { data: perfil, error: perfilError } = await admin
      .from('users')
      .select('workspace_id')
      .eq('id', userData.user.id)
      .single()
    if (perfilError || !perfil) {
      return json({ error: 'Perfil no encontrado' }, 404)
    }

    const { data: groqApiKey, error: conexionError } = await admin.rpc('get_groq_key', { p_workspace_id: perfil.workspace_id })
    if (conexionError || !groqApiKey) {
      return json({ error: 'La IA no está conectada en este workspace' }, 400)
    }

    const { prompt } = await req.json()
    const texto = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : '¿Quién eres? Responde en una sola oración, en español.'

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: texto }] }),
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
    return json({ error: 'Error inesperado llamando a la IA' }, 500)
  }
})
