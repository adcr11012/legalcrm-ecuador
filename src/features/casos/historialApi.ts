import { supabase } from '@/lib/supabase'
import type { HistorialEntry } from '@/types/database'

export async function listHistorial(casoId: string): Promise<HistorialEntry[]> {
  const { data, error } = await supabase
    .from('historial')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listHistorialReciente(limit = 10): Promise<HistorialEntry[]> {
  const { data, error } = await supabase
    .from('historial')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
