// Edge Function: openrouter-test
// Envía un prompt de texto a OpenRouter usando la clave guardada del
// workspace y devuelve la respuesta. Solo para probar la conexión desde
// Configuración (no implica lectura de imágenes real).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'

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

    const { data: conexion, error: conexionError } = await admin
      .from('openrouter_conexion')
      .select('api_key')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()
    if (conexionError || !conexion) {
      return json({ error: 'La lectura de imágenes no está conectada en este workspace' }, 400)
    }

    const { prompt } = await req.json()
    const texto = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : '¿Quién eres? Responde en una sola oración, en español.'

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${conexion.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: VISION_MODEL, messages: [{ role: 'user', content: texto }] }),
    })
    const orJson = await orRes.json()
    if (!orRes.ok) {
      console.error('OpenRouter call failed', orJson)
      return json({ error: orJson.error?.message ?? 'No respondió' }, 400)
    }

    const respuesta = orJson.choices?.[0]?.message?.content ?? '(sin respuesta)'
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado llamando a la lectura de imágenes' }, 500)
  }
})
