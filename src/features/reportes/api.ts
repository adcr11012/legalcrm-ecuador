import { supabase } from '@/lib/supabase'
import type { Caso, CasoAnticipo, CasoGasto, CasoHora, CasoPersona } from '@/types/database'

export type FilaReporte = {
  caso: Caso
  abogados: string[]
  horasFacturadas: number
  montoHoras: number
  anticipos: number
  gastosCobrables: number
  gastosNoCobrables: number
  diasParaCierre: number | null
}

// Trae todo lo necesario para el reporte en pocas consultas — RLS ya
// limita a lo visible según el rol (master/admin: todo el workspace;
// limitado: solo sus casos asignados), mismo patrón que Búsqueda global.
export async function listDatosReporte(): Promise<FilaReporte[]> {
  const { data: casos, error: errCasos } = await supabase.from('casos').select('*').order('created_at', { ascending: false })
  if (errCasos) throw errCasos
  const casoIds = (casos ?? []).map((c) => c.id)
  if (casoIds.length === 0) return []

  const [{ data: personas }, { data: horas }, { data: anticipos }, { data: gastos }, { data: usuarios }] = await Promise.all([
    supabase.from('caso_personas').select('*').in('caso_id', casoIds),
    supabase.from('caso_horas').select('*').in('caso_id', casoIds),
    supabase.from('caso_anticipos').select('*').in('caso_id', casoIds),
    supabase.from('caso_gastos').select('*').in('caso_id', casoIds),
    supabase.from('users').select('id, nombre'),
  ])
  const nombrePorUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]))

  const personasPorCaso = new Map<string, CasoPersona[]>()
  for (const p of (personas ?? []) as CasoPersona[]) {
    personasPorCaso.set(p.caso_id, [...(personasPorCaso.get(p.caso_id) ?? []), p])
  }
  const horasPorCaso = new Map<string, CasoHora[]>()
  for (const h of (horas ?? []) as CasoHora[]) {
    horasPorCaso.set(h.caso_id, [...(horasPorCaso.get(h.caso_id) ?? []), h])
  }
  const anticiposPorCaso = new Map<string, CasoAnticipo[]>()
  for (const a of (anticipos ?? []) as CasoAnticipo[]) {
    anticiposPorCaso.set(a.caso_id, [...(anticiposPorCaso.get(a.caso_id) ?? []), a])
  }
  const gastosPorCaso = new Map<string, CasoGasto[]>()
  for (const g of (gastos ?? []) as CasoGasto[]) {
    gastosPorCaso.set(g.caso_id, [...(gastosPorCaso.get(g.caso_id) ?? []), g])
  }

  return (casos ?? []).map((caso) => {
    const personasDelCaso = personasPorCaso.get(caso.id) ?? []
    const abogados = personasDelCaso
      .filter((p) => p.rol === 'abogado')
      .map((p) => (p.user_id ? nombrePorUsuario.get(p.user_id) ?? '(usuario eliminado)' : p.nombre_externo ?? 'sin nombre'))

    const horasDelCaso = horasPorCaso.get(caso.id) ?? []
    const horasFacturadas = horasDelCaso.reduce((sum, h) => sum + h.horas, 0)
    const montoHoras = horasDelCaso.reduce((sum, h) => sum + h.horas * h.valor_hora, 0)

    const anticiposDelCaso = anticiposPorCaso.get(caso.id) ?? []
    const anticiposTotal = anticiposDelCaso.reduce((sum, a) => sum + a.monto, 0)

    const gastosDelCaso = gastosPorCaso.get(caso.id) ?? []
    const gastosCobrables = gastosDelCaso.filter((g) => g.cobrable).reduce((sum, g) => sum + g.monto, 0)
    const gastosNoCobrables = gastosDelCaso.filter((g) => !g.cobrable).reduce((sum, g) => sum + g.monto, 0)

    const diasParaCierre = caso.fecha_finalizado
      ? Math.round((new Date(caso.fecha_finalizado).getTime() - new Date(caso.created_at).getTime()) / 86_400_000)
      : null

    return {
      caso,
      abogados,
      horasFacturadas: round2(horasFacturadas),
      montoHoras: round2(montoHoras),
      anticipos: round2(anticiposTotal),
      gastosCobrables: round2(gastosCobrables),
      gastosNoCobrables: round2(gastosNoCobrables),
      diasParaCierre,
    }
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
