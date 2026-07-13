// Calculadora de plazos procesales (régimen COGEP): cuenta días hábiles
// desde una fecha de notificación, excluyendo fines de semana, feriados
// nacionales y — opcionalmente — los períodos de vacancia judicial.
//
// Base legal de referencia (verificar redacción vigente antes de confiar
// ciegamente en el resultado para un trámite real):
// - Cómputo en días hábiles, excluyendo sábados/domingos/feriados: COGEP
//   (el número exacto de artículo varía según la fuente consultada —
//   hay discrepancia entre Art. 73 y Art. 78 en distintas fuentes, posible
//   renumeración por reforma; no se cita un número específico en la UI
//   para no propagar un dato no verificado).
// - Vacancia judicial: Art. 96 COFJ (reformado) + Resolución 141-2020 del
//   Consejo de la Judicatura. Fechas fijas recurrentes cada año (no se
//   trasladan por decreto, a diferencia de los feriados nacionales).
// - Materias exceptuadas de vacancia: penal, tránsito, violencia contra la
//   mujer, familia/niñez/adolescencia, garantías penitenciarias,
//   justicia constitucional — la app NO decide esto automáticamente, el
//   usuario controla la lista de exclusión.

export type RangoExcluido = {
  id: string
  desde: string // YYYY-MM-DD
  hasta: string // YYYY-MM-DD
  etiqueta: string
  editable: boolean
}

// Períodos de vacancia judicial fijos por ley (Art. 96 COFJ) — no cambian
// año a año, a diferencia de los feriados nacionales que sí se trasladan
// por decreto cada año.
export function sugerirVacanciaJudicial(anio: number): RangoExcluido[] {
  return [
    {
      id: `vacancia-marzo-${anio}`,
      desde: `${anio}-03-17`,
      hasta: `${anio}-03-31`,
      etiqueta: 'Vacancia judicial — Litoral e Insular (17-31 marzo)',
      editable: true,
    },
    {
      id: `vacancia-agosto-${anio}`,
      desde: `${anio}-08-01`,
      hasta: `${anio}-08-15`,
      etiqueta: 'Vacancia judicial — Sierra y Amazonía (1-15 agosto)',
      editable: true,
    },
    {
      id: `vacancia-diciembre-${anio}`,
      desde: `${anio}-12-23`,
      hasta: `${anio + 1}-01-06`,
      etiqueta: 'Vacancia judicial — nacional (23 dic - 6 ene)',
      editable: true,
    },
  ]
}

function toDate(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function esFinDeSemana(d: Date): boolean {
  const dia = d.getDay()
  return dia === 0 || dia === 6
}

function estaEnRangoExcluido(fechaISO: string, rangos: RangoExcluido[]): boolean {
  return rangos.some((r) => fechaISO >= r.desde && fechaISO <= r.hasta)
}

export type ResultadoPlazo = {
  fechaLimite: string
  diasHabilesContados: number
  diasCalendarioTotales: number
  diasExcluidosPorFeriado: string[]
  diasExcluidosPorVacancia: number
}

// El término empieza a correr el día hábil siguiente a la notificación
// (regla general COGEP), y se cuenta el número de días hábiles indicado,
// saltando fines de semana, feriados y rangos de vacancia activos.
export function calcularFechaLimite(
  fechaNotificacion: string,
  diasHabiles: number,
  feriados: Set<string>,
  vacanciaActiva: RangoExcluido[],
): ResultadoPlazo {
  let cursor = toDate(fechaNotificacion)
  let contados = 0
  let diasCalendario = 0
  const feriadosEncontrados: string[] = []
  let excluidosPorVacancia = 0

  // Avanza al primer día hábil siguiente a la notificación, y desde ahí
  // cuenta hacia adelante.
  while (contados < diasHabiles) {
    cursor = new Date(cursor.getTime() + 86_400_000)
    diasCalendario++
    const iso = formatISO(cursor)

    if (esFinDeSemana(cursor)) continue
    if (feriados.has(iso)) {
      feriadosEncontrados.push(iso)
      continue
    }
    if (estaEnRangoExcluido(iso, vacanciaActiva)) {
      excluidosPorVacancia++
      continue
    }
    contados++
  }

  return {
    fechaLimite: formatISO(cursor),
    diasHabilesContados: contados,
    diasCalendarioTotales: diasCalendario,
    diasExcluidosPorFeriado: feriadosEncontrados,
    diasExcluidosPorVacancia: excluidosPorVacancia,
  }
}
