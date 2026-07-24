import { supabase } from '@/lib/supabase'
import type { CodigoReferido } from '@/types/database'

export async function canjearCodigoReferido(codigo: string): Promise<{ plan: string; semillas_heredadas: number; codigos_generados: string[] }> {
  const { data, error } = await supabase.rpc('canjear_codigo_referido', { p_codigo: codigo })
  if (error) throw error
  return data
}

export type NodoReferido = {
  id: string
  codigo: string
  semillas: number
  usado: boolean
  expira_at: string | null
  created_at: string
  usado_at: string | null
  nivel: number
  generado_por_nombre: string | null
  generado_por_email: string | null
  usado_por_nombre: string | null
  usado_por_email: string | null
}

export async function listMisReferidosArbol(): Promise<NodoReferido[]> {
  const { data, error } = await supabase.rpc('mis_referidos_arbol')
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
