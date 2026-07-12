// Cálculo determinístico de liquidación laboral según el Código del Trabajo
// ecuatoriano. A propósito NO usa IA para los montos — los números siempre
// salen de estas fórmulas fijas, nunca de un modelo de lenguaje, porque un
// error de cálculo aquí tiene consecuencias económicas reales. La IA (si se
// usa en el futuro) solo debe ayudar a levantar los datos de entrada, nunca
// inventar el resultado.

export type TipoTerminacion = 'despido_intempestivo' | 'renuncia_voluntaria' | 'mutuo_acuerdo' | 'visto_bueno'

export type TipoContrato =
  | 'indefinido'
  | 'eventual'
  | 'ocasional'
  | 'temporada'
  | 'obra_o_servicio'
  | 'domestico'
  | 'sector_publico'
  | 'servicios_profesionales'

// Contratos con plazo/obra pactada — si la relación termina al cumplirse
// ese plazo (no por decisión unilateral anticipada), no hay indemnización
// ni bonificación por desahucio, solo la liquidación de haberes.
export const CONTRATOS_CON_PLAZO: TipoContrato[] = ['eventual', 'ocasional', 'temporada', 'obra_o_servicio']

// Regímenes donde el Código del Trabajo NO aplica — la calculadora no debe
// usarse para estos casos (se maneja en la UI con un bloqueo explícito).
export const REGIMENES_NO_APLICABLES: TipoContrato[] = ['sector_publico', 'servicios_profesionales']

export function mensajeNoAplica(tipo: TipoContrato): string | null {
  if (tipo === 'sector_publico') {
    return 'El sector público se rige por la LOSEP, no por el Código del Trabajo — esta calculadora no aplica para este caso.'
  }
  if (tipo === 'servicios_profesionales') {
    return 'Una relación de servicios profesionales/honorarios es civil, no laboral — el Código del Trabajo no aplica, esta calculadora no corresponde.'
  }
  return null
}

export type DatosLiquidacion = {
  fechaIngreso: string // YYYY-MM-DD
  fechaSalida: string // YYYY-MM-DD
  sueldoMensual: number
  mejorSueldoHistorico?: number // si es distinto al actual — afecta la indemnización (Art. 188)
  tipoContrato: TipoContrato
  tipoTerminacion: TipoTerminacion
  // Solo relevante si tipoContrato está en CONTRATOS_CON_PLAZO: si la
  // relación terminó al cumplirse el plazo/obra pactada, no corresponde
  // indemnización ni desahucio, sin importar tipoTerminacion.
  terminacionAlVencerPlazo?: boolean
  diasVacacionesPendientes: number
  decimoTerceroPendienteDesde?: string // por defecto, últimos 12 meses hasta la salida
  decimoCuartoPendienteDesde?: string
}

export type RubroLiquidacion = { concepto: string; monto: number; detalle: string }

export type ResultadoLiquidacion = {
  rubros: RubroLiquidacion[]
  total: number
  añosCompletos: number
  diasTotales: number
}

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + 'T00:00:00')
  const b = new Date(hasta + 'T00:00:00')
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

function añosCompletosEntre(desde: string, hasta: string): number {
  const a = new Date(desde + 'T00:00:00')
  const b = new Date(hasta + 'T00:00:00')
  let años = b.getFullYear() - a.getFullYear()
  const aniversarioEsteAño = new Date(b.getFullYear(), a.getMonth(), a.getDate())
  if (b < aniversarioEsteAño) años--
  return Math.max(0, años)
}

// Décimo tercero (bono navideño): proporcional a los días trabajados desde
// el último pago (o el ingreso) hasta la salida, sobre 1 sueldo mensual/360.
function decimoTercero(sueldo: number, desde: string, hasta: string): number {
  const dias = diasEntre(desde, hasta)
  return round2((sueldo / 360) * dias)
}

// Décimo cuarto (bono escolar): proporcional, calculado sobre el SBU (no el
// sueldo del trabajador), mismo criterio de días/360.
function decimoCuarto(sbu: number, desde: string, hasta: string): number {
  const dias = diasEntre(desde, hasta)
  return round2((sbu / 360) * dias)
}

// Vacaciones no gozadas: 15 días (medio sueldo) por cada año completo,
// más la parte proporcional del año en curso, sobre los días pendientes
// que indique el usuario.
function vacacionesNoGozadas(sueldo: number, diasPendientes: number): number {
  return round2((sueldo / 30) * diasPendientes)
}

// Fondos de reserva: 1/12 del sueldo por cada mes trabajado, a partir del
// mes 13 (el primer año no genera fondos de reserva).
function fondosDeReserva(sueldo: number, desde: string, hasta: string): number {
  const dias = diasEntre(desde, hasta)
  const meses = dias / 30
  const mesesConDerecho = Math.max(0, meses - 12)
  return round2(sueldo * (1 / 12) * mesesConDerecho)
}

