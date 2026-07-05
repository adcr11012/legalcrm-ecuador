// Edge Function: drive-compartir
// Hace que un archivo de Drive sea accesible para cualquiera con el enlace (viewer)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })
}

async function getAccessToken(refreshToken: string): Promise<string> {
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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? 'No se pudo renovar el token de Drive')
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { documento_id } = await req.json()
    if (!documento_id) return json({ error: 'Falta documento_id' }, 400)

    // Verificar que el documento pertenece al workspace del usuario
    const { data: doc } = await userClient
      .from('documentos')
      .select('id, drive_file_id, drive_url, caso_id, nombre')
      .eq('id', documento_id)
      .maybeSingle()
    if (!doc?.drive_file_id) return json({ error: 'Documento no encontrado o sin archivo en Drive' }, 404)

    const { data: caso } = await admin.from('casos').select('workspace_id').eq('id', doc.caso_id).single()
    if (!caso) return json({ error: 'Caso no encontrado' }, 404)

    const { data: driveConexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', caso.workspace_id)
      .maybeSingle()
    if (!driveConexion) return json({ error: 'Google Drive no está conectado' }, 400)

    const accessToken = await getAccessToken(driveConexion.refresh_token)

    // Verificar si ya tiene permiso público
    const permRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}/permissions?fields=permissions(id,type,role)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const permData = await permRes.json()
    const yaCompartido = permData.permissions?.some(
      (p: { type: string; role: string }) => p.type === 'anyone' && p.role === 'reader'
    )

    if (!yaCompartido) {
      // Crear permiso "anyone with link can view"
      const createRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}/permissions`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        }
      )
      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error?.message ?? 'No se pudo compartir el archivo')
      }
    }

    // Obtener el webViewLink actualizado
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?fields=webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const fileData = await fileRes.json()
    const shareUrl = fileData.webViewLink ?? doc.drive_url

    return json({ ok: true, url: shareUrl, nombre: doc.nombre })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error al compartir' }, 500)
  }
})
