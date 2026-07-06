import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDevice } from '@/context/DeviceModeContext'
import { listAllPlazos } from '@/features/casos/plazosApi'
import type { Plazo } from '@/types/database'
import { listCasos } from '@/features/casos/api'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS, URGENCIA_DOT } from '@/features/casos/plazoUrgencia'
import { listPersonasForCasos } from '@/features/casos/personasApi'
import { listHistorialReciente } from '@/features/casos/historialApi'
import { countDocumentos } from '@/features/casos/documentosApi'
import { countAudienciasProximas } from '@/features/casos/plazosApi'
import { countClientesActivos } from '@/features/clientes/api'
import { listWorkspaceUsers } from '@/features/users/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { ACCION_COLOR, ACCION_LABEL } from '@/features/casos/historialLabels'
import { nombrePersona } from '@/features/casos/personaDisplay'
import type { Caso, CasoPersona, Etapa, HistorialEntry, Usuario } from '@/types/database'

type Stats = {
  casosActivos: number
  audienciasProximas: number
  clientesActivos: number
  documentos: number
}

export default function Dashboard() {
  const { isMobile } = useDevice()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [plazosProximos, setPlazosProximos] = useState<Plazo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [casosById, setCasosById] = useState<Map<string, Caso>>(new Map())
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [personasByAbogado, setPersonasByAbogado] = useState<Map<string, CasoPersona[]>>(new Map())
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [distEtapa, setDistEtapa] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [casos, users, hist, audiencias, clientesActivos, documentos, etapasData, todosPlazos] = await Promise.all([
        listCasos(),
        listWorkspaceUsers(),
        listHistorialReciente(10),
        countAudienciasProximas(7),
        countClientesActivos(),
        countDocumentos(),
        listEtapas(),
        listAllPlazos(),
      ])

      const hoy = new Date().toISOString().slice(0, 10)
      const proximos = todosPlazos
        .filter(p => p.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 5)
      setPlazosProximos(proximos)

      const personas = await listPersonasForCasos(casos.map((c) => c.id))

      setCasosById(new Map(casos.map((c) => [c.id, c])))
      setUsersById(new Map(users.map((u) => [u.id, u])))
      setHistorial(hist)
      setEtapas(etapasData)

      const dist = new Map<string, number>()
      for (const c of casos) {
        if (!c.etapa_id) continue
        dist.set(c.etapa_id, (dist.get(c.etapa_id) ?? 0) + 1)
      }
      setDistEtapa(dist)

      const porAbogado = new Map<string, CasoPersona[]>()
      for (const p of personas) {
        if (p.rol !== 'abogado') continue
        const key = p.user_id ?? p.nombre_externo ?? p.id
        porAbogado.set(key, [...(porAbogado.get(key) ?? []), p])
      }
      setPersonasByAbogado(porAbogado)

      const etapasTerminalesIds = new Set(etapasData.filter((e) => e.es_terminal).map((e) => e.id))
      setStats({
        casosActivos: casos.filter((c) => c.etapa_id && !etapasTerminalesIds.has(c.etapa_id)).length,
        audienciasProximas: audiencias,
        clientesActivos,
        documentos,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando dashboard…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!stats) return null

  const hoy = new Date()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-[76px]">
        <div className="mb-1 text-[19px] font-semibold text-ink">{greeting}{profile?.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''}</div>
        <div className="mb-5 text-[13px] text-muted">
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {/* Stats 2 columnas */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { icon: 'ti-briefcase', label: 'Casos activos', value: stats.casosActivos, color: 'bg-accent-soft text-accent' },
            { icon: 'ti-clock',     label: 'Plazos próximos', value: stats.audienciasProximas, color: 'bg-danger-soft text-danger' },
            { icon: 'ti-users',     label: 'Clientes', value: stats.clientesActivos, color: 'bg-success-soft text-success' },
            { icon: 'ti-files',     label: 'Documentos', value: stats.documentos, color: 'bg-soft text-muted' },
          ].map(s => (
            <div key={s.label} className="rounded-[12px] border border-border bg-surface p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] ${s.color}`}>
                <i className={`ti ${s.icon} text-[18px]`} />
              </div>
              <div className="text-[24px] font-bold text-ink">{s.value}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Plazos próximos */}
        <div className="mb-3 text-[15px] font-semibold text-ink">Plazos próximos</div>
        {plazosProximos.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-surface py-8 text-center text-[13px] text-muted">
            Sin plazos próximos
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plazosProximos.map(p => {
              const dias = diasRestantes(p.fecha)
              const urgencia = clasificarUrgencia(dias)
              return (
                <button key={p.id}
                  onClick={() => navigate(`/casos/${p.caso_id}`)}
                  className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-left transition hover:bg-soft">
                  <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${URGENCIA_DOT[urgencia]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-ink">{p.descripcion}</div>
                    <div className="text-[12px] text-muted">{p.tipo}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium flex-shrink-0 ${URGENCIA_CLASS[urgencia]}`}>{labelDias(dias)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const maxCarga = Math.max(1, ...Array.from(personasByAbogado.values()).map((v) => v.length))

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Casos activos" value={stats.casosActivos} />
        <StatCard label="Audiencias próximas" value={stats.audienciasProximas} valueClass="text-danger" hint="Próximos 7 días" />
        <StatCard label="Clientes activos" value={stats.clientesActivos} />
        <StatCard label="Documentos en Drive" value={stats.documentos} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[10px] border border-border bg-surface p-4">
          <div className="mb-3 text-[13px] font-semibold text-ink">Actividad reciente</div>
          <div className="flex flex-col">
            {historial.map((h) => (
              <div key={h.id} className="flex gap-2.5 border-b border-border/70 py-2 last:border-b-0">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ACCION_COLOR[h.accion] ?? '#9e9d98' }} />
                <div>
                  <div className="text-[12px] leading-snug text-ink">
                    {ACCION_LABEL[h.accion] ?? h.accion}
                    {casosById.get(h.caso_id) ? ` — ${casosById.get(h.caso_id)!.titulo}` : ''}
                    {h.detalle ? ` (${h.detalle})` : ''}
                  </div>
                  <div className="mt-0.5 text-[11px] text-mute2">
                    {new Date(h.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
            {historial.length === 0 && <div className="text-[12px] text-mute2">Sin actividad registrada.</div>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">Carga por abogado</div>
            <div className="flex flex-col gap-2.5">
              {Array.from(personasByAbogado.entries()).map(([key, personas]) => (
                <div key={key} className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-ink">{nombrePersona(personas[0], usersById)}</div>
                    <div className="text-[11px] text-mute2">{personas.length} caso{personas.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className="h-1.5 w-20 flex-shrink-0 rounded-full bg-soft">
                    <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(personas.length / maxCarga) * 100}%` }} />
                  </div>
                </div>
              ))}
              {personasByAbogado.size === 0 && <div className="text-[12px] text-mute2">Sin abogados asignados.</div>}
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">Casos por etapa</div>
            <div className="flex flex-wrap gap-2 text-center">
              {etapas.map((etapa) => (
                <div key={etapa.id} className="flex-1">
                  <div className="text-[18px] font-bold text-ink">{distEtapa.get(etapa.id) ?? 0}</div>
                  <div className="text-[10px] text-mute2">{etapa.nombre}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, valueClass, hint }: { label: string; value: number; valueClass?: string; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-mute2">{label}</div>
      <div className={`mt-1 text-[26px] font-bold tracking-tight ${valueClass ?? 'text-ink'}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-mute2">{hint}</div>}
    </div>
  )
}
