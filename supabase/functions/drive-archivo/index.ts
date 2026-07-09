// Edge Function: drive-archivo
// Proxy para archivos de Google Drive usando token de un solo uso (5 min).
// Uso: GET /drive-archivo?token=UUID

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null
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
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return new Response('Falta ?token=', { status: 400, headers: corsHeaders })

    // Validar token de un solo uso (service role para saltear RLS)
    const { data: tk, error: tkError } = await admin
      .from('documento_tokens')
      .select('id, documento_id, user_id, expires_at')
      .eq('id', token)
      .maybeSingle()

    if (tkError || !tk) return new Response('Token inválido', { status: 401, headers: corsHeaders })
    if (new Date(tk.expires_at) < new Date()) {
      await admin.from('documento_tokens').delete().eq('id', token)
      return new Response('Token expirado', { status: 401, headers: corsHeaders })
    }

    // Consumir token (un solo uso)
    await admin.from('documento_tokens').delete().eq('id', token)

    // Obtener documento
    const { data: doc } = await admin
      .from('documentos')
      .select('id, caso_id, drive_file_id, mime_type, nombre')
      .eq('id', tk.documento_id)
      .maybeSingle()
    if (!doc) return new Response('Documento no encontrado', { status: 404, headers: corsHeaders })
    if (!doc.drive_file_id) return new Response('Sin archivo en Drive', { status: 404, headers: corsHeaders })

    // Obtener workspace
    const { data: caso } = await admin.from('casos').select('workspace_id').eq('id', doc.caso_id).single()
    if (!caso) return new Response('Caso no encontrado', { status: 404, headers: corsHeaders })

    // Verificar que el usuario pertenece al workspace
    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('id', tk.user_id)
      .eq('workspace_id', caso.workspace_id)
      .maybeSingle()
    if (!userRow) return new Response('Sin acceso', { status: 403, headers: corsHeaders })

    // Obtener token de Drive
    const { data: driveConexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', caso.workspace_id)
      .maybeSingle()
    const accessToken = driveConexion ? await getAccessToken(driveConexion.refresh_token) : null
    if (!accessToken) return new Response('Drive no conectado', { status: 503, headers: corsHeaders })

    // Descargar y servir archivo
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!fileRes.ok) {
      const errText = await fileRes.text()
      console.error('Drive fetch failed', errText)
      return new Response(`Error Drive (${fileRes.status}): ${errText}`, { status: 502, headers: corsHeaders })
    }

    const contentType = doc.mime_type ?? fileRes.headers.get('content-type') ?? 'application/octet-stream'
    const fileName = encodeURIComponent(doc.nombre ?? 'archivo')

    return new Response(fileRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Error inesperado', { status: 500, headers: corsHeaders })
  }
})
