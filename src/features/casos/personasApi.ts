import { supabase } from '@/lib/supabase'
import type { CasoPersona, RolPersona } from '@/types/database'

export async function listPersonas(casoId: string): Promise<CasoPersona[]> {
  const { data, error } = await supabase.from('caso_personas').select('*').eq('caso_id', casoId).order('created_at')
  if (error) throw error
  return data
}

export async function listPersonasForCasos(casoIds: string[]): Promise<CasoPersona[]> {
  if (casoIds.length === 0) return []
  const { data, error } = await supabase.from('caso_personas').select('*').in('caso_id', casoIds)
  if (error) throw error
  return data
}

export async function addPersonaInterna(casoId: string, userId: string, rol: RolPersona): Promise<CasoPersona> {
  const { data, error } = await supabase
    .from('caso_personas')
    .insert({ caso_id: casoId, user_id: userId, rol })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function addPersonaExterna(
  casoId: string,
  nombreExterno: string,
  emailExterno: string | null,
  rol: RolPersona,
): Promise<CasoPersona> {
  const { data, error } = await supabase
    .from('caso_personas')
    .insert({ caso_id: casoId, nombre_externo: nombreExterno, email_externo: emailExterno, rol })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function addPersonaCliente(casoId: string, clienteId: string, nombreCliente: string): Promise<CasoPersona> {
  const { data, error } = await supabase
    .from('caso_personas')
    .insert({ caso_id: casoId, cliente_id: clienteId, nombre_externo: nombreCliente, rol: 'cliente' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listCasosPorCliente(clienteId: string): Promise<CasoPersona[]> {
  const { data, error } = await supabase.from('caso_personas').select('*').eq('cliente_id', clienteId)
  if (error) throw error
  return data
}

export async function removePersona(id: string): Promise<void> {
  const { error } = await supabase.from('caso_personas').delete().eq('id', id)
  if (error) throw error
}

export async function listPersonasPorUsuarios(userIds: string[]): Promise<CasoPersona[]> {
  if (userIds.length === 0) return []
  const { data, error } = await supabase.from('caso_personas').select('*').in('user_id', userIds)
  if (error) throw error
  return data
}
