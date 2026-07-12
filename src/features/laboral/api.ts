import { supabase } from '@/lib/supabase'
import type { ConfiguracionLaboral } from '@/types/database'

export async function getConfiguracionLaboral(): Promise<ConfiguracionLaboral> {
  const { data, error } = await supabase.from('configuracion_laboral').select('*').single()
  if (error) throw error
  return data
}

// Solo superadmin — RLS ya lo restringe, esto es solo la llamada.
export async function actualizarSbu(sbu: number, userId: string): Promise<ConfiguracionLaboral> {
  const { data, error } = await supabase
    .from('configuracion_laboral')
    .update({ sbu, actualizado_en: new Date().toISOString(), actualizado_por: userId })
    .eq('id', true)
    .select('*')
    .single()
  if (error) throw error
  return data
}
