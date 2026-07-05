import { supabase } from '@/lib/supabase'
import type { Carpeta } from '@/types/database'

export async function listCarpetas(casoId: string): Promise<Carpeta[]> {
  const { data, error } = await supabase
    .from('carpetas')
    .select('*')
    .eq('caso_id', casoId)
    .order('orden')
    .order('created_at')
  if (error) throw error
  return data
}

export async function swapOrdenCarpetas(a: Carpeta, b: Carpeta): Promise<void> {
  await Promise.all([
    supabase.from('carpetas').update({ orden: b.orden }).eq('id', a.id),
    supabase.from('carpetas').update({ orden: a.orden }).eq('id', b.id),
  ])
}

export async function createCarpeta(casoId: string, workspaceId: string, nombre: string, parentId?: string): Promise<Carpeta> {
  const { data, error } = await supabase
    .from('carpetas')
    .insert({ caso_id: casoId, workspace_id: workspaceId, nombre: nombre.trim(), parent_id: parentId ?? null })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCarpeta(id: string): Promise<void> {
  const { error } = await supabase.from('carpetas').delete().eq('id', id)
  if (error) throw error
}

export async function renameCarpeta(id: string, nombre: string): Promise<void> {
  const { error } = await supabase.from('carpetas').update({ nombre: nombre.trim() }).eq('id', id)
  if (error) throw error
}

export async function moverDocumento(documentoId: string, carpetaId: string | null): Promise<void> {
  const { error } = await supabase.from('documentos').update({ carpeta_id: carpetaId }).eq('id', documentoId)
  if (error) throw error
}
