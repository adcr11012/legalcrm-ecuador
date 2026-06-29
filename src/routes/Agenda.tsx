import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllPlazos } from '@/features/casos/plazosApi'
import { listCasos } from '@/features/casos/api'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS, URGENCIA_BORDER } from '@/features/casos/plazoUrgencia'
import type { Caso, Plazo } from '@/types/database'

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Genera la grilla del mes (lunes a domingo), con celdas vacías de relleno.
function buildMonthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const startWeekday = (first.getDay() + 6) % 7 // 0 = lunes
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = Array(startWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  return cells
}

export default function Agenda() {
  const navigate = useNavigate()
  const [plazos, setPlazos] = useState<Plazo[]>([])
  const [casosById, setCasosById] = useState<Map<string, Caso>>(new Map())
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pl, casos] = await Promise.all([listAllPlazos(), listCasos()])
      setPlazos(pl)
      setCasosById(new Map(casos.map((c) => [c.id, c])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const eventDates = useMemo(() => new Set(plazos.map((p) => p.fecha)), [plazos])
  const todayStr = toDateStr(new Date())
  const grid = useMemo(() => buildMonthGrid(month), [month])

  const proximos = useMemo(() => {
    const futuros = plazos.filter((p) => p.fecha >= todayStr).sort((a, b) => a.fecha.localeCompare(b.fecha))
    const grupos = new Map<string, Plazo[]>()
    for (const p of futuros) grupos.set(p.fecha, [...(grupos.get(p.fecha) ?? []), p])
    return grupos
  }, [plazos, todayStr])

  function labelFecha(fechaStr: string) {
    const dias = diasRestantes(fechaStr)
    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Mañana'
    const d = new Date(fechaStr + 'T00:00:00')
    const txt = d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
    return txt.charAt(0).toUpperCase() + txt.slice(1)
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando agenda…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>

  return (
    <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="w-full flex-shrink-0 overflow-y-auto border-b border-border bg-surface p-4 lg:w-[280px] lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-ink">
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted transition hover:bg-[#f2f1ee]"
          >
            <i className="ti ti-chevron-left" />
          </button>
          <span className="capitalize">{month.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}</span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted transition hover:bg-[#f2f1ee]"
          >
            <i className="ti ti-chevron-right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} className="py-1 text-center text-[10px] font-semibold text-mute2">
              {d}
            </div>
          ))}
          {grid.map((d, i) => {
            if (!d) return <div key={i} />
            const dStr = toDateStr(d)
            const isToday = dStr === todayStr
            const hasEvent = eventDates.has(dStr)
            return (
              <div
                key={i}
                className={`relative rounded-[6px] py-1.5 text-center text-[12px] ${
                  isToday ? 'bg-accent font-semibold text-white' : 'text-muted hover:bg-[#f2f1ee]'
                }`}
              >
                {d.getDate()}
                {hasEvent && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isToday ? 'bg-white' : 'bg-warn'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {Array.from(proximos.entries()).map(([fecha, items]) => (
          <div key={fecha} className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">{labelFecha(fecha)}</div>
            <div className="flex flex-col gap-2">
              {items.map((p) => {
                const dias = diasRestantes(p.fecha)
                const urgencia = clasificarUrgencia(dias)
                const caso = casosById.get(p.caso_id)
                return (
                  <button
                    key={p.id}
                    onClick={() => caso && navigate(`/casos/${caso.id}`)}
                    className={`flex items-center gap-3.5 rounded-[10px] border border-border bg-surface px-4 py-3 text-left transition hover:border-mute2/40 ${URGENCIA_BORDER[urgencia]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink">{p.titulo}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{caso?.titulo ?? 'Caso no disponible'}</div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCIA_CLASS[urgencia]}`}>
                      {labelDias(dias)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {proximos.size === 0 && (
          <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-muted">
            No hay plazos próximos registrados.
          </div>
        )}
      </div>
    </div>
  )
}
