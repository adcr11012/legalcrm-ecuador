import { supabase } from '@/lib/supabase'
import type { SatjeMovimiento } from '@/types/database'

export type CasoParaExportar = { id: string; titulo: string; numero_causa: string }

// Casos activos (etapa no terminal) que tienen número de causa registrado —
// son los que tiene sentido consultar en SATJE.
export async function listCasosParaExportar(): Promise<CasoParaExportar[]> {
  const { data: etapasTerminales, error: errEtapas } = await supabase
    .from('etapas')
    .select('id')
    .eq('es_terminal', true)
  if (errEtapas) throw errEtapas
  const idsTerminales = (etapasTerminales ?? []).map((e) => e.id)

  let query = supabase
    .from('casos')
    .select('id, titulo, numero_causa')
    .not('numero_causa', 'is', null)
    .neq('numero_causa', '')
  if (idsTerminales.length > 0) {
    query = query.not('etapa_id', 'in', `(${idsTerminales.join(',')})`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as CasoParaExportar[]
}

// Formato esperado del archivo de resultados que produce el programa local
// (Node + Playwright). Un objeto por número de causa consultado.
export type ResultadoImportacion = {
  numeroCausa: string
  movimientos: { fecha: string; tipo: string; descripcion?: string }[]
}

export type ResumenImportacion = {
  casosNoEncontrados: string[]
  movimientosNuevos: number
  movimientosYaExistentes: number
}

export async function importarResultadosSatje(
  resultados: ResultadoImportacion[],
  casos: CasoParaExportar[],
  userId: string,
): Promise<ResumenImportacion> {
  const casoIdPorNumero = new Map(casos.map((c) => [c.numero_causa, c.id]))
  const resumen: ResumenImportacion = { casosNoEncontrados: [], movimientosNuevos: 0, movimientosYaExistentes: 0 }

  for (const r of resultados) {
    const casoId = casoIdPorNumero.get(r.numeroCausa)
    if (!casoId) {
      resumen.casosNoEncontrados.push(r.numeroCausa)
      continue
    }
    for (const m of r.movimientos) {
      const { error } = await supabase.from('satje_movimientos').insert({
        caso_id: casoId,
        numero_causa: r.numeroCausa,
        fecha_movimiento: m.fecha,
        tipo: m.tipo,
        descripcion: m.descripcion ?? null,
        importado_por: userId,
      })
      if (error) {
        // Violación de la restricción única = ese movimiento ya se había importado antes.
        if (error.code === '23505') resumen.movimientosYaExistentes++
        else throw error
      } else {
        resumen.movimientosNuevos++
      }
    }
  }

  return resumen
}

export async function listMovimientosRecientes(limit = 30): Promise<SatjeMovimiento[]> {
  const { data, error } = await supabase
    .from('satje_movimientos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
