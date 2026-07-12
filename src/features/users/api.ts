import { supabase } from '@/lib/supabase'
import type { RolUsuario, Usuario } from '@/types/database'

export async function listWorkspaceUsers(): Promise<Usuario[]> {
  const { data, error } = await supabase.from('users').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function setRolUsuario(userId: string, rol: RolUsuario): Promise<Usuario> {
  const { data, error } = await supabase.from('users').update({ rol }).eq('id', userId).select('*').single()
  if (error) throw error
  return data
}

export async function removeUsuario(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw error
}

export async function updateLastSeen(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)
}

export async function marcarOnboardingCompletado(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').update({ onboarding_completado: true }).eq('id', user.id)
}
