import { supabase } from '@/lib/supabase'
import type { Documento, Visibilidad } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// Genera un token de un solo uso (5 min) y devuelve la URL del proxy
export async function getDocumentoProxyUrl(documentoId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('documento_tokens')
    .insert({ documento_id: documentoId, user_id: user.id })
    .select('id')
    .single()
  if (error) throw error
  return `${SUPABASE_URL}/functions/v1/drive-archivo?token=${data.id}`
}

export async function listDocumentos(casoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function toggleVisibilidad(id: string, visibilidad: Visibilidad): Promise<Documento> {
  const { data, error } = await supabase.from('documentos').update({ visibilidad }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

async function callDriveEliminar(documentoIds: string[]): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/drive-eliminar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_ids: documentoIds }),
  })
  if (!res.ok) {
    const j = await res.json()
    throw new Error(j.error ?? 'No se pudo eliminar el documento')
  }
}

export async function deleteDocumento(id: string): Promise<void> {
  await callDriveEliminar([id])
}

export async function deleteDocumentosCaso(casoId: string): Promise<void> {
  const { data, error } = await supabase.from('documentos').select('id').eq('caso_id', casoId)
  if (error) throw error
  if (!data || data.length === 0) return
  await callDriveEliminar(data.map((d) => d.id))
}

export async function countDocumentos(): Promise<number> {
  const { count, error } = await supabase.from('documentos').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function leerDocumentoAhora(documentoId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leer-documento-ahora`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_id: documentoId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo leer el documento')
}
