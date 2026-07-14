import { useEffect, useMemo, useState } from 'react'
import { listFeriados } from '@/features/plazos/api'
import { calcularFechaLimite, sugerirVacanciaJudicial, type RangoExcluido } from '@/features/plazos/calculoPlazos'
import { PROVINCIAS_ECUADOR } from '@/features/plazos/provincias'
import type { Materia, FeriadoEcuador } from '@/types/database'

const inputCls = 'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function CalculadoraPlazos() {
  const [fechaNotificacion, setFechaNotificacion] = useState(hoyISO())
  const [diasHabiles, setDiasHabiles] = useState(5)
  const [materia, setMateria] = useState<Materia | ''>('')
  const [provincia, setProvincia] = useState('')
  const [todosFeriados, setTodosFeriados] = useState<FeriadoEcuador[]>([])
  const [loading, setLoading] = useState(true)
  const [rangosVacancia, setRangosVacancia] = useState<RangoExcluido[]>([])
  const [feriadosQuitadosIds, setFeriadosQuitadosIds] = useState<Set<string>>(new Set())
  const [fechasExtra, setFechasExtra] = useState<string[]>([])
  const [nuevaFechaExtra, setNuevaFechaExtra] = useState('')

  useEffect(() => {
    listFeriados()
      .then(setTodosFeriados)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const anio = new Date(fechaNotificacion + 'T00:00:00').getFullYear()
    setRangosVacancia(sugerirVacanciaJudicial(anio))
  }, [fechaNotificacion])

  const materiaExceptuada = materia === 'penal' || materia === 'familia'

  // Un feriado sin provincia es nacional (afecta a todas); uno con provincia
  // solo afecta al cómputo si coincide con la provincia elegida.
  const feriadosAplicables = useMemo(
    () => todosFeriados.filter((f) => !f.provincia || f.provincia === provincia),
    [todosFeriados, provincia],
  )
  const feriadosSet = useMemo(() => {
    const set = new Set(
      feriadosAplicables.filter((f) => !feriadosQuitadosIds.has(f.id)).map((f) => f.fecha),
    )
    for (const f of fechasExtra) set.add(f)
    return set
  }, [feriadosAplicables, feriadosQuitadosIds, fechasExtra])
  const feriadosNoVerificados = feriadosAplicables.some((f) => !f.verificado && !feriadosQuitadosIds.has(f.id))

  function quitarFeriado(id: string) {
    setFeriadosQuitadosIds((prev) => new Set(prev).add(id))
  }

  function agregarFechaExtra() {
    if (!nuevaFechaExtra || fechasExtra.includes(nuevaFechaExtra)) return
    setFechasExtra((prev) => [...prev, nuevaFechaExtra])
    setNuevaFechaExtra('')
  }

  function quitarFechaExtra(fecha: string) {
    setFechasExtra((prev) => prev.filter((f) => f !== fecha))
  }

  const resultado = useMemo(() => {
    if (!fechaNotificacion || diasHabiles <= 0) return null
    return calcularFechaLimite(fechaNotificacion, diasHabiles, feriadosSet, rangosVacancia)
  }, [fechaNotificacion, diasHabiles, feriadosSet, rangosVacancia])

  function quitarRango(id: string) {
    setRangosVacancia((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 rounded-[10px] border border-accent/30 bg-accent-soft p-3.5 text-[12px] text-ink">
          <i className="ti ti-info-circle mr-1.5 text-accent" />
          Cuenta días hábiles (excluye sábados, domingos, feriados y vacancia judicial activa) desde una fecha de
          notificación, siguiendo el régimen general del COGEP. Es una herramienta referencial — verifica siempre el
          resultado antes de un trámite real, especialmente si tu materia tiene reglas de plazos propias.
        </div>

        {materia === 'penal' && (
          <div className="mb-4 rounded-[10px] border border-warn/30 bg-warn-soft p-3.5 text-[12px] text-ink">
            <i className="ti ti-alert-triangle mr-1.5 text-warn" />
            Materia Penal: el COIP tiene reglas de plazos propias (ej. plazos en horas para flagrancia) que este
            contador genérico de días hábiles no cubre. Úsalo solo como referencia general, no para términos con
            reglas especiales.
          </div>
        )}

        {feriadosNoVerificados && (
          <div className="mb-4 rounded-[10px] border border-danger/30 bg-danger-soft p-3.5 text-[12px] text-ink">
            <i className="ti ti-alert-triangle mr-1.5 text-danger" />
            Hay feriados en la lista que todavía no fueron verificados por un administrador. Revísalos en
            Configuración antes de confiar en este cálculo para un plazo real.
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-3 rounded-[10px] border border-border bg-surface p-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Fecha de notificación</label>
            <input type="date" value={fechaNotificacion} onChange={(e) => setFechaNotificacion(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Días hábiles del término</label>
            <input
              type="number"
              min={1}
              value={diasHabiles}
              onChange={(e) => setDiasHabiles(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Materia (opcional, ajusta el aviso)</label>
            <select value={materia} onChange={(e) => setMateria(e.target.value as Materia | '')} className={inputCls}>
              <option value="">Sin especificar</option>
              <option value="civil">Civil</option>
              <option value="mercantil">Mercantil</option>
              <option value="laboral">Laboral</option>
              <option value="familia">Familia, niñez y adolescencia</option>
              <option value="penal">Penal</option>
              <option value="transito">Tránsito</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Provincia del juzgado (para feriados locales)</label>
            <select value={provincia} onChange={(e) => setProvincia(e.target.value)} className={inputCls}>
              <option value="">Sin especificar (solo feriados nacionales)</option>
              {PROVINCIAS_ECUADOR.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5 rounded-[10px] border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className={labelCls}>Vacancia judicial a excluir</label>
            {materiaExceptuada && (
              <span className="text-[11px] text-mute2">Tu materia suele estar exceptuada de vacancia — revisa si aplican.</span>
            )}
          </div>
          {rangosVacancia.length === 0 ? (
            <div className="text-[12px] text-mute2">Sin períodos de vacancia en el rango de fechas activo.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rangosVacancia.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-[6px] border border-border bg-bg px-2.5 py-1.5">
                  <span className="text-[12px] text-ink">{r.etiqueta}</span>
                  <button onClick={() => quitarRango(r.id)} className="text-[11px] text-mute2 transition hover:text-danger">
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5 rounded-[10px] border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className={labelCls}>Feriados a excluir</label>
            <span className="text-[11px] text-mute2">Desmarcá los que no apliquen o agregá uno extra</span>
          </div>
          {feriadosAplicables.length === 0 ? (
            <div className="mb-2 text-[12px] text-mute2">No hay feriados registrados para este filtro.</div>
          ) : (
            <div className="mb-2 flex flex-col gap-1.5">
              {feriadosAplicables.map((f) => {
                const quitado = feriadosQuitadosIds.has(f.id)
                return (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-2 rounded-[6px] border border-border px-2.5 py-1.5 ${quitado ? 'bg-bg opacity-50' : 'bg-bg'}`}
                  >
                    <span className="text-[12px] text-ink">
                      {new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })} — {f.nombre}
                      {f.provincia ? ` (${f.provincia})` : ''}
                      {!f.verificado && !quitado && <span className="ml-1.5 text-[10px] text-danger">sin verificar</span>}
                    </span>
                    {quitado ? (
                      <button
                        onClick={() => setFeriadosQuitadosIds((prev) => { const s = new Set(prev); s.delete(f.id); return s })}
                        className="text-[11px] text-mute2 transition hover:text-accent"
                      >
                        Restaurar
                      </button>
                    ) : (
                      <button onClick={() => quitarFeriado(f.id)} className="text-[11px] text-mute2 transition hover:text-danger">
                        Quitar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {fechasExtra.length > 0 && (
            <div className="mb-2 flex flex-col gap-1.5">
              {fechasExtra.map((fecha) => (
                <div key={fecha} className="flex items-center justify-between gap-2 rounded-[6px] border border-accent/30 bg-accent-soft px-2.5 py-1.5">
                  <span className="text-[12px] text-ink">
                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })} — agregado para este cálculo
                  </span>
                  <button onClick={() => quitarFechaExtra(fecha)} className="text-[11px] text-mute2 transition hover:text-danger">
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input type="date" value={nuevaFechaExtra} onChange={(e) => setNuevaFechaExtra(e.target.value)} className={inputCls} />
            <button
              onClick={agregarFechaExtra}
              disabled={!nuevaFechaExtra}
              className="shrink-0 rounded-[8px] border border-accent bg-accent-soft px-3 py-2.5 text-[12px] font-medium text-accent transition hover:bg-accent hover:text-white disabled:opacity-40"
            >
              Agregar fecha
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-mute2">
            Esta fecha extra solo aplica a este cálculo puntual — no se guarda en el calendario general de feriados.
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[13px] text-muted">Cargando…</div>
        ) : resultado ? (
          <div className="rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">Resultado</div>
            <div className="mb-3 rounded-[8px] bg-accent-soft p-3.5 text-center">
              <div className="text-[11px] uppercase tracking-wide text-mute2">Fecha límite</div>
              <div className="text-[22px] font-bold text-accent">
                {new Date(resultado.fechaLimite + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-muted sm:grid-cols-3">
              <div>Días hábiles contados: <span className="font-medium text-ink">{resultado.diasHabilesContados}</span></div>
              <div>Días calendario transcurridos: <span className="font-medium text-ink">{resultado.diasCalendarioTotales}</span></div>
              <div>Días excluidos por vacancia: <span className="font-medium text-ink">{resultado.diasExcluidosPorVacancia}</span></div>
            </div>
            {resultado.diasExcluidosPorFeriado.length > 0 && (
              <div className="mt-3 text-[12px] text-muted">
                Feriados excluidos: {resultado.diasExcluidosPorFeriado.map((f) => new Date(f + 'T00:00:00').toLocaleDateString('es-EC')).join(', ')}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
