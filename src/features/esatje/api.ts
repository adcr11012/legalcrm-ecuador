import { supabase } from '@/lib/supabase'
import type { SatjeMovimiento } from '@/types/database'

// Formato de los números de causa ecuatorianos: 13-17 dígitos, con
// eventuales letras de sufijo (ej. "17297202605046G", "1104190908149CH").
// Es una validación permisiva a propósito — solo descarta valores
// claramente inválidos (vacíos, con espacios, muy cortos/largos), no un
// validador estricto del formato oficial.
export function esNumeroCausaValido(numero: string): boolean {
  return /^\d{10,18}[A-Z]{0,3}$/.test(numero.trim())
}

export type CasoParaExportar = {
  id: string
  workspace_id: string
  workspace_nombre: string
  titulo: string
  numero_causa: string
}

// Junta los números de causa de TODOS los workspaces que tengan la
// sincronización SATJE activada en Configuración, excluyendo casos en
// etapa terminal y números de causa con formato inválido. Requiere ser
// superadmin (las políticas de RLS ya limitan el acceso cross-workspace).
export async function listCasosParaExportarGlobal(): Promise<CasoParaExportar[]> {
  const { data: workspaces, error: errWs } = await supabase
    .from('workspaces')
    .select('id, nombre')
    .eq('satje_sincronizacion_activa', true)
  if (errWs) throw errWs
  const workspaceIds = (workspaces ?? []).map((w) => w.id)
  if (workspaceIds.length === 0) return []
  const nombrePorWorkspace = new Map((workspaces ?? []).map((w) => [w.id, w.nombre]))

  const { data: etapasTerminales, error: errEtapas } = await supabase
    .from('etapas')
    .select('id')
    .in('workspace_id', workspaceIds)
    .eq('es_terminal', true)
  if (errEtapas) throw errEtapas
  const idsTerminales = (etapasTerminales ?? []).map((e) => e.id)

  let query = supabase
    .from('casos')
    .select('id, workspace_id, titulo, numero_causa')
    .in('workspace_id', workspaceIds)
    .not('numero_causa', 'is', null)
    .neq('numero_causa', '')
  if (idsTerminales.length > 0) {
    query = query.not('etapa_id', 'in', `(${idsTerminales.join(',')})`)
  }
  const { data, error } = await query
  if (error) throw error

  return (data ?? [])
    .filter((c) => c.numero_causa && esNumeroCausaValido(c.numero_causa))
    .map((c) => ({
      id: c.id,
      workspace_id: c.workspace_id,
      workspace_nombre: nombrePorWorkspace.get(c.workspace_id) ?? '—',
      titulo: c.titulo,
      numero_causa: c.numero_causa!,
    }))
}

// Formato esperado del archivo de resultados que produce el programa local
// (Node + Playwright). Un objeto por número de causa consultado.
export type ResultadoImportacion = {
  numeroCausa: string
  movimientos: { fecha: string; tipo: string; descripcion?: string }[]
}

export type ResumenImportacion = {
  causasNoEncontradas: string[]
  movimientosNuevos: number
  movimientosYaExistentes: number
}

export async function importarResultadosSatjeGlobal(
  resultados: ResultadoImportacion[],
  casos: CasoParaExportar[],
  superadminId: string,
): Promise<ResumenImportacion> {
  const casoPorNumero = new Map(casos.map((c) => [c.numero_causa, c]))
  const resumen: ResumenImportacion = { causasNoEncontradas: [], movimientosNuevos: 0, movimientosYaExistentes: 0 }

  for (const r of resultados) {
    const caso = casoPorNumero.get(r.numeroCausa)
    if (!caso) {
      resumen.causasNoEncontradas.push(r.numeroCausa)
      continue
    }
    for (const m of r.movimientos) {
      const { error } = await supabase.from('satje_movimientos').insert({
        caso_id: caso.id,
        workspace_id: caso.workspace_id,
        numero_causa: r.numeroCausa,
        fecha_movimiento: m.fecha,
        tipo: m.tipo,
        descripcion: m.descripcion ?? null,
        importado_por: superadminId,
      })
      if (error) {
        if (error.code === '23505') resumen.movimientosYaExistentes++
        else throw error
      } else {
        resumen.movimientosNuevos++
      }
    }
  }

  return resumen
}

export async function listMovimientosRecientesGlobal(limit = 50): Promise<SatjeMovimiento[]> {
  const { data, error } = await supabase
    .from('satje_movimientos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
