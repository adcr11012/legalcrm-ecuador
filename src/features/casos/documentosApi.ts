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
