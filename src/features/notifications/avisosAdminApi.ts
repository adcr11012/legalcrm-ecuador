import { supabase } from '@/lib/supabase'
import type { AvisoAdmin } from '@/types/database'

export async function listAvisosAdminNoLeidos(): Promise<AvisoAdmin[]> {
  const { data, error } = await supabase
    .from('avisos_admin')
    .select('*')
    .eq('leido', false)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function marcarAvisoLeido(id: string): Promise<void> {
  const { error } = await supabase.from('avisos_admin').update({ leido: true }).eq('id', id)
  if (error) throw error
}
