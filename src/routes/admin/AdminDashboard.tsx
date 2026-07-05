import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGlobalStats, getAdminWorkspaces, type GlobalStats, type WorkspaceStat } from '@/features/admin/adminApi'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGlobalStats(), getAdminWorkspaces()])
      .then(([s, ws]) => { setStats(s); setWorkspaces(ws) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-[13px] text-muted">Cargando…</div>

  const recientes = workspaces.slice(0, 5)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-ink">Dashboard</h1>
        <p className="mt-0.5 text-[12px] text-muted">Vista global de la plataforma TSADOQ</p>
      </div>

      {/* Métricas globales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="ti-building" label="Workspaces" value={stats?.workspaces ?? 0} color="accent" />
        <StatCard icon="ti-users" label="Usuarios" value={stats?.usuarios ?? 0} color="success" />
        <StatCard icon="ti-briefcase" label="Casos" value={stats?.casos ?? 0} color="warn" />
        <StatCard icon="ti-files" label="Documentos" value={stats?.documentos ?? 0} color="muted" />
      </div>

      {/* Workspaces recientes */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Workspaces recientes</h2>
          <button
            onClick={() => navigate('/admin/workspaces')}
            className="text-[12px] text-accent hover:underline"
          >
            Ver todos →
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-soft">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Workspace</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Plan</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Usuarios</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Casos</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map(ws => (
                <tr
                  key={ws.id}
                  onClick={() => navigate(`/admin/workspaces/${ws.id}`)}
                  className="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-soft"
                >
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-ink">{ws.nombre}</div>
                    <div className="text-[11px] text-mute2">{ws.owner_email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={ws.plan} />
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] text-ink">{ws.usuarios}</td>
                  <td className="px-4 py-3 text-right text-[13px] text-ink">{ws.casos}</td>
                  <td className="px-4 py-3 text-[12px] text-muted">
                    {new Date(ws.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-warn',
    muted: 'bg-soft text-muted',
  }
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] ${colorMap[color] ?? colorMap.muted}`}>
        <i className={`ti ${icon} text-[18px]`} />
      </div>
      <div className="text-[26px] font-bold tracking-tight text-ink">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-mute2">{label}</div>
    </div>
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    free: 'bg-soft text-muted border border-border',
    pro: 'bg-accent-soft text-accent',
    enterprise: 'bg-success-soft text-success',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${map[plan] ?? map.free}`}>
      {plan}
    </span>
  )
}
