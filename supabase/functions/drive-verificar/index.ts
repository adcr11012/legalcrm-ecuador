// Edge Function: drive-verificar
// Prueba si el refresh_token guardado todavía es aceptado por Google —
// a diferencia de drive_estado() (RPC), que solo mira si existe una fila
// en drive_conexion, esto valida la conexión real. Pensado para llamarse
// solo desde Configuración (no en cada carga del sidebar) para no golpear
// la API de Google en cada navegación.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 404)

    const { data: driveConexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()

    if (!driveConexion?.refresh_token) return json({ valido: false, motivo: 'sin_conexion' })
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return json({ valido: false, motivo: 'config_faltante' })

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: driveConexion.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    if (res.ok) return json({ valido: true })

    const j = await res.json().catch(() => ({}))
    console.error('drive-verificar: token rechazado por Google', j)
    return json({ valido: false, motivo: j.error ?? 'rechazado' })
  } catch (err) {
    console.error('drive-verificar: excepción', err)
    return json({ error: 'No se pudo verificar la conexión' }, 500)
  }
})
