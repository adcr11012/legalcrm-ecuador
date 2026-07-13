import { supabase } from '@/lib/supabase'
import type { FeriadoEcuador } from '@/types/database'

export type { FeriadoEcuador }

export async function listFeriados(): Promise<FeriadoEcuador[]> {
  const { data, error } = await supabase.from('feriados_ecuador').select('*').order('fecha')
  if (error) throw error
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args)

export async function upsertFeriado(fecha: string, nombre: string, verificado: boolean, provincia: string | null = null): Promise<void> {
  const { error } = await rpc('admin_upsert_feriado', { p_fecha: fecha, p_nombre: nombre, p_verificado: verificado, p_provincia: provincia })
  if (error) throw error
}

export async function eliminarFeriado(id: string): Promise<void> {
  const { error } = await rpc('admin_eliminar_feriado', { p_id: id })
  if (error) throw error
}
