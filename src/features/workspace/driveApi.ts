import { supabase } from '@/lib/supabase'
import type { Documento } from '@/types/database'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/drive/oauth-callback`
const SCOPE =
  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.events'

export function isGoogleDriveConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export function buildGoogleConsentUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export type DriveEstado = { conectado: boolean; email: string | null }

export async function getDriveEstado(): Promise<DriveEstado> {
  const { data, error } = await supabase.rpc('drive_estado')
  if (error) throw error
  return data?.[0] ?? { conectado: false, email: null }
}

export async function desconectarDrive(): Promise<void> {
  const { error } = await supabase.rpc('drive_desconectar')
  if (error) throw error
}

export async function completarConexionDrive(code: string): Promise<{ ok: boolean; email: string }> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-oauth-callback`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo conectar Google Drive')
  return json
}

export async function uploadToDrive(casoId: string, file: File, visibilidad: string): Promise<Documento> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-upload`

  const form = new FormData()
  form.append('caso_id', casoId)
  form.append('visibilidad', visibilidad)
  form.append('file', file)

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo subir el archivo a Drive')
  return json.documento
}

export type ResumenReconciliacion = { relinked: number; creados: number; sinCambios: number; sinMatch: string[] }

// Escanea la carpeta raíz de Drive y vuelve a vincular/crear casos que no
// coinciden con lo guardado en la base de datos — para cuando el usuario
// copió manualmente sus carpetas a otra cuenta de Google y reconectó.
export async function reconciliarDrive(): Promise<ResumenReconciliacion> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-reconciliar`

  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo reconciliar Drive')
  return json
}

export async function renameDriveFile(documentoId: string, nuevoNombre: string): Promise<Documento> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-rename`

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_id: documentoId, nuevo_nombre: nuevoNombre }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo renombrar el documento')
  return json.documento
}
