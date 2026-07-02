// Edge Function: drive-eliminar
// Elimina un documento de Google Drive y de la base de datos.
// Si Drive no está conectado o el archivo ya no existe, igual elimina el registro en BD.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { data: perfil } = await admin.from('users').select('workspace_id, rol').eq('id', userData.user.id).single()
    if (!perfil || perfil.rol !== 'administrador') return json({ error: 'Solo administradores pueden eliminar documentos' }, 403)

    const { documento_ids } = await req.json() as { documento_ids: string[] }
    if (!Array.isArray(documento_ids) || documento_ids.length === 0) return json({ error: 'Falta documento_ids' }, 400)

    // Obtener documentos verificando que pertenezcan al workspace
    const { data: docs } = await admin
      .from('documentos')
      .select('id, drive_file_id, caso_id, casos!inner(workspace_id)')
      .in('id', documento_ids)

    const docsDelWorkspace = (docs ?? []).filter(
      (d) => (d as { casos: { workspace_id: string } }).casos.workspace_id === perfil.workspace_id
    )

    // Obtener token de Drive del workspace
    const { data: conexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', perfil.workspace_id)
      .maybeSingle()

    const accessToken = conexion ? await getAccessToken(conexion.refresh_token) : null

    // Eliminar archivos de Drive (best-effort: si falla, continúa)
    const driveIds = docsDelWorkspace.map((d) => d.drive_file_id).filter(Boolean)
    if (accessToken && driveIds.length > 0) {
      await Promise.all(
        driveIds.map((fileId) =>
          fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => null)
        )
      )
    }

    // Eliminar registros en BD
    const idsAEliminar = docsDelWorkspace.map((d) => d.id)
    if (idsAEliminar.length > 0) {
      await admin.from('documentos').delete().in('id', idsAEliminar)
    }

    return json({ ok: true, eliminados: idsAEliminar.length, sin_drive: !accessToken })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado' }, 500)
  }
})
