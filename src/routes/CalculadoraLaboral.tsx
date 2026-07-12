import { useEffect, useState } from 'react'
import { getConfiguracionLaboral } from '@/features/laboral/api'
import {
  calcularLiquidacion,
  CONTRATOS_CON_PLAZO,
  mensajeNoAplica,
  type TipoTerminacion,
  type TipoContrato,
  type ResultadoLiquidacion,
} from '@/features/laboral/calculoLiquidacion'

const TIPO_TERMINACION_LABEL: Record<TipoTerminacion, string> = {
  despido_intempestivo: 'Despido intempestivo',
  renuncia_voluntaria: 'Renuncia voluntaria',
  mutuo_acuerdo: 'Terminación por mutuo acuerdo',
  visto_bueno: 'Visto bueno (con causa)',
}

const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  indefinido: 'Indefinido',
  eventual: 'Eventual (máx. 180 días/año)',
  ocasional: 'Ocasional (máx. 30 días/año)',
  temporada: 'De temporada',
  obra_o_servicio: 'Por obra o servicio determinado',
  domestico: 'Trabajo doméstico',
  sector_publico: 'Sector público (LOSEP)',
  servicios_profesionales: 'Servicios profesionales / honorarios (civil)',
}

export default function CalculadoraLaboral() {
  const [sbu, setSbu] = useState<number | null>(null)
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [sueldoMensual, setSueldoMensual] = useState('')
  const [mejorSueldo, setMejorSueldo] = useState('')
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>('indefinido')
  const [tipoTerminacion, setTipoTerminacion] = useState<TipoTerminacion>('despido_intempestivo')
  const [terminacionAlVencerPlazo, setTerminacionAlVencerPlazo] = useState(false)
  const [diasVacacionesPendientes, setDiasVacacionesPendientes] = useState('0')
  const [resultado, setResultado] = useState<ResultadoLiquidacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getConfiguracionLaboral().then((c) => setSbu(c.sbu)).catch(() => setSbu(null))
  }, [])

  const noAplica = mensajeNoAplica(tipoContrato)
  const esContratoConPlazo = CONTRATOS_CON_PLAZO.includes(tipoContrato)

  function onCalcular() {
    setError(null)
    setResultado(null)
    if (noAplica) return
    if (sbu == null) { setError('No se pudo cargar el valor del SBU vigente.'); return }
    if (!fechaIngreso || !fechaSalida || !sueldoMensual) { setError('Completa fecha de ingreso, fecha de salida y sueldo mensual.'); return }
    if (new Date(fechaSalida) < new Date(fechaIngreso)) { setError('La fecha de salida no puede ser anterior a la de ingreso.'); return }
    const r = calcularLiquidacion(
      {
        fechaIngreso,
        fechaSalida,
        sueldoMensual: Number(sueldoMensual),
        mejorSueldoHistorico: mejorSueldo ? Number(mejorSueldo) : undefined,
        tipoContrato,
        tipoTerminacion,
        terminacionAlVencerPlazo: esContratoConPlazo ? terminacionAlVencerPlazo : false,
        diasVacacionesPendientes: Number(diasVacacionesPendientes) || 0,
      },
      sbu,
    )
    setResultado(r)
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-4 rounded-[10px] border border-accent/30 bg-accent-soft p-3.5 text-[12px] text-ink">
          <i className="ti ti-calculator mr-1.5 text-accent" />
          Calculadora de liquidación laboral según el Código del Trabajo ecuatoriano. SBU vigente:{' '}
          <strong>{sbu != null ? `$${sbu}` : 'cargando…'}</strong>
        </div>

        <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted">Tipo de contrato</label>
            <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value as TipoContrato)}
              className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent">
              {Object.entries(TIPO_CONTRATO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {noAplica ? (
            <div className="rounded-[8px] bg-warn-soft px-3 py-2.5 text-[12px] text-warn">{noAplica}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Fecha de ingreso</label>
                  <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Fecha de salida</label>
                  <input type="date" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Sueldo mensual actual ($)</label>
                  <input type="number" min="0" step="0.01" value={sueldoMensual} onChange={(e) => setSueldoMensual(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Mejor sueldo histórico ($, opcional)</label>
                  <input type="number" min="0" step="0.01" value={mejorSueldo} onChange={(e) => setMejorSueldo(e.target.value)}
                    placeholder="Igual al actual si no aplica"
                    className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                </div>
              </div>

              {esContratoConPlazo && (
                <label className="flex items-start gap-2 rounded-[8px] border border-border bg-bg p-2.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={terminacionAlVencerPlazo}
                    onChange={(e) => setTerminacionAlVencerPlazo(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    La relación terminó al cumplirse el plazo/obra pactada (terminación natural, no fue despido) — si marcas esto, no se calcula indemnización ni desahucio, solo la liquidación de haberes.
                  </span>
                </label>
              )}

              {!(esContratoConPlazo && terminacionAlVencerPlazo) && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Tipo de terminación</label>
                  <select value={tipoTerminacion} onChange={(e) => setTipoTerminacion(e.target.value as TipoTerminacion)}
                    className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent">
                    {Object.entries(TIPO_TERMINACION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">Días de vacaciones pendientes</label>
                <input type="number" min="0" value={diasVacacionesPendientes} onChange={(e) => setDiasVacacionesPendientes(e.target.value)}
                  className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
              </div>

              {error && <div className="rounded-[8px] bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>}

              <button onClick={onCalcular} className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover">
                Calcular liquidación
              </button>
            </>
          )}
        </div>

        {resultado && (
          <div className="mt-4 rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">
              Resultado — {resultado.añosCompletos} año(s) completo(s) de servicio
            </div>
            <div className="flex flex-col gap-2">
              {resultado.rubros.map((r) => (
                <div key={r.concepto} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <div>
                    <div className="text-[13px] text-ink">{r.concepto}</div>
                    <div className="text-[11px] text-mute2">{r.detalle}</div>
                  </div>
                  <div className="flex-shrink-0 text-[13px] font-medium text-ink">${r.monto.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[14px] font-semibold text-ink">Total estimado</span>
              <span className="text-[16px] font-bold text-accent">${resultado.total.toFixed(2)}</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-mute2">
              Este cálculo se basa en la información más reciente disponible sobre el Salario Básico Unificado y las tablas del Código del Trabajo.
              Te recomendamos verificarlo antes de usarlo en un trámite formal, especialmente si el valor no se ha actualizado recientemente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
