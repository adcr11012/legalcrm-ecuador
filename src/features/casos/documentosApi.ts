import { supabase } from '@/lib/supabase'
import type { Documento, Visibilidad } from '@/types/database'

export async function registrarAccesoDocumento(params: {
  documento_id: string
  workspace_id: string
  accion: 'apertura' | 'lectura_ia' | 'descarga' | 'eliminacion' | 'renombrado' | 'subida'
  nombre_doc?: string
  caso_id?: string
}): Promise<void> {
  // fire-and-forget: no bloqueamos el flujo si falla
  supabase.from('auditoria_documentos').insert(params).then()
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// Genera un token de un solo uso (5 min) y devuelve la URL del proxy
export async function getDocumentoProxyUrl(documentoId: string): Promise<string> {
  // getSession() reads from localStorage — no network call, no JWT expiry race condition
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesión no encontrada — vuelve a iniciar sesión')
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('documento_tokens')
    .insert({ id, documento_id: documentoId, user_id: session.user.id })
  if (error) throw new Error(`Error al crear token: ${error.message} (code: ${error.code})`)
  return `${SUPABASE_URL}/functions/v1/drive-archivo?token=${id}`
}

export async function listDocumentos(casoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type DocumentoBusqueda = {
  id: string
  nombre: string
  caso_id: string
  caso_titulo: string
  caso_materia: string | null
  caso_etapa_id: string | null
}

// Todos los documentos del workspace (para el buscador global) — RLS ya
// limita a lo que el usuario puede ver, no hace falta filtrar por caso.
// Incluye materia/etapa del caso para que la búsqueda multi-palabra pueda
// combinar un término del documento con uno del caso (ej. "resp constitucional").
export async function listDocumentosWorkspace(): Promise<DocumentoBusqueda[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('id, nombre, caso_id, casos(titulo, materia, etapa_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (
    data as unknown as {
      id: string
      nombre: string
      caso_id: string
      casos: { titulo: string; materia: string | null; etapa_id: string | null } | null
    }[]
  ).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    caso_id: d.caso_id,
    caso_titulo: d.casos?.titulo ?? '—',
    caso_materia: d.casos?.materia ?? null,
    caso_etapa_id: d.casos?.etapa_id ?? null,
  }))
}

export async function toggleVisibilidad(id: string, visibilidad: Visibilidad): Promise<Documento> {
  const { data, error } = await supabase.from('documentos').update({ visibilidad }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

async function callDriveEliminar(documentoIds: string[]): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/drive-eliminar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_ids: documentoIds }),
  })
  if (!res.ok) {
    const j = await res.json()
    throw new Error(j.error ?? 'No se pudo eliminar el documento')
  }
}

export async function deleteDocumento(id: string): Promise<void> {
  await callDriveEliminar([id])
}

export async function deleteDocumentosCaso(casoId: string): Promise<void> {
  const { data, error } = await supabase.from('documentos').select('id').eq('caso_id', casoId)
  if (error) throw error
  if (!data || data.length === 0) return
  await callDriveEliminar(data.map((d) => d.id))
}

export async function countDocumentos(): Promise<number> {
  const { count, error } = await supabase.from('documentos').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function compartirDocumento(documentoId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/drive-compartir`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_id: documentoId }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error ?? 'No se pudo compartir el documento')
  return j.url as string
}

export async function leerDocumentoAhora(documentoId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leer-documento-ahora`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_id: documentoId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo leer el documento')
}