// Bonificación por desahucio (Art. 185): 25% del último sueldo por cada
// año completo de servicio — aplica cuando la relación termina por
// desahucio (aviso de cualquiera de las partes), no en despido intempestivo
// puro ni en visto bueno.
function bonificacionDesahucio(sueldo: number, añosCompletos: number): number {
  return round2(sueldo * 0.25 * añosCompletos)
}

// Indemnización por despido intempestivo (Art. 188): hasta 3 años, 3
// remuneraciones; más de 3 años, 1 remuneración por año completo, tope 25.
// Se calcula sobre el MEJOR sueldo histórico del trabajador (jurisprudencia
// obligatoria de la Corte Nacional de Justicia, Resolución 02-2025), no
// necesariamente el último.
function indemnizacionDespidoIntempestivo(mejorSueldo: number, añosCompletos: number): number {
  const meses = añosCompletos <= 3 ? 3 : Math.min(añosCompletos, 25)
  return round2(mejorSueldo * meses)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcularLiquidacion(datos: DatosLiquidacion, sbu: number): ResultadoLiquidacion {
  const { fechaIngreso, fechaSalida, sueldoMensual, tipoContrato, tipoTerminacion, diasVacacionesPendientes } = datos
  const esContratoConPlazo = CONTRATOS_CON_PLAZO.includes(tipoContrato)
  const terminoAlVencerPlazo = esContratoConPlazo && Boolean(datos.terminacionAlVencerPlazo)
  const mejorSueldo = datos.mejorSueldoHistorico && datos.mejorSueldoHistorico > sueldoMensual
    ? datos.mejorSueldoHistorico
    : sueldoMensual

  const dias13 = datos.decimoTerceroPendienteDesde ?? fechaIngreso
  const dias14 = datos.decimoCuartoPendienteDesde ?? fechaIngreso
  const añosCompletos = añosCompletosEntre(fechaIngreso, fechaSalida)

  const rubros: RubroLiquidacion[] = []

  rubros.push({
    concepto: 'Décimo tercero proporcional',
    monto: decimoTercero(sueldoMensual, dias13, fechaSalida),
    detalle: 'Sueldo mensual ÷ 360 × días trabajados desde el último pago',
  })

  rubros.push({
    concepto: 'Décimo cuarto proporcional',
    monto: decimoCuarto(sbu, dias14, fechaSalida),
    detalle: `SBU ($${sbu}) ÷ 360 × días trabajados desde el último pago`,
  })

  if (diasVacacionesPendientes > 0) {
    rubros.push({
      concepto: 'Vacaciones no gozadas',
      monto: vacacionesNoGozadas(sueldoMensual, diasVacacionesPendientes),
      detalle: `Sueldo ÷ 30 × ${diasVacacionesPendientes} día(s) pendiente(s)`,
    })
  }

  const fr = fondosDeReserva(sueldoMensual, fechaIngreso, fechaSalida)
  if (fr > 0) {
    rubros.push({
      concepto: 'Fondos de reserva',
      monto: fr,
      detalle: 'Sueldo × 1/12 por cada mes trabajado desde el mes 13',
    })
  }

  if (terminoAlVencerPlazo) {
    // Terminación natural del plazo/obra pactada: solo liquidación de
    // haberes, sin indemnización ni desahucio a cargo del empleador.
  } else if (tipoTerminacion === 'despido_intempestivo') {
    rubros.push({
      concepto: 'Bonificación por desahucio (Art. 185)',
      monto: bonificacionDesahucio(sueldoMensual, añosCompletos),
      detalle: '25% del último sueldo × años completos de servicio',
    })
    rubros.push({
      concepto: 'Indemnización por despido intempestivo (Art. 188)',
      monto: indemnizacionDespidoIntempestivo(mejorSueldo, añosCompletos),
      detalle: añosCompletos <= 3
        ? '3 remuneraciones (mejor sueldo histórico) — hasta 3 años de servicio'
        : `1 remuneración (mejor sueldo histórico) × ${Math.min(añosCompletos, 25)} año(s), tope 25`,
    })
  } else if (tipoTerminacion === 'mutuo_acuerdo') {
    rubros.push({
      concepto: 'Bonificación por desahucio (Art. 185)',
      monto: bonificacionDesahucio(sueldoMensual, añosCompletos),
      detalle: '25% del último sueldo × años completos de servicio',
    })
  }
  // renuncia_voluntaria y visto_bueno con causa del trabajador: sin
  // indemnización ni desahucio a cargo del empleador.

  const total = round2(rubros.reduce((sum, r) => sum + r.monto, 0))
  const diasTotales = diasEntre(fechaIngreso, fechaSalida)

  return { rubros, total, añosCompletos, diasTotales }
}
