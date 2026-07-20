import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDevice } from '@/context/DeviceModeContext'
import { listAllPlazos } from '@/features/casos/plazosApi'
import type { Plazo } from '@/types/database'
import { listCasos } from '@/features/casos/api'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS } from '@/features/casos/plazoUrgencia'
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
    if (!profile) return
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
        listEtapas(profile.workspace_id),
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
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando dashboard…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!stats) return null

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  if (isMobile) {
    const [masUrgente, ...resto] = plazosProximos
    const diasUrgente = masUrgente ? diasRestantes(masUrgente.fecha) : 0

    return (
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-1 text-[19px] font-semibold text-ink">{greeting}{profile?.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''}</div>
        <div className="mb-4 text-[13px] text-muted">
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {/* Franja de totales */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[12px] text-muted"><b className="font-semibold text-ink">{stats.casosActivos}</b> casos</span>
          <span className="text-[12px] text-muted"><b className="font-semibold text-ink">{stats.audienciasProximas}</b> plazos</span>
          <span className="text-[12px] text-muted"><b className="font-semibold text-ink">{stats.clientesActivos}</b> clientes</span>
          <span className="text-[12px] text-muted"><b className="font-semibold text-ink">{stats.documentos}</b> documentos</span>
        </div>

        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mute2">Necesita tu atención</div>

        {!masUrgente ? (
          <div className="rounded-[12px] border border-border bg-surface py-8 text-center text-[13px] text-muted">
            Sin plazos próximos
          </div>
        ) : (
          <>
            {/* Bloque grande: lo más urgente */}
            <button
              onClick={() => navigate(`/casos/${masUrgente.caso_id}`)}
              className="mb-2 block w-full rounded-[12px] bg-accent p-4 text-left transition active:opacity-90"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Más urgente · {labelDias(diasUrgente)}
              </div>
              <div className="mt-1 text-[15px] font-semibold leading-snug text-white">{masUrgente.descripcion}</div>
              <div className="mt-0.5 text-[12px] text-white/80">
                {casosById.get(masUrgente.caso_id)?.titulo ?? masUrgente.tipo}
              </div>
            </button>

            {/* Resto: filas comprimidas */}
            {resto.length > 0 && (
              <div className="overflow-hidden rounded-[10px] border border-border">
                {resto.map((p, i) => {
                  const dias = diasRestantes(p.fecha)
                  const urgencia = clasificarUrgencia(dias)
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/casos/${p.caso_id}`)}
                      className={`flex w-full items-center justify-between gap-3 bg-surface px-3.5 py-2.5 text-left transition active:bg-soft ${i > 0 ? 'border-t border-border' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium text-ink">{p.descripcion}</div>
                        <div className="truncate text-[11px] text-mute2">{casosById.get(p.caso_id)?.titulo ?? p.tipo}</div>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${URGENCIA_CLASS[urgencia]}`}>{labelDias(dias)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
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
            <div className="mb-3 text-[13px] font-semibold text-ink">Carga por usuario</div>
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
              {personasByAbogado.size === 0 && <div className="text-[12px] text-mute2">Sin usuarios asignados.</div>}
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
