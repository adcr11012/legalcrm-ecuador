// Edge Function: gemini-test
// Envía un prompt a Gemini usando la clave guardada del workspace y
// devuelve la respuesta. Cualquier miembro del workspace puede usarla
// (es de solo lectura hacia Google, no modifica nada).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

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
      .from('gemini_conexion')
      .select('api_key')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()
    if (conexionError || !conexion) {
      return json({ error: 'Gemini no está conectado en este workspace' }, 400)
    }

    const { prompt } = await req.json()
    const texto = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : '¿Quién eres? Responde en una sola oración, en español.'

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${conexion.api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: texto }] }] }),
      },
    )
    const geminiJson = await geminiRes.json()
    if (!geminiRes.ok) {
      console.error('Gemini call failed', geminiJson)
      return json({ error: geminiJson.error?.message ?? 'Gemini no respondió' }, 400)
    }

    const respuesta = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '(sin respuesta)'
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado llamando a Gemini' }, 500)
  }
})
