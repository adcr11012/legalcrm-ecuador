// Edge Function: drive-preparar-reconexion
// Usa la conexión de Drive YA ACTIVA de este workspace para etiquetar la
// carpeta raíz y las carpetas de cada caso (appProperties), y sube el
// caso.txt en las carpetas de caso que todavía no lo tengan. Pensado para
// correrse UNA VEZ antes de desconectar una cuenta que ya tiene documentos
// importantes, así al reconectar el sistema la reconoce automáticamente
// en vez de crear una carpeta nueva.

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

async function etiquetarCarpeta(accessToken: string, folderId: string, appProperties: Record<string, string>) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ appProperties }),
  })
}

async function existeCasoTxt(accessToken: string, folderId: string): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and name = 'caso.txt' and trashed = false`)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const j = await res.json()
  return res.ok && (j.files ?? []).length > 0
}

async function subirCasoTxt(accessToken: string, folderId: string, caso: { id: string; titulo: string; materia: string | null; numero_causa: string | null }) {
  const lineas = [
    `caso_id: ${caso.id}`,
    `titulo: ${caso.titulo}`,
    `materia: ${caso.materia ?? ''}`,
    `numero_causa: ${caso.numero_causa ?? ''}`,
    `creado: ${new Date().toISOString()}`,
  ]
  const metadata = { name: 'caso.txt', parents: [folderId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([lineas.join('\n')], { type: 'text/plain' }))
  await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { data: perfil } = await admin.from('users').select('workspace_id, rol').eq('id', userData.user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 404)
    if (perfil.rol !== 'administrador') return json({ error: 'Solo un administrador puede hacer esto' }, 403)

    const { data: conexion } = await admin
      .from('drive_conexion')
      .select('refresh_token, root_folder_id')
      .eq('workspace_id', perfil.workspace_id)
      .single()
    if (!conexion) return json({ error: 'Google Drive no está conectado para este workspace' }, 400)

    const accessToken = await getAccessToken(conexion.refresh_token)

    await etiquetarCarpeta(accessToken, conexion.root_folder_id, { tsadoq_workspace_id: perfil.workspace_id })

    const { data: casos } = await admin
      .from('casos')
      .select('id, titulo, materia, numero_causa, drive_folder_id')
      .eq('workspace_id', perfil.workspace_id)
      .not('drive_folder_id', 'is', null)

    let carpetasEtiquetadas = 0
    let txtCreados = 0
    for (const caso of casos ?? []) {
      await etiquetarCarpeta(accessToken, caso.drive_folder_id!, { tsadoq_caso_id: caso.id })
      carpetasEtiquetadas++
      const yaTiene = await existeCasoTxt(accessToken, caso.drive_folder_id!)
      if (!yaTiene) {
        await subirCasoTxt(accessToken, caso.drive_folder_id!, caso)
        txtCreados++
      }
    }

    return json({ ok: true, carpetasEtiquetadas, txtCreados })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado' }, 500)
  }
})
