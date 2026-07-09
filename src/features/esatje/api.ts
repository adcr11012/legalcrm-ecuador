import { supabase } from '@/lib/supabase'
import type { SatjeMovimiento, SatjeDatosGenerales } from '@/types/database'

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

  const validos = (data ?? []).filter((c) => c.numero_causa && esNumeroCausaValido(c.numero_causa))
  const invalidos = (data ?? []).filter((c) => c.numero_causa && !esNumeroCausaValido(c.numero_causa))

  // Avisa a CADA workspace (nunca mezclado) sobre sus propias causas con
  // formato inválido, vía su propia campanita de notificaciones. Evita
  // duplicar el aviso si ya hay uno sin leer para ese mismo caso.
  for (const c of invalidos) {
    const { data: existente } = await supabase
      .from('avisos_admin')
      .select('id')
      .eq('workspace_id', c.workspace_id)
      .eq('tipo', 'satje_causa_invalida')
      .eq('ref_id', c.id)
      .eq('leido', false)
      .maybeSingle()
    if (existente) continue
    await supabase.from('avisos_admin').insert({
      workspace_id: c.workspace_id,
      tipo: 'satje_causa_invalida',
      titulo: 'Número de causa inválido',
      subtitulo: `${c.titulo} — "${c.numero_causa}" no tiene un formato reconocible, revísalo en el caso.`,
      ref_id: c.id,
      to_path: `/casos/${c.id}`,
      leido: false,
    })
  }

  return validos.map((c) => ({
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
  jurisdicciones: {
    jurisdiccion: string
    ciudad?: string
    datosGenerales?: {
      numeroProceso?: string
      materia?: string
      tipoAccion?: string
      delitoAsunto?: string
      judicaturaActual?: string
      actor?: string
      demandado?: string
    }
    movimientos: { fecha: string; tipo: string; descripcion?: string; codigo?: string; orden?: number }[]
  }[]
}

export type ResumenImportacion = {
  causasNoEncontradas: string[]
  movimientosNuevos: number
  movimientosYaExistentes: number
  casosConNovedad: number
}

export async function importarResultadosSatjeGlobal(
  resultados: ResultadoImportacion[],
  casos: CasoParaExportar[],
  superadminId: string,
): Promise<ResumenImportacion> {
  const casoPorNumero = new Map(casos.map((c) => [c.numero_causa, c]))
  const resumen: ResumenImportacion = { causasNoEncontradas: [], movimientosNuevos: 0, movimientosYaExistentes: 0, casosConNovedad: 0 }

  for (const r of resultados) {
    const caso = casoPorNumero.get(r.numeroCausa)
    if (!caso) {
      resumen.causasNoEncontradas.push(r.numeroCausa)
      continue
    }

    // Snapshot de códigos ya importados en corridas ANTERIORES para este
    // caso — se usa solo para saber qué es "novedad" hoy (avisar 1 vez al
    // día si algo cambió). No bloquea el guardado: si SATJE repite un
    // evento dentro de esta misma corrida, igual se guarda repetido.
    const { data: existentes, error: errExistentes } = await supabase
      .from('satje_movimientos')
      .select('codigo')
      .eq('caso_id', caso.id)
      .not('codigo', 'is', null)
    if (errExistentes) throw errExistentes
    const codigosPrevios = new Set((existentes ?? []).map((m) => m.codigo))
    let novedadesEnEsteCaso = 0

    for (const j of r.jurisdicciones) {
      const dg = j.datosGenerales
      const { error: errDg } = await supabase.from('satje_datos_generales').upsert(
        {
          caso_id: caso.id,
          jurisdiccion: j.jurisdiccion,
          workspace_id: caso.workspace_id,
          numero_proceso: dg?.numeroProceso ?? null,
          materia: dg?.materia ?? null,
          tipo_accion: dg?.tipoAccion ?? null,
          delito_asunto: dg?.delitoAsunto ?? null,
          judicatura_actual: dg?.judicaturaActual ?? null,
          actor: dg?.actor ?? null,
          demandado: dg?.demandado ?? null,
          importado_por: superadminId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'caso_id,jurisdiccion' },
      )
      if (errDg) throw errDg

      for (const m of j.movimientos) {
        const { error } = await supabase.from('satje_movimientos').insert({
          caso_id: caso.id,
          workspace_id: caso.workspace_id,
          numero_causa: r.numeroCausa,
          fecha_movimiento: m.fecha,
          tipo: m.tipo,
          descripcion: m.descripcion ?? null,
          jurisdiccion: j.jurisdiccion,
          ciudad: j.ciudad ?? null,
          codigo: m.codigo ?? null,
          orden: m.orden ?? null,
          importado_por: superadminId,
        })
        if (error) throw error
        resumen.movimientosNuevos++
        if (!m.codigo || !codigosPrevios.has(m.codigo)) novedadesEnEsteCaso++
      }
    }

    if (novedadesEnEsteCaso > 0) {
      const { data: avisoExistente } = await supabase
        .from('avisos_admin')
        .select('id')
        .eq('workspace_id', caso.workspace_id)
        .eq('tipo', 'satje_novedad')
        .eq('ref_id', caso.id)
        .eq('leido', false)
        .maybeSingle()
      if (!avisoExistente) {
        await supabase.from('avisos_admin').insert({
          workspace_id: caso.workspace_id,
          tipo: 'satje_novedad',
          titulo: 'Nuevos movimientos en SATJE',
          subtitulo: `${caso.titulo} — ${novedadesEnEsteCaso} movimiento(s) nuevo(s) detectado(s).`,
          ref_id: caso.id,
          to_path: `/casos/${caso.id}`,
          leido: false,
        })
      }
      resumen.casosConNovedad++
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

export async function listMovimientosPorCaso(casoId: string): Promise<SatjeMovimiento[]> {
  const { data, error } = await supabase
    .from('satje_movimientos')
    .select('*')
    .eq('caso_id', casoId)
    .order('orden', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data
}

export async function listDatosGeneralesPorCaso(casoId: string): Promise<SatjeDatosGenerales[]> {
  const { data, error } = await supabase
    .from('satje_datos_generales')
    .select('*')
    .eq('caso_id', casoId)
  if (error) throw error
  return data
}
