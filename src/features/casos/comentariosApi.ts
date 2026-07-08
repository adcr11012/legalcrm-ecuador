import { supabase } from '@/lib/supabase'
import type { CasoComentario } from '@/types/database'

export async function listComentarios(casoId: string): Promise<CasoComentario[]> {
  const { data, error } = await supabase
    .from('caso_comentarios')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function crearComentario(casoId: string, userId: string, contenido: string): Promise<CasoComentario> {
  const { data, error } = await supabase
    .from('caso_comentarios')
    .insert({ caso_id: casoId, user_id: userId, contenido })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function eliminarComentario(id: string): Promise<void> {
  const { error } = await supabase.from('caso_comentarios').delete().eq('id', id)
  if (error) throw error
}
