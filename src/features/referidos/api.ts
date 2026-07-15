import { supabase } from '@/lib/supabase'
import type { CodigoReferido } from '@/types/database'

export async function canjearCodigoReferido(codigo: string): Promise<{ plan: string; semillas_heredadas: number; codigos_generados: string[] }> {
  const { data, error } = await supabase.rpc('canjear_codigo_referido', { p_codigo: codigo })
  if (error) throw error
  return data
}

export async function listMisCodigosReferido(workspaceId: string): Promise<CodigoReferido[]> {
  // Filtro explícito por workspace: no basta con confiar en RLS, porque un
  // usuario que además es superadmin tiene una política de RLS más amplia
  // (ve todos los códigos del sistema para el panel de auditoría) y sin
  // este filtro también verían acá los códigos raíz sin workspace.
  const { data, error } = await supabase
    .from('codigos_referido')
    .select('*')
    .eq('creado_por_workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
