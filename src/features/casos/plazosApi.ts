import { supabase } from '@/lib/supabase'
import type { Plazo, TipoPlazo } from '@/types/database'

export async function listPlazos(casoId: string): Promise<Plazo[]> {
  const { data, error } = await supabase.from('plazos').select('*').eq('caso_id', casoId).order('fecha')
  if (error) throw error
  return data
}

export async function createPlazo(input: {
  caso_id: string
  workspace_id: string
  titulo: string
  descripcion?: string | null
  fecha: string
  tipo: TipoPlazo
  asignado_a?: string | null
}): Promise<Plazo> {
  const { data, error } = await supabase.from('plazos').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updatePlazo(id: string, patch: Partial<Pick<Plazo, 'estado' | 'nota' | 'titulo' | 'descripcion' | 'fecha' | 'asignado_a'>>): Promise<Plazo> {
  const { data, error } = await supabase.from('plazos').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deletePlazo(id: string): Promise<void> {
  const { error } = await supabase.from('plazos').delete().eq('id', id)
  if (error) throw error
}

export async function listAllPlazos(): Promise<Plazo[]> {
  const { data, error } = await supabase.from('plazos').select('*').order('fecha')
  if (error) throw error
  return data
}

export async function countAudienciasProximas(dias = 7): Promise<number> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + dias)
  const { count, error } = await supabase
    .from('plazos')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'audiencia')
    .gte('fecha', hoy.toISOString().slice(0, 10))
    .lte('fecha', limite.toISOString().slice(0, 10))
  if (error) throw error
  return count ?? 0
}
