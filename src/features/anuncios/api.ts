import { supabase } from '@/lib/supabase'
import type { Anuncio, DestinatarioTipo } from '@/types/database'

export type AnuncioConLectura = Anuncio & { leido: boolean }

export function anuncioExpirado(a: Anuncio): boolean {
  if (a.expira_tipo !== 'dias' || !a.expira_dias) return false
  const limite = new Date(a.created_at)
  limite.setDate(limite.getDate() + a.expira_dias)
  return new Date() > limite
}

export async function listAnunciosNoLeidos(userId: string): Promise<AnuncioConLectura[]> {
  const [{ data: anuncios, error }, { data: lecturas, error: errLect }] = await Promise.all([
    supabase.from('anuncios').select('*').order('created_at', { ascending: false }),
    supabase.from('anuncio_lecturas').select('anuncio_id').eq('user_id', userId),
  ])
  if (error) throw error
  if (errLect) throw errLect
  const leidosIds = new Set((lecturas ?? []).map((l) => l.anuncio_id))
  return (anuncios ?? [])
    .map((a) => ({ ...a, leido: leidosIds.has(a.id) }))
    .filter((a) => !a.leido && !anuncioExpirado(a))
}

export async function listTodosAnuncios(): Promise<Anuncio[]> {
  const { data, error } = await supabase.from('anuncios').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listLecturasIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('anuncio_lecturas').select('anuncio_id').eq('user_id', userId)
  if (error) throw error
  return data.map((l) => l.anuncio_id)
}

export async function crearAnuncio(input: {
  workspace_id: string
  autor_id: string
  titulo: string
  contenido: string
  destinatario_tipo: DestinatarioTipo
  destinatario_ids: string[]
  expira_tipo: 'leido' | 'dias'
  expira_dias: number | null
}): Promise<Anuncio> {
  const { data, error } = await supabase.from('anuncios').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function editarAnuncio(id: string, patch: {
  titulo: string
  contenido: string
  destinatario_tipo: DestinatarioTipo
  destinatario_ids: string[]
  expira_tipo: 'leido' | 'dias'
  expira_dias: number | null
}): Promise<Anuncio> {
  const { data, error } = await supabase.from('anuncios').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function eliminarAnuncio(id: string): Promise<void> {
  const { error } = await supabase.from('anuncios').delete().eq('id', id)
  if (error) throw error
}

export async function marcarAnuncioLeido(anuncioId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('anuncio_lecturas').insert({ anuncio_id: anuncioId, user_id: userId })
  if (error) throw error
}
