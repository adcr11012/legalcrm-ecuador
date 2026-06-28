import { supabase } from '@/lib/supabase'
import type { Workspace } from '@/types/database'

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<Workspace> {
  const { data, error } = await supabase.from('workspaces').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}
