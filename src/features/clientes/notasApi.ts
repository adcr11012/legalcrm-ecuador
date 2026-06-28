import { supabase } from '@/lib/supabase'
import type { ClienteNota } from '@/types/database'

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
