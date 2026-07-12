import { supabase } from '@/lib/supabase'
import type { CodigoReferido } from '@/types/database'

export async function listMisCodigosReferido(): Promise<CodigoReferido[]> {
  const { data, error } = await supabase.from('codigos_referido').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
