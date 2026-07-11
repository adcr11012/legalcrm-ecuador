import { supabase } from '@/lib/supabase'
import type { CategoriaTicket, TicketSoporte, TicketMensaje } from '@/types/database'

const BUCKET = 'ticket-capturas'

// Sube una captura de pantalla al bucket privado y devuelve una URL firmada
// (válida por 7 días, suficiente para verla en el hilo del ticket).
export async function subirCaptura(workspaceId: string, ticketId: string, file: File): Promise<string> {
  const path = `${workspaceId}/${ticketId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
  if (uploadError) throw uploadError
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7)
  if (error) throw error
  return data.signedUrl
}

export async function listMisTickets(): Promise<TicketSoporte[]> {
  const { data, error } = await supabase.from('tickets_soporte').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTicket(id: string): Promise<TicketSoporte> {
  const { data, error } = await supabase.from('tickets_soporte').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function listMensajes(ticketId: string): Promise<TicketMensaje[]> {
  const { data, error } = await supabase
    .from('ticket_mensajes')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Crea el ticket y su primer mensaje (la descripción inicial) en un solo paso.
export async function crearTicket(params: {
  workspaceId: string
  userId: string
  categoria: CategoriaTicket
  asunto: string
  mensaje: string
  capturaFile?: File | null
}): Promise<TicketSoporte> {
  const { data: ticket, error } = await supabase
    .from('tickets_soporte')
    .insert({ workspace_id: params.workspaceId, creado_por: params.userId, categoria: params.categoria, asunto: params.asunto })
    .select('*')
    .single()
  if (error) throw error

  const capturaUrl = params.capturaFile ? await subirCaptura(params.workspaceId, ticket.id, params.capturaFile) : null
  const { error: msgError } = await supabase.from('ticket_mensajes').insert({
    ticket_id: ticket.id,
    autor_id: params.userId,
    autor_tipo: 'usuario',
    mensaje: params.mensaje,
    captura_url: capturaUrl,
  })
  if (msgError) throw msgError

  return ticket
}

export async function enviarMensaje(params: {
  workspaceId: string
  ticketId: string
  userId: string
  autorTipo: 'usuario' | 'soporte'
  mensaje: string
  capturaFile?: File | null
}): Promise<void> {
  const capturaUrl = params.capturaFile ? await subirCaptura(params.workspaceId, params.ticketId, params.capturaFile) : null
  const { error } = await supabase.from('ticket_mensajes').insert({
    ticket_id: params.ticketId,
    autor_id: params.userId,
    autor_tipo: params.autorTipo,
    mensaje: params.mensaje,
    captura_url: capturaUrl,
  })
  if (error) throw error

  // Si responde soporte, el ticket pasa a "respondido" (a menos que ya esté
  // cerrado — no debería pasar porque solo soporte cierra, pero por si acaso).
  if (params.autorTipo === 'soporte') {
    await supabase.from('tickets_soporte').update({ estado: 'respondido', updated_at: new Date().toISOString() }).eq('id', params.ticketId).neq('estado', 'cerrado')
  }
}

// Solo soporte (superadmin) — RLS ya lo restringe, esto es solo la llamada.
export async function cerrarTicket(id: string): Promise<void> {
  const { error } = await supabase.from('tickets_soporte').update({ estado: 'cerrado', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function reabrirTicket(id: string): Promise<void> {
  const { error } = await supabase.from('tickets_soporte').update({ estado: 'abierto', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function eliminarTicket(id: string): Promise<void> {
  const { error } = await supabase.from('tickets_soporte').delete().eq('id', id)
  if (error) throw error
}

// Vista de superadmin: todos los tickets de todos los workspaces, con el
// nombre del workspace para mostrarlo en la bandeja.
export type TicketConWorkspace = TicketSoporte & { workspace_nombre: string }

export async function listTicketsSuperadmin(): Promise<TicketConWorkspace[]> {
  const { data, error } = await supabase
    .from('tickets_soporte')
    .select('*, workspaces(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as (TicketSoporte & { workspaces: { nombre: string } | null })[]).map((t) => ({
    ...t,
    workspace_nombre: t.workspaces?.nombre ?? '—',
  }))
}
