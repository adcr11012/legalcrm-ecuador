import { supabase } from '@/lib/supabase'
import type { Documento, Visibilidad } from '@/types/database'

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

export async function deleteDocumento(id: string): Promise<void> {
  const { error } = await supabase.from('documentos').delete().eq('id', id)
  if (error) throw error
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
