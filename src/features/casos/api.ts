import { supabase } from '@/lib/supabase'
import type { Caso, EstadoCaso } from '@/types/database'

export type NuevoCaso = {
  workspace_id: string
  created_by: string
  titulo: string
  materia: Caso['materia']
  numero_causa?: string | null
  juzgado?: string | null
  fecha_inicio?: string | null
}

export async function listCasos(): Promise<Caso[]> {
  const { data, error } = await supabase.from('casos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getCaso(id: string): Promise<Caso | null> {
  const { data, error } = await supabase.from('casos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function listCasosByIds(ids: string[]): Promise<Caso[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('casos').select('*').in('id', ids)
  if (error) throw error
  return data
}

export async function createCaso(input: NuevoCaso): Promise<Caso> {
  const { data, error } = await supabase.from('casos').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateCaso(id: string, patch: Partial<Caso>): Promise<Caso> {
  const { data, error } = await supabase.from('casos').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function updateEstadoCaso(id: string, estado: EstadoCaso): Promise<Caso> {
  return updateCaso(id, { estado })
}

export async function deleteCaso(id: string): Promise<void> {
  const { error } = await supabase.from('casos').delete().eq('id', id)
  if (error) throw error
}
