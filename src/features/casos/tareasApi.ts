import { supabase } from '@/lib/supabase'
import type { EstadoTarea, Tarea } from '@/types/database'

export async function listTareas(casoId: string): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('tareas')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createTarea(input: {
  caso_id: string
  workspace_id: string
  titulo: string
  descripcion?: string | null
  asignado_a?: string | null
  fecha_limite?: string | null
}): Promise<Tarea> {
  const { data, error } = await supabase.from('tareas').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateEstadoTarea(id: string, estado: EstadoTarea): Promise<Tarea> {
  const { data, error } = await supabase.from('tareas').update({ estado }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteTarea(id: string): Promise<void> {
  const { error } = await supabase.from('tareas').delete().eq('id', id)
  if (error) throw error
}

export async function listAllTareasPendientes(): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('tareas')
    .select('*')
    .neq('estado', 'completada')
    .not('fecha_limite', 'is', null)
    .order('fecha_limite')
  if (error) throw error
  return data
}
