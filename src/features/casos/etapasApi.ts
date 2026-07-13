import { supabase } from '@/lib/supabase'
import type { Etapa } from '@/types/database'

export const MIN_ETAPAS = 3

// workspaceId explícito: la política de RLS etapas_superadmin_select le da al
// superadmin visibilidad de TODAS las etapas de TODOS los workspaces (la usa
// legítimamente /admin/esatje) — sin este filtro, un superadmin usando su
// propio workspace ve etapas duplicadas de otros workspaces mezcladas.
export async function listEtapas(workspaceId: string): Promise<Etapa[]> {
  const { data, error } = await supabase
    .from('etapas')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('posicion', { ascending: true })
  if (error) throw error
  return data
}

export async function createEtapa(workspaceId: string, nombre: string, posicion: number): Promise<Etapa> {
  const { data, error } = await supabase
    .from('etapas')
    .insert({ workspace_id: workspaceId, nombre, posicion })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateEtapa(id: string, patch: Partial<Pick<Etapa, 'nombre' | 'color' | 'es_terminal' | 'posicion'>>): Promise<Etapa> {
  const { data, error } = await supabase.from('etapas').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function reordenarEtapas(etapas: { id: string; posicion: number }[]): Promise<void> {
  await Promise.all(etapas.map((e) => supabase.from('etapas').update({ posicion: e.posicion }).eq('id', e.id)))
}

export async function deleteEtapa(id: string): Promise<void> {
  const { error } = await supabase.from('etapas').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') throw new Error('Esta etapa tiene casos asignados. Muévelos a otra etapa antes de eliminarla.')
    throw error
  }
}
