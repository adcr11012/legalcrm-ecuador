// Edge Function: openrouter-conectar
// Recibe una API key de OpenRouter (openrouter.ai/keys), valida que
// funcione con una llamada de prueba al modelo de visión gratis, y la
// guarda a nivel de workspace. Solo un admin puede conectar.

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
      .select('workspace_id, es_admin')
      .eq('id', userData.user.id)
      .single()
    if (perfilError || !perfil) {
      return json({ error: 'Perfil no encontrado' }, 404)
    }
    if (!perfil.es_admin) {
      return json({ error: 'Solo un administrador puede conectar la lectura de imágenes' }, 403)
    }

    const { api_key } = await req.json()
    if (!api_key || typeof api_key !== 'string') {
      return json({ error: 'Falta la clave de API' }, 400)
    }

    // Validar la clave con una llamada mínima antes de guardarla.
    const testRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: VISION_MODEL, messages: [{ role: 'user', content: 'Responde solo: OK' }] }),
    })
    const testJson = await testRes.json()
    if (!testRes.ok) {
      console.error('OpenRouter key validation failed', testJson)
      return json({ error: testJson.error?.message ?? 'La clave no es válida' }, 400)
    }

    const { error: upsertError } = await admin.from('openrouter_conexion').upsert({
      workspace_id: perfil.workspace_id,
      api_key,
      connected_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    if (upsertError) {
      console.error(upsertError)
      return json({ error: 'No se pudo guardar la conexión' }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado conectando la lectura de imágenes' }, 500)
  }
})
