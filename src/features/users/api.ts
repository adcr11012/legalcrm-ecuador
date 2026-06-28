import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/types/database'

export async function listWorkspaceUsers(): Promise<Usuario[]> {
  const { data, error } = await supabase.from('users').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function setEsAdmin(userId: string, esAdmin: boolean): Promise<Usuario> {
  const { data, error } = await supabase.from('users').update({ es_admin: esAdmin }).eq('id', userId).select('*').single()
  if (error) throw error
  return data
}

export async function removeUsuario(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw error
}
