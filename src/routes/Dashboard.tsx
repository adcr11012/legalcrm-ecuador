import { useCallback, useEffect, useState } from 'react'
import { listCasos } from '@/features/casos/api'
import { listPersonasForCasos } from '@/features/casos/personasApi'
import { listHistorialReciente } from '@/features/casos/historialApi'
import { countDocumentos } from '@/features/casos/documentosApi'
import { countAudienciasProximas } from '@/features/casos/plazosApi'
import { countClientesActivos } from '@/features/clientes/api'
import { listWorkspaceUsers } from '@/features/users/api'
import { ACCION_COLOR, ACCION_LABEL } from '@/features/casos/historialLabels'
import { ESTADO_LABEL } from '@/features/casos/estado'
import { nombrePersona } from '@/features/casos/personaDisplay'
import type { Caso, CasoPersona, EstadoCaso, HistorialEntry, Usuario } from '@/types/database'

type Stats = {
  casosActivos: number
  audienciasProximas: number
  clientesActivos: number
  documentos: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [casosById, setCasosById] = useState<Map<string, Caso>>(new Map())
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [personasByAbogado, setPersonasByAbogado] = useState<Map<string, CasoPersona[]>>(new Map())
  const [distEstado, setDistEstado] = useState<Record<EstadoCaso, number>>({} as Record<EstadoCaso, number>)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [casos, users, hist, audiencias, clientesActivos, documentos] = await Promise.all([
        listCasos(),
        listWorkspaceUsers(),
        listHistorialReciente(10),
        countAudienciasProximas(7),
        countClientesActivos(),
        countDocumentos(),
      ])

      const personas = await listPersonasForCasos(casos.map((c) => c.id))

      setCasosById(new Map(casos.map((c) => [c.id, c])))
      setUsersById(new Map(users.map((u) => [u.id, u])))
      setHistorial(hist)

      const dist: Record<string, number> = {}
      for (const c of casos) dist[c.estado] = (dist[c.estado] ?? 0) + 1
      setDistEstado(dist as Record<EstadoCaso, number>)

      const porAbogado = new Map<string, CasoPersona[]>()
      for (const p of personas) {
        if (p.rol !== 'abogado') continue
        const key = p.user_id ?? p.nombre_externo ?? p.id
        porAbogado.set(key, [...(porAbogado.get(key) ?? []), p])
      }
      setPersonasByAbogado(porAbogado)

      setStats({
        casosActivos: casos.filter((c) => c.estado === 'activo').length,
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

  const maxCarga = Math.max(1, ...Array.from(personasByAbogado.values()).map((v) => v.length))

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Casos activos" value={stats.casosActivos} />
        <StatCard label="Audiencias próximas" value={stats.audienciasProximas} valueClass="text-danger" hint="Próximos 7 días" />
        <StatCard label="Clientes activos" value={stats.clientesActivos} />
        <StatCard label="Documentos en Drive" value={stats.documentos} />
      </div>

      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-4">
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
                  <div className="h-1.5 w-20 flex-shrink-0 rounded-full bg-[#f2f1ee]">
                    <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(personas.length / maxCarga) * 100}%` }} />
                  </div>
                </div>
              ))}
              {personasByAbogado.size === 0 && <div className="text-[12px] text-mute2">Sin abogados asignados.</div>}
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">Casos por estado</div>
            <div className="flex gap-2 text-center">
              {(Object.keys(ESTADO_LABEL) as EstadoCaso[]).map((estado) => (
                <div key={estado} className="flex-1">
                  <div className="text-[18px] font-bold text-ink">{distEstado[estado] ?? 0}</div>
                  <div className="text-[10px] text-mute2">{ESTADO_LABEL[estado]}</div>
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
