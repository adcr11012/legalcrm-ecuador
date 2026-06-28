// Edge Function: drive-upload
// Recibe un archivo (multipart/form-data), lo sube a la carpeta de Drive del
// caso (creándola si no existe dentro de la carpeta raíz del workspace), y
// registra el documento en la base de datos.

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
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
  const tokenJson = await res.json()
  if (!res.ok) throw new Error(tokenJson.error_description ?? 'No se pudo renovar el acceso a Google Drive')
  return tokenJson.access_token
}

async function ensureCaseFolder(accessToken: string, rootFolderId: string, casoId: string, casoTitulo: string): Promise<string> {
  const { data: caso } = await admin.from('casos').select('drive_folder_id').eq('id', casoId).single()
  if (caso?.drive_folder_id) return caso.drive_folder_id

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: casoTitulo,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    }),
  })
  const folderJson = await res.json()
  if (!res.ok) throw new Error('No se pudo crear la carpeta del caso en Drive')

  await admin.from('casos').update({ drive_folder_id: folderJson.id }).eq('id', casoId)
  return folderJson.id
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

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) {
      return json({ error: 'Perfil no encontrado' }, 404)
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const casoId = form.get('caso_id') as string | null
    const visibilidad = (form.get('visibilidad') as string | null) ?? 'privado'
    if (!file || !casoId) {
      return json({ error: 'Falta el archivo o el caso' }, 400)
    }

    const { data: caso } = await admin.from('casos').select('id, titulo, workspace_id, drive_folder_id').eq('id', casoId).single()
    if (!caso || caso.workspace_id !== perfil.workspace_id) {
      return json({ error: 'Caso no encontrado' }, 404)
    }

    const { data: conexion } = await admin
      .from('drive_conexion')
      .select('refresh_token, root_folder_id')
      .eq('workspace_id', perfil.workspace_id)
      .single()
    if (!conexion) {
      return json({ error: 'Google Drive no está conectado para este workspace' }, 400)
    }

    const accessToken = await getAccessToken(conexion.refresh_token)
    const folderId = await ensureCaseFolder(accessToken, conexion.root_folder_id, caso.id, caso.titulo)

    const metadata = { name: file.name, parents: [folderId] }
    const uploadForm = new FormData()
    uploadForm.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    uploadForm.append('file', file)

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: uploadForm },
    )
    const uploadJson = await uploadRes.json()
    if (!uploadRes.ok) {
      console.error('Drive upload failed', uploadJson)
      return json({ error: 'No se pudo subir el archivo a Drive' }, 400)
    }

    // Marca el archivo como solo-lectura para evitar ediciones accidentales
    // desde la interfaz de Drive. No bloquea borrado ni afecta nada de la app.
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadJson.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentRestrictions: [{ readOnly: true, reason: 'Gestionado por LegalCRM Ecuador' }],
      }),
    }).catch((err) => console.error('No se pudo marcar el archivo como solo lectura', err))

    const { data: documento, error: docError } = await admin
      .from('documentos')
      .insert({
        caso_id: caso.id,
        nombre: file.name,
        drive_file_id: uploadJson.id,
        drive_url: uploadJson.webViewLink,
        visibilidad,
        subido_por: userData.user.id,
      })
      .select('*')
      .single()
    if (docError) {
      console.error(docError)
      return json({ error: 'Archivo subido pero no se pudo registrar en la base de datos' }, 500)
    }

    return json({ ok: true, documento })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado subiendo el archivo' }, 500)
  }
})
