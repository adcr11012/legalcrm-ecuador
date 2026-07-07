import { supabase } from '@/lib/supabase'
import type { Grupo } from '@/types/database'

export type GrupoConMiembros = Grupo & { userIds: string[] }

export async function listGrupos(): Promise<GrupoConMiembros[]> {
  const { data: grupos, error } = await supabase.from('grupos').select('*').order('nombre')
  if (error) throw error
  const { data: miembros, error: errMiembros } = await supabase.from('grupo_usuarios').select('*')
  if (errMiembros) throw errMiembros
  return grupos.map((g) => ({
    ...g,
    userIds: miembros.filter((m) => m.grupo_id === g.id).map((m) => m.user_id),
  }))
}

export async function createGrupo(workspaceId: string, nombre: string): Promise<Grupo> {
  const { data, error } = await supabase.from('grupos').insert({ workspace_id: workspaceId, nombre }).select('*').single()
  if (error) throw error
  return data
}

export async function renameGrupo(id: string, nombre: string): Promise<Grupo> {
  const { data, error } = await supabase.from('grupos').update({ nombre }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteGrupo(id: string): Promise<void> {
  const { error } = await supabase.from('grupos').delete().eq('id', id)
  if (error) throw error
}

export async function addUsuarioAGrupo(grupoId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('grupo_usuarios').insert({ grupo_id: grupoId, user_id: userId })
  if (error) throw error
}

export async function removeUsuarioDeGrupo(grupoId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('grupo_usuarios').delete().eq('grupo_id', grupoId).eq('user_id', userId)
  if (error) throw error
}
