import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBillingGlobal, getAdminWorkspaces, type BillingGlobal, type WorkspaceStat } from '@/features/admin/adminApi'
import { PlanBadge } from '@/routes/admin/AdminDashboard'

export default function AdminBilling() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<BillingGlobal | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBillingGlobal(), getAdminWorkspaces()])
      .then(([b, ws]) => {
        setBilling(b)
        setWorkspaces(ws.filter(w => w.plan !== 'free' && w.plan !== 'demo_enterprise'))
      })
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => `$${Number(n ?? 0).toFixed(2)}`

  if (loading) return <div className="p-6 text-[13px] text-muted">Cargando…</div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-ink">Facturación</h1>
        <p className="mt-0.5 text-[12px] text-muted">Control financiero de planes de pago</p>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <BillingCard label="Cobrado este mes" value={fmt(billing?.cobrado_mes ?? 0)} color="success" icon="ti-circle-check" />
        <BillingCard label="Pendiente este mes" value={fmt(billing?.pendiente_mes ?? 0)} color="warn" icon="ti-clock" />
        <BillingCard label="Vencidos" value={fmt(billing?.vencidos ?? 0)} color="danger" icon="ti-alert-circle" />
        <BillingCard label="Total año" value={fmt(billing?.total_anio ?? 0)} color="accent" icon="ti-chart-bar" />
      </div>

      {/* Workspaces con plan de pago */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-ink">Workspaces con plan activo</h2>
        {workspaces.length === 0 ? (
          <div className="rounded-[10px] border border-border bg-surface py-10 text-center text-[13px] text-muted">
            No hay workspaces con plan de pago aún.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-soft">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Workspace</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Plan</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Propietario</th>
                  <th className="w-[120px] px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {workspaces.map(ws => (
                  <tr
                    key={ws.id}
                    onClick={() => navigate(`/admin/workspaces/${ws.id}?tab=pagos`)}
                    className="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-soft"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{ws.nombre}</td>
                    <td className="px-4 py-3"><PlanBadge plan={ws.plan} /></td>
                    <td className="px-4 py-3 text-[12px] text-muted">{ws.owner_email ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[12px] text-accent hover:underline">Ver pagos →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function BillingCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const colorMap: Record<string, string> = {
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    accent: 'bg-accent-soft text-accent',
  }
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] ${colorMap[color]}`}>
        <i className={`ti ${icon} text-[18px]`} />
      </div>
      <div className="text-[24px] font-bold tracking-tight text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-mute2">{label}</div>
    </div>
  )
}
