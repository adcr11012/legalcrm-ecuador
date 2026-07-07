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

export type PersonaConEmail = {
  casoPersonaId: string
  nombre: string
  email: string | null
  rol: string
  userId: string | null
}

export async function listPersonasConEmail(casoId: string): Promise<PersonaConEmail[]> {
  const personas = await listPersonas(casoId)
  const userIds = personas.filter((p) => p.user_id).map((p) => p.user_id!) as string[]
  const clienteIds = personas.filter((p) => p.cliente_id).map((p) => p.cliente_id!) as string[]

  const [usersRes, clientesRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('users').select('id, nombre, email').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    clienteIds.length > 0 ? supabase.from('clientes').select('id, nombre, email').in('id', clienteIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (usersRes.error) throw usersRes.error
  if (clientesRes.error) throw clientesRes.error

  const usersById = new Map((usersRes.data ?? []).map((u) => [u.id, u]))
  const clientesById = new Map((clientesRes.data ?? []).map((c) => [c.id, c]))

  return personas.map((p) => {
    if (p.user_id) {
      const u = usersById.get(p.user_id)
      return { casoPersonaId: p.id, nombre: u?.nombre ?? 'Usuario', email: u?.email ?? null, rol: p.rol, userId: p.user_id }
    }
    if (p.cliente_id) {
      const c = clientesById.get(p.cliente_id)
      return { casoPersonaId: p.id, nombre: c?.nombre ?? p.nombre_externo ?? 'Cliente', email: c?.email ?? null, rol: p.rol, userId: null }
    }
    return { casoPersonaId: p.id, nombre: p.nombre_externo ?? 'Persona', email: p.email_externo, rol: p.rol, userId: null }
  })
}
