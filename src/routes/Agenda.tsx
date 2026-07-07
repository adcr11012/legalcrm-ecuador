import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllPlazos } from '@/features/casos/plazosApi'
import { listCasos } from '@/features/casos/api'
import { listWorkspaceUsers } from '@/features/users/api'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS } from '@/features/casos/plazoUrgencia'
import { SemaforoDot } from '@/features/casos/SemaforoDot'
import type { Caso, EstadoAgenda, Plazo, TipoPlazo, Usuario } from '@/types/database'

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ESTADO_LABEL: Record<EstadoAgenda, string> = {
  pendiente:    'Pendiente',
  en_progreso:  'En progreso',
  completada:   'Completada',
  vencida:      'Vencida',
}

const ESTADO_COLOR: Record<EstadoAgenda, string> = {
  pendiente:   'bg-soft text-muted',
  en_progreso: 'bg-accent-soft text-accent',
  completada:  'bg-success-soft text-success',
  vencida:     'bg-danger-soft text-danger',
}

function calcularEstado(p: Plazo): EstadoAgenda {
  if (p.estado === 'completada') return 'completada'
  if (p.tipo === 'tarea' && p.estado === 'en_progreso') return 'en_progreso'
  if (p.tipo !== 'tarea' && diasRestantes(p.fecha) < 0) return 'vencida'
  return p.estado === 'vencida' ? 'vencida' : p.estado
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = Array(startWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  return cells
}

const TIPO_LABEL: Record<TipoPlazo, string> = {
  audiencia: 'Audiencia',
  plazo:     'Plazo',
  tarea:     'Tarea',
  otro:      'Otro',
}

const TIPO_ICON: Record<TipoPlazo, string> = {
  audiencia: 'ti-gavel',
  plazo:     'ti-clock',
  tarea:     'ti-checkbox',
  otro:      'ti-calendar',
}

const TIPO_COLOR: Record<TipoPlazo, string> = {
  audiencia: 'bg-orange-100 text-orange-500',
  plazo:     'bg-danger-soft text-danger',
  tarea:     'bg-accent-soft text-accent',
  otro:      'bg-soft text-muted',
}

const TIPO_BADGE: Record<TipoPlazo, string> = {
  audiencia: 'bg-orange-100 text-orange-600',
  plazo:     'bg-danger-soft text-danger',
  tarea:     'bg-accent-soft text-accent',
  otro:      'bg-soft text-muted',
}

export default function Agenda() {
  const navigate = useNavigate()
  const [plazos, setPlazos] = useState<Plazo[]>([])
  const [casosById, setCasosById] = useState<Map<string, Caso>>(new Map())
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pl, casos, users] = await Promise.all([listAllPlazos(), listCasos(), listWorkspaceUsers()])
      setPlazos(pl)
      setCasosById(new Map(casos.map((c) => [c.id, c])))
      setUsersById(new Map(users.map((u) => [u.id, u])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const todayStr = toDateStr(new Date())
  const grid = useMemo(() => buildMonthGrid(month), [month])

  const eventDates = useMemo(() => {
    const set = new Set<string>()
    plazos.forEach((p) => set.add(p.fecha))
    return set
  }, [plazos])

  const proximos = useMemo(() => {
    const activos = plazos.filter((p) => p.fecha >= todayStr && p.estado !== 'completada')
    activos.sort((a, b) => a.fecha.localeCompare(b.fecha))
    const grupos = new Map<string, Plazo[]>()
    for (const p of activos) grupos.set(p.fecha, [...(grupos.get(p.fecha) ?? []), p])
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
      {/* Calendario */}
      <div className="w-full flex-shrink-0 overflow-y-auto border-b border-border bg-surface p-4 lg:w-[280px] lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-ink">
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-chevron-left" />
          </button>
          <span className="capitalize">{month.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}</span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-chevron-right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} className="py-1 text-center text-[10px] font-semibold text-mute2">{d}</div>
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
                  isToday ? 'bg-accent font-semibold text-white' : 'text-muted hover:bg-soft'
                }`}
              >
                {d.getDate()}
                {hasEvent && (() => {
                  const evs = proximos.get(dStr) ?? []
                  const minDias = Math.min(...evs.map(ev => diasRestantes(ev.fecha)))
                  const urg = clasificarUrgencia(minDias)
                  const dotCls = isToday ? 'bg-white' : urg === 'rojo' ? 'bg-danger' : urg === 'amarillo' ? 'bg-warn' : 'bg-success'
                  return <span className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${dotCls}`} />
                })()}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-mute2">Tipo</div>
          {(Object.keys(TIPO_LABEL) as TipoPlazo[]).map(t => (
            <div key={t} className="flex items-center gap-2 text-[11px] text-mute2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-[4px] ${TIPO_COLOR[t]}`}>
                <i className={`ti ${TIPO_ICON[t]} text-[11px]`} />
              </span>
              {TIPO_LABEL[t]}
            </div>
          ))}
          <div className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-mute2">Urgencia</div>
          <div className="flex items-center gap-2 text-[11px] text-mute2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" /> 0–7 días
          </div>
          <div className="flex items-center gap-2 text-[11px] text-mute2">
            <span className="h-2.5 w-2.5 rounded-full bg-warn" /> 8–29 días
          </div>
          <div className="flex items-center gap-2 text-[11px] text-mute2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> 30+ días
          </div>
        </div>
      </div>

      {/* Lista de eventos próximos */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {Array.from(proximos.entries()).map(([fecha, items]) => (
          <div key={fecha} className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">{labelFecha(fecha)}</div>
            <div className="flex flex-col gap-2">
              {items.map((p) => {
                const dias = diasRestantes(p.fecha)
                const urgencia = clasificarUrgencia(dias)
                const estado = calcularEstado(p)
                const fechaObj = new Date(p.fecha + 'T00:00:00')
                const caso = casosById.get(p.caso_id)
                const asignado = p.asignado_a ? usersById.get(p.asignado_a) : null
                return (
                  <button
                    key={p.id}
                    onClick={() => caso && navigate(`/casos/${caso.id}`)}
                    className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3 py-3 text-left transition hover:bg-soft"
                  >
                    <SemaforoDot urgencia={urgencia} />

                    <div className="min-w-[40px] text-center">
                      <div className="text-[20px] font-bold leading-none text-ink">{fechaObj.getDate()}</div>
                      <div className="text-[10px] uppercase text-mute2">{MESES[fechaObj.getMonth()]}</div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIPO_BADGE[p.tipo]}`}>
                          {TIPO_LABEL[p.tipo]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLOR[estado]}`}>
                          {ESTADO_LABEL[estado]}
                        </span>
                      </div>
                      <div className="text-[13px] font-medium text-ink">{p.titulo}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{caso?.titulo ?? 'Caso no disponible'}</div>
                      {asignado && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                          <i className="ti ti-user text-[11px]" /> {asignado.nombre}
                        </div>
                      )}
                      {p.nota && (
                        <div className="mt-1.5 rounded-[6px] bg-warn-soft px-2 py-1 text-[11px] text-warn">
                          <i className="ti ti-notes mr-1" />{p.nota}
                        </div>
                      )}
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
            No hay eventos próximos en la agenda.
          </div>
        )}
      </div>
    </div>
  )
}
