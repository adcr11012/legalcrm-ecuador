// Edge Function: drive-archivo
// Proxy para archivos de Google Drive. El usuario se autentica con Supabase (no con Google).
// El backend usa el token OAuth del workspace para descargar el archivo y lo devuelve al cliente.
// Uso: GET /drive-archivo?id=DOCUMENTO_ID

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
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
    // Autenticar usuario con Supabase JWT (header o query param para nueva pestaña)
    const url = new URL(req.url)
    const tokenFromQuery = url.searchParams.get('token')
    const authHeader = tokenFromQuery ? `Bearer ${tokenFromQuery}` : (req.headers.get('Authorization') ?? '')
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return new Response('No autenticado', { status: 401, headers: corsHeaders })
    }

    const documentoId = url.searchParams.get('id')
    if (!documentoId) return new Response('Falta ?id=', { status: 400, headers: corsHeaders })

    // Verificar acceso al documento vía RLS
    const { data: doc, error: docError } = await userClient
      .from('documentos')
      .select('id, caso_id, drive_file_id, mime_type, nombre')
      .eq('id', documentoId)
      .maybeSingle()
    if (docError || !doc) return new Response('Documento no encontrado o sin acceso', { status: 404, headers: corsHeaders })
    if (!doc.drive_file_id) return new Response('Sin archivo en Drive', { status: 404, headers: corsHeaders })

    // Obtener workspace del caso
    const { data: caso } = await admin.from('casos').select('workspace_id').eq('id', doc.caso_id).single()
    if (!caso) return new Response('Caso no encontrado', { status: 404, headers: corsHeaders })

    // Obtener token de Drive del workspace
    const { data: driveConexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', caso.workspace_id)
      .maybeSingle()
    const accessToken = driveConexion ? await getAccessToken(driveConexion.refresh_token) : null
    if (!accessToken) return new Response('Drive no conectado', { status: 503, headers: corsHeaders })

    // Descargar archivo de Drive
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!fileRes.ok) return new Response(`Error Drive: ${fileRes.status}`, { status: 502, headers: corsHeaders })

    const contentType = doc.mime_type ?? fileRes.headers.get('content-type') ?? 'application/octet-stream'
    const fileName = encodeURIComponent(doc.nombre ?? 'archivo')

    return new Response(fileRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Error inesperado', { status: 500, headers: corsHeaders })
  }
})
