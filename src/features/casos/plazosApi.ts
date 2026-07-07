import { supabase } from '@/lib/supabase'
import type { Plazo, TipoPlazo } from '@/types/database'

export async function listPlazos(casoId: string): Promise<Plazo[]> {
  const { data, error } = await supabase.from('plazos').select('*').eq('caso_id', casoId).order('fecha')
  if (error) throw error
  return data
}

export type CalendarSyncResult = { sincronizado: boolean; motivo?: string }

export async function createPlazo(input: {
  caso_id: string
  workspace_id: string
  titulo: string
  descripcion?: string | null
  fecha: string
  tipo: TipoPlazo
  asignado_a?: string | null
  notificar_a?: string[]
  notificar_externos?: string[]
}): Promise<Plazo & { _calendarSync?: CalendarSyncResult }> {
  const { data, error } = await supabase.from('plazos').insert(input).select('*').single()
  if (error) throw error
  const sync = await syncPlazoConCalendar(data.id).catch((err) => ({ sincronizado: false, motivo: err instanceof Error ? err.message : 'Error de red' }))
  return { ...data, _calendarSync: sync }
}

export async function updatePlazo(
  id: string,
  patch: Partial<Pick<Plazo, 'estado' | 'nota' | 'titulo' | 'descripcion' | 'fecha' | 'tipo' | 'asignado_a' | 'notificar_a' | 'notificar_externos'>>,
): Promise<Plazo & { _calendarSync?: CalendarSyncResult }> {
  const { data, error } = await supabase.from('plazos').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  if ('fecha' in patch || 'titulo' in patch || 'descripcion' in patch || 'notificar_a' in patch || 'notificar_externos' in patch) {
    const sync = await syncPlazoConCalendar(data.id).catch((err) => ({ sincronizado: false, motivo: err instanceof Error ? err.message : 'Error de red' }))
    return { ...data, _calendarSync: sync }
  }
  return data
}

export async function deletePlazo(id: string): Promise<void> {
  await cancelarSyncCalendar(id).catch(() => {})
  const { error } = await supabase.from('plazos').delete().eq('id', id)
  if (error) throw error
}

async function syncPlazoConCalendar(plazoId: string): Promise<CalendarSyncResult> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) return { sincronizado: false, motivo: 'Sesión no disponible' }
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync-event`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plazo_id: plazoId, accion: 'upsert' }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { sincronizado: false, motivo: json.error ?? `Error HTTP ${res.status}` }
  return { sincronizado: Boolean(json.sincronizado), motivo: json.motivo }
}

async function cancelarSyncCalendar(plazoId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) return
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync-event`
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plazo_id: plazoId, accion: 'cancelar' }),
  })
}

export async function listAllPlazos(): Promise<Plazo[]> {
  const { data, error } = await supabase.from('plazos').select('*').order('fecha')
  if (error) throw error
  return data
}

export async function countAudienciasProximas(dias = 7): Promise<number> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + dias)
  const { count, error } = await supabase
    .from('plazos')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'audiencia')
    .gte('fecha', hoy.toISOString().slice(0, 10))
    .lte('fecha', limite.toISOString().slice(0, 10))
  if (error) throw error
  return count ?? 0
}
