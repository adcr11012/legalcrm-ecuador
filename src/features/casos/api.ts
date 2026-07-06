import { supabase } from '@/lib/supabase'
import type { Caso } from '@/types/database'

export type NuevoCaso = {
  workspace_id: string
  created_by: string
  titulo: string
  materia: Caso['materia']
  tipo_accion: string
  cliente_id: string
  es_contencioso: boolean
  rol_cliente: string | null
  numero_causa?: string | null
  juzgado?: string | null
  fecha_inicio?: string | null
  etiquetas?: string[]
}

export async function listCasos(): Promise<Caso[]> {
  const { data, error } = await supabase.from('casos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listCasosPage(offset: number, limit: number): Promise<{ casos: Caso[]; total: number }> {
  const { data, error, count } = await supabase
    .from('casos')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return { casos: data, total: count ?? 0 }
}

export async function searchCasos(query: string): Promise<Caso[]> {
  const q = query.replace(/[,()%]/g, ' ').trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .or(`titulo.ilike.%${q}%,numero_causa.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(100)
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

export async function updateEtapaCaso(id: string, etapaId: string): Promise<Caso> {
  return updateCaso(id, { etapa_id: etapaId })
}

export async function deleteCaso(id: string): Promise<void> {
  const { error } = await supabase.from('casos').delete().eq('id', id)
  if (error) throw error
}
