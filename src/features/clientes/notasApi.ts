import { supabase } from '@/lib/supabase'
import type { ClienteNota } from '@/types/database'

export async function addHistorial(clienteId: string, userId: string, accion: string, detalle?: string) {
  await supabase.from('cliente_historial').insert({ cliente_id: clienteId, user_id: userId, accion, detalle: detalle ?? null })
}

export async function listNotas(clienteId: string): Promise<ClienteNota[]> {
  const { data, error } = await supabase
    .from('cliente_notas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addNota(clienteId: string, userId: string, contenido: string): Promise<ClienteNota> {
  const { data, error } = await supabase
    .from('cliente_notas')
    .insert({ cliente_id: clienteId, user_id: userId, contenido })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateNota(id: string, contenido: string): Promise<ClienteNota> {
  const { data, error } = await supabase
    .from('cliente_notas')
    .update({ contenido })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteNota(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_notas').delete().eq('id', id)
  if (error) throw error
}
