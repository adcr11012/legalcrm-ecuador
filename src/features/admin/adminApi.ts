import { supabase } from '@/lib/supabase'

export type WorkspaceStat = {
  id: string
  nombre: string
  plan: string
  suspended: boolean
  created_at: string
  usuarios: number
  casos: number
  documentos: number
  owner_email: string | null
}

export type GlobalStats = {
  workspaces: number
  usuarios: number
  casos: number
  documentos: number
}

export type WorkspaceDetail = {
  workspace: {
    id: string; nombre: string; plan: string; suspended: boolean
    created_at: string; notif_email: boolean; dias_anticipacion: number
  }
  usuarios: { nombre: string; email: string; rol: string; created_at: string }[]
  stats: { casos: number; documentos: number; clientes: number; tareas: number }
}

export async function isSuperadmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_superadmin')
  if (error) return false
  return data === true
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const { data, error } = await supabase.rpc('admin_global_stats')
  if (error) throw error
  return data as GlobalStats
}

export async function getAdminWorkspaces(): Promise<WorkspaceStat[]> {
  const { data, error } = await supabase.rpc('admin_workspaces')
  if (error) throw error
  return (data ?? []) as WorkspaceStat[]
}

export async function getWorkspaceDetail(workspaceId: string): Promise<WorkspaceDetail> {
  const { data, error } = await supabase.rpc('admin_workspace_detail', { p_workspace_id: workspaceId })
  if (error) throw error
  return data as WorkspaceDetail
}

export async function setWorkspacePlan(workspaceId: string, plan: string): Promise<void> {
  const { error } = await supabase.from('workspaces').update({ plan }).eq('id', workspaceId)
  if (error) throw error
}

export async function toggleWorkspaceSuspended(workspaceId: string, suspended: boolean): Promise<void> {
  const { error } = await supabase.from('workspaces').update({ suspended }).eq('id', workspaceId)
  if (error) throw error
}
