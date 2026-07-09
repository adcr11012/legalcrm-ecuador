// Edge Function: drive-rename
// Renombra un documento: actualiza el nombre en Drive (las restricciones de
// solo-lectura de contenido no bloquean el renombrado, que es metadata) y en
// la base de datos.

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

    const { documento_id, nuevo_nombre } = await req.json()
    if (!documento_id || !nuevo_nombre || !String(nuevo_nombre).trim()) {
      return json({ error: 'Falta el documento o el nuevo nombre' }, 400)
    }

    const { data: documento } = await admin
      .from('documentos')
      .select('id, drive_file_id, caso_id, casos!inner(workspace_id)')
      .eq('id', documento_id)
      .single()
    const casoWorkspaceId = (documento as { casos: { workspace_id: string } } | null)?.casos?.workspace_id
    if (!documento || casoWorkspaceId !== perfil.workspace_id) {
      return json({ error: 'Documento no encontrado' }, 404)
    }

    if (documento.drive_file_id) {
      const { data: conexion } = await admin
        .from('drive_conexion')
        .select('refresh_token')
        .eq('workspace_id', perfil.workspace_id)
        .single()
      if (conexion?.refresh_token) {
        const accessToken = await getAccessToken(conexion.refresh_token)
        const fileUrl = `https://www.googleapis.com/drive/v3/files/${documento.drive_file_id}`

        // El archivo se sube marcado como solo-lectura (contentRestrictions)
        // para evitar ediciones accidentales desde Drive — pero eso también
        // bloquea el renombrado, así que hay que destrabarlo, renombrar, y
        // volver a marcarlo como solo-lectura.
        await fetch(fileUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentRestrictions: [{ readOnly: false }] }),
        }).catch(() => {})

        const renameRes = await fetch(fileUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nuevo_nombre }),
        })

        await fetch(fileUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentRestrictions: [{ readOnly: true, reason: 'Gestionado por TSADOQ' }] }),
        }).catch(() => {})

        if (!renameRes.ok) {
          const errJson = await renameRes.json()
          console.error('Drive rename failed', errJson)
          return json({ error: `No se pudo renombrar el archivo en Drive: ${errJson.error?.message ?? renameRes.status}` }, 400)
        }
      }
    }

    const { data: updated, error: updateError } = await admin
      .from('documentos')
      .update({ nombre: nuevo_nombre })
      .eq('id', documento_id)
      .select('*')
      .single()
    if (updateError) {
      console.error(updateError)
      return json({ error: 'No se pudo actualizar el nombre en la base de datos' }, 500)
    }

    return json({ ok: true, documento: updated })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado al renombrar' }, 500)
  }
})
