import { supabase } from '@/lib/supabase'
import type { Invitacion } from '@/types/database'

export async function listInvitacionesPendientes(): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('usado', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createInvitacion(workspaceId: string, email: string, esAdmin: boolean): Promise<Invitacion> {
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({ workspace_id: workspaceId, email, es_admin: esAdmin })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteInvitacion(id: string): Promise<void> {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id)
  if (error) throw error
}

export type InvitacionInfo = {
  workspace_id: string
  workspace_nombre: string
  email: string
  es_admin: boolean
  usado: boolean
  expires_at: string
}

export async function obtenerInvitacion(token: string): Promise<InvitacionInfo | null> {
  const { data, error } = await supabase.rpc('obtener_invitacion', { p_token: token })
  if (error) throw error
  return data?.[0] ?? null
}

export async function aceptarInvitacion(token: string, nombre: string): Promise<string> {
  const { data, error } = await supabase.rpc('aceptar_invitacion', { p_token: token, p_nombre: nombre })
  if (error) throw error
  return data
}
