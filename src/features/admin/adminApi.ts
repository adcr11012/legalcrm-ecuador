import { supabase } from '@/lib/supabase'

export type WorkspaceStat = {
  id: string
  nombre: string
  plan: string
  suspended: boolean
  created_at: string
  usuarios: number
  casos: number
  documentos: number
  owner_email: string | null
}

export type GlobalStats = {
  workspaces: number
  usuarios: number
  casos: number
  documentos: number
}

export type WorkspaceDetail = {
  workspace: {
    id: string; nombre: string; plan: string; suspended: boolean
    created_at: string; notif_email: boolean; dias_anticipacion: number
  }
  usuarios: { nombre: string; email: string; rol: string; created_at: string }[]
  stats: { casos: number; documentos: number; clientes: number; tareas: number }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args)

export async function isSuperadmin(): Promise<boolean> {
  const { data, error } = await rpc('is_superadmin')
  if (error) return false
  return data === true
}

export type Superadmin = { user_id: string; email: string; nombre: string | null; created_at: string }

export async function listarSuperadmins(): Promise<Superadmin[]> {
  const { data, error } = await rpc('admin_listar_superadmins')
  if (error) throw error
  return (data ?? []) as Superadmin[]
}

export async function agregarSuperadmin(email: string): Promise<void> {
  const { error } = await rpc('admin_agregar_superadmin', { p_email: email })
  if (error) throw error
}

export async function quitarSuperadmin(userId: string): Promise<void> {
  const { error } = await rpc('admin_quitar_superadmin', { p_user_id: userId })
  if (error) throw error
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const { data, error } = await rpc('admin_global_stats')
  if (error) throw error
  return data as GlobalStats
}

export async function getAdminWorkspaces(): Promise<WorkspaceStat[]> {
  const { data, error } = await rpc('admin_workspaces')
  if (error) throw error
  return (data ?? []) as WorkspaceStat[]
}

export async function getWorkspaceDetail(workspaceId: string): Promise<WorkspaceDetail> {
  const { data, error } = await rpc('admin_workspace_detail', { p_workspace_id: workspaceId })
  if (error) throw error
  return data as WorkspaceDetail
}

export async function setWorkspacePlan(workspaceId: string, plan: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('workspaces').update({ plan }).eq('id', workspaceId)
  if (error) throw error
}

export async function toggleWorkspaceSuspended(workspaceId: string, suspended: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('workspaces').update({ suspended }).eq('id', workspaceId)
  if (error) throw error
}

// ── Suscripciones / control financiero ──────────────────────────────

export type PagoPeriodo = {
  id: string
  periodo_inicio: string
  periodo_fin: string
  monto: number
  estado: 'pendiente' | 'pagado' | 'vencido'
  fecha_pago: string | null
  notas: string | null
}

export type BillingGlobal = {
  cobrado_mes: number
  pendiente_mes: number
  vencidos: number
  total_anio: number
}

export async function getBillingGlobal(): Promise<BillingGlobal> {
  const { data, error } = await rpc('admin_billing_global')
  if (error) throw error
  return data as BillingGlobal
}

export async function getWorkspacePagos(workspaceId: string): Promise<PagoPeriodo[]> {
  const { data, error } = await rpc('admin_workspace_pagos', { p_workspace_id: workspaceId })
  if (error) throw error
  return (data ?? []) as PagoPeriodo[]
}

export async function activarPlan(workspaceId: string, plan: string, monto: number, inicio: string): Promise<void> {
  const { error } = await rpc('admin_activar_plan', {
    p_workspace_id: workspaceId,
    p_plan: plan,
    p_monto: monto,
    p_inicio: inicio,
  })
  if (error) throw error
}

export async function generarPeriodo(workspaceId: string): Promise<void> {
  const { error } = await rpc('admin_generar_periodo', { p_workspace_id: workspaceId })
  if (error) throw error
}

// ── Códigos de referido ──────────────────────────────────────────────

export async function crearCodigosReferidoRaiz(cantidad: number, semillas = 6): Promise<string[]> {
  const { data, error } = await rpc('admin_crear_codigos_referido', { p_cantidad: cantidad, p_semillas: semillas })
  if (error) throw error
  return (data ?? []) as string[]
}

export async function listarCodigosRaiz() {
  const { data, error } = await rpc('admin_listar_codigos_raiz')
  if (error) throw error
  return (data ?? []) as {
    id: string
    codigo: string
    semillas: number
    usado: boolean
    usado_por_workspace_id: string | null
    usado_at: string | null
    expira_at: string | null
    created_at: string
  }[]
}

export type NodoArbolReferido = {
  id: string
  codigo: string
  semillas: number
  usado: boolean
  expira_at: string | null
  created_at: string
  usado_at: string | null
  generado_por_workspace: string | null
  generado_por_email: string | null
  usado_por_workspace: string | null
  usado_por_email: string | null
}

export async function listarArbolReferidos(): Promise<NodoArbolReferido[]> {
  const { data, error } = await rpc('admin_arbol_referidos')
  if (error) throw error
  return (data ?? []) as NodoArbolReferido[]
}

export async function registrarPago(pagoId: string, fecha: string, notas?: string): Promise<void> {
  const { error } = await rpc('admin_registrar_pago', {
    p_pago_id: pagoId,
    p_fecha: fecha,
    p_notas: notas ?? null,
  })
  if (error) throw error
}
