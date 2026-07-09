// Edge Function: drive-reconciliar
// Escanea las carpetas directas dentro de la carpeta raíz del workspace en
// Drive y las vuelve a vincular con sus casos. Pensado para el caso en que
// el usuario copió manualmente sus carpetas de casos a otra cuenta de
// Google Drive y luego reconectó esa cuenta nueva: los IDs de Drive
// cambiaron, así que ya no coinciden con casos.drive_folder_id guardado.
//
// Para cada carpeta encontrada:
//   1. Si tiene un archivo "caso.txt" con un caso_id que existe en este
//      workspace, se vincula esa carpeta al caso (actualiza drive_folder_id).
//   2. Si el caso.txt trae un caso_id que NO existe en este workspace
//      (ej. viene de un respaldo o de otro workspace), se CREA un caso
//      nuevo con los datos del txt y se vincula.
//   3. Si no hay caso.txt (carpetas creadas antes de esta función), se
//      intenta emparejar por nombre exacto con el título de algún caso sin
//      carpeta vinculada todavía.
//   4. Si nada de lo anterior aplica, se reporta como "sin coincidencia"
//      para que el admin decida manualmente.

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

function parseCasoTxt(texto: string): Record<string, string> {
  const datos: Record<string, string> = {}
  for (const linea of texto.split('\n')) {
    const idx = linea.indexOf(':')
    if (idx === -1) continue
    const clave = linea.slice(0, idx).trim()
    const valor = linea.slice(idx + 1).trim()
    if (clave && valor) datos[clave] = valor
  }
  return datos
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
    if (perfil.rol !== 'administrador') return json({ error: 'Solo un administrador puede reconciliar Drive' }, 403)

    const { data: conexion } = await admin
      .from('drive_conexion')
      .select('refresh_token, root_folder_id')
      .eq('workspace_id', perfil.workspace_id)
      .single()
    if (!conexion?.refresh_token) return json({ error: 'Google Drive no está conectado para este workspace' }, 400)

    const accessToken = await getAccessToken(conexion.refresh_token)

    const carpetasRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `'${conexion.root_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      )}&fields=files(id,name)&pageSize=1000`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const carpetasJson = await carpetasRes.json()
    if (!carpetasRes.ok) return json({ error: 'No se pudo listar la carpeta raíz de Drive' }, 400)
    const carpetas: { id: string; name: string }[] = carpetasJson.files ?? []

    const { data: casos } = await admin
      .from('casos')
      .select('id, titulo, materia, numero_causa, drive_folder_id')
      .eq('workspace_id', perfil.workspace_id)
    const casosPorId = new Map((casos ?? []).map((c) => [c.id, c]))
    const casosSinCarpetaPorTitulo = new Map(
      (casos ?? []).filter((c) => !c.drive_folder_id).map((c) => [c.titulo.trim().toLowerCase(), c]),
    )

    let relinked = 0
    let creados = 0
    let sinCambios = 0
    const sinMatch: string[] = []

    for (const carpeta of carpetas) {
      const buscarTxtRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${carpeta.id}' in parents and name = 'caso.txt' and trashed = false`,
        )}&fields=files(id)`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const buscarTxtJson = await buscarTxtRes.json()
      const txtFileId: string | undefined = buscarTxtRes.ok ? buscarTxtJson.files?.[0]?.id : undefined

      if (txtFileId) {
        const contenidoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${txtFileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const contenido = await contenidoRes.text()
        const datos = parseCasoTxt(contenido)

        if (datos.caso_id && casosPorId.has(datos.caso_id)) {
          const caso = casosPorId.get(datos.caso_id)!
          if (caso.drive_folder_id !== carpeta.id) {
            await admin.from('casos').update({ drive_folder_id: carpeta.id }).eq('id', caso.id)
            relinked++
          } else {
            sinCambios++
          }
          continue
        }

        if (datos.caso_id && datos.titulo) {
          // caso.txt trae un caso_id que no existe en este workspace (ej.
          // viene de un respaldo o de otro workspace) — se crea de nuevo.
          const materiaValida = ['civil', 'laboral', 'familia', 'penal', 'mercantil', 'otro']
          const { data: nuevoCaso, error: errCrear } = await admin
            .from('casos')
            .insert({
              workspace_id: perfil.workspace_id,
              titulo: datos.titulo,
              materia: materiaValida.includes(datos.materia) ? datos.materia : null,
              numero_causa: datos.numero_causa || null,
              drive_folder_id: carpeta.id,
              created_by: userData.user.id,
            })
            .select('id')
            .single()
          if (!errCrear && nuevoCaso) creados++
          continue
        }
      }

      // Sin caso.txt (carpeta creada antes de esta función): empareja por
      // nombre exacto con algún caso de este workspace que no tenga carpeta.
      const match = casosSinCarpetaPorTitulo.get(carpeta.name.trim().toLowerCase())
      if (match) {
        await admin.from('casos').update({ drive_folder_id: carpeta.id }).eq('id', match.id)
        casosSinCarpetaPorTitulo.delete(carpeta.name.trim().toLowerCase())
        relinked++
      } else {
        sinMatch.push(carpeta.name)
      }
    }

    return json({ relinked, creados, sinCambios, sinMatch })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado reconciliando Drive' }, 500)
  }
})
