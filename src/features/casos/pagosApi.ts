import { supabase } from '@/lib/supabase'
import type { CasoAnticipo, CasoGasto } from '@/types/database'

export async function listAnticipos(casoId: string): Promise<CasoAnticipo[]> {
  const { data, error } = await supabase.from('caso_anticipos').select('*').eq('caso_id', casoId).order('fecha')
  if (error) throw error
  return data
}

export async function addAnticipo(casoId: string, fecha: string, monto: number, detalle: string): Promise<CasoAnticipo> {
  const { data, error } = await supabase.from('caso_anticipos').insert({ caso_id: casoId, fecha, monto, detalle: detalle || null }).select('*').single()
  if (error) throw error
  return data
}

export async function deleteAnticipo(id: string): Promise<void> {
  const { error } = await supabase.from('caso_anticipos').delete().eq('id', id)
  if (error) throw error
}

export async function listGastos(casoId: string): Promise<CasoGasto[]> {
  const { data, error } = await supabase.from('caso_gastos').select('*').eq('caso_id', casoId).order('fecha')
  if (error) throw error
  return data
}

export async function addGasto(casoId: string, fecha: string, monto: number, descripcion: string, cobrable: boolean): Promise<CasoGasto> {
  const { data, error } = await supabase.from('caso_gastos').insert({ caso_id: casoId, fecha, monto, descripcion, cobrable }).select('*').single()
  if (error) throw error
  return data
}

export async function deleteGasto(id: string): Promise<void> {
  const { error } = await supabase.from('caso_gastos').delete().eq('id', id)
  if (error) throw error
}
