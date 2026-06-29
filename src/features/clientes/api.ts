import { supabase } from '@/lib/supabase'
import type { Cliente } from '@/types/database'

export type NuevoCliente = {
  workspace_id: string
  nombre: string
  tipo: Cliente['tipo']
  email?: string | null
  telefono?: string | null
  etiquetas?: string[]
  origen?: string | null
  proximo_seguimiento?: string | null
}

export async function listClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createCliente(input: NuevoCliente): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...input, etiquetas: input.etiquetas ?? [] })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCliente(id: string, patch: Partial<Cliente>): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

export async function countClientesActivos(): Promise<number> {
  const { count, error } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'activo')
  if (error) throw error
  return count ?? 0
}
