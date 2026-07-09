// Edge Function: drive-oauth-callback
// Recibe el "code" de la pantalla de consentimiento de Google, lo intercambia
// por un refresh_token, crea la carpeta raíz en Drive, y guarda la conexión
// a nivel de workspace. Solo un admin puede conectar.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')!

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
      .select('workspace_id, rol, nombre')
      .eq('id', userData.user.id)
      .single()
    if (perfilError || !perfil) {
      return json({ error: 'Perfil no encontrado' }, 404)
    }
    if (perfil.rol !== 'administrador') {
      return json({ error: 'Solo un administrador puede conectar Google Drive' }, 403)
    }

    const { code, redirect_uri } = await req.json()
    if (!code) {
      return json({ error: 'Falta el código de autorización' }, 400)
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirect_uri || GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.refresh_token) {
      console.error('Token exchange failed', tokenJson)
      return json({ error: tokenJson.error_description ?? 'No se pudo obtener el refresh token de Google' }, 400)
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const userInfo = await userInfoRes.json()
    const connectedEmail = userInfo.email ?? 'desconocido'

    const { data: workspace } = await admin.from('workspaces').select('nombre').eq('id', perfil.workspace_id).single()

    // Antes de crear una carpeta nueva, busca si esta MISMA cuenta de Google
    // ya tiene una carpeta raíz de este workspace (etiquetada por nosotros la
    // vez anterior). Así, si el admin se desconecta y reconecta con la misma
    // cuenta, recupera los casos/documentos existentes en vez de duplicar.
    const q = encodeURIComponent(
      `appProperties has { key='tsadoq_workspace_id' and value='${perfil.workspace_id}' } and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
    )
    const buscarRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const buscarJson = await buscarRes.json()
    let rootFolderId: string | undefined = buscarRes.ok ? buscarJson.files?.[0]?.id : undefined
    let reconectado = Boolean(rootFolderId)

    if (!rootFolderId) {
      const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `TSADOQ - ${workspace?.nombre ?? 'Workspace'}`,
          mimeType: 'application/vnd.google-apps.folder',
          appProperties: { tsadoq_workspace_id: perfil.workspace_id },
        }),
      })
      const folderJson = await folderRes.json()
      if (!folderRes.ok) {
        console.error('Folder creation failed', folderJson)
        return json({ error: 'No se pudo crear la carpeta raíz en Drive' }, 400)
      }
      rootFolderId = folderJson.id
    }

    const { error: upsertError } = await admin.from('drive_conexion').upsert({
      workspace_id: perfil.workspace_id,
      refresh_token: tokenJson.refresh_token,
      connected_email: connectedEmail,
      root_folder_id: rootFolderId,
      connected_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    if (upsertError) {
      console.error(upsertError)
      return json({ error: 'No se pudo guardar la conexión' }, 500)
    }

    return json({ ok: true, email: connectedEmail, reconectado })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado conectando Google Drive' }, 500)
  }
})
