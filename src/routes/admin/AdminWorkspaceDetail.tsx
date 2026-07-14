import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getWorkspaceDetail, toggleWorkspaceSuspended,
  getWorkspacePagos, activarPlan, generarPeriodo, registrarPago, setWorkspacePlan,
  type WorkspaceDetail, type PagoPeriodo,
} from '@/features/admin/adminApi'
import { PlanBadge } from '@/routes/admin/AdminDashboard'

const ESTADO_COLOR: Record<string, string> = {
  pagado:    'bg-success-soft text-success',
  pendiente: 'bg-warn-soft text-warn',
  vencido:   'bg-danger-soft text-danger',
}

export default function AdminWorkspaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'info'

  const [detail, setDetail] = useState<WorkspaceDetail | null>(null)
  const [pagos, setPagos] = useState<PagoPeriodo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Activar plan form
  const [activarMonto, setActivarMonto] = useState('')
  const [activarInicio, setActivarInicio] = useState(new Date().toISOString().slice(0, 10))
  const [activarPlanSel, setActivarPlanSel] = useState('pro')

  // Registrar pago
  const [pagoId, setPagoId] = useState<string | null>(null)
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().slice(0, 10))
  const [pagoNotas, setPagoNotas] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([getWorkspaceDetail(id), getWorkspacePagos(id)])
      .then(([d, p]) => {
        setDetail(d)
        setPagos(p)
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleToggleSuspend() {
    if (!id || !detail) return
    const { suspended } = detail.workspace
    if (!confirm(`¿${suspended ? 'Reactivar' : 'Suspender'} este workspace?`)) return
    setSaving(true)
    try {
      await toggleWorkspaceSuspended(id, !suspended)
      setDetail(prev => prev ? { ...prev, workspace: { ...prev.workspace, suspended: !suspended } } : prev)
    } finally { setSaving(false) }
  }

  async function handleActivarPlan() {
    if (!id) return
    const monto = parseFloat(activarMonto)
    if (isNaN(monto) || monto <= 0) return alert('Ingresa un monto válido')
    if (!confirm(`¿Activar plan ${activarPlanSel} a $${monto}/mes desde ${activarInicio}?`)) return
    setSaving(true)
    try {
      await activarPlan(id, activarPlanSel, monto, activarInicio)
      const [d, p] = await Promise.all([getWorkspaceDetail(id), getWorkspacePagos(id)])
      setDetail(d); setPagos(p)
    } finally { setSaving(false) }
  }

  // Plan demo (oculto, sin facturación): acceso completo tipo Enterprise
  // para cuentas de prueba antes del lanzamiento — no pasa por el flujo de
  // pago, no genera período de suscripción ni aparece en Facturación.
  async function handleAsignarDemo() {
    if (!id) return
    if (!confirm('¿Asignar el plan demo (acceso completo, sin facturación) a este workspace?')) return
    setSaving(true)
    try {
      await setWorkspacePlan(id, 'demo_enterprise')
      const d = await getWorkspaceDetail(id)
      setDetail(d)
    } finally { setSaving(false) }
  }

  async function handleGenerarPeriodo() {
    if (!id) return
    setSaving(true)
    try {
      await generarPeriodo(id)
      setPagos(await getWorkspacePagos(id))
    } finally { setSaving(false) }
  }

  async function handleRegistrarPago() {
    if (!pagoId) return
    setSaving(true)
    try {
      await registrarPago(pagoId, pagoFecha, pagoNotas || undefined)
      setPagos(await getWorkspacePagos(id!))
      setPagoId(null); setPagoNotas('')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-[13px] text-muted">Cargando…</div>
  if (!detail) return <div className="p-6 text-[13px] text-danger">Workspace no encontrado.</div>

  const { workspace, usuarios, stats } = detail
  const tienePlan = workspace.plan !== 'free'

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/workspaces')}
            className="mb-2 flex items-center gap-1 text-[12px] text-muted hover:text-ink">
            <i className="ti ti-arrow-left text-[13px]" /> Volver
          </button>
          <h1 className="text-[18px] font-bold text-ink">{workspace.nombre}</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Creado el {new Date(workspace.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workspace.suspended && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[10px] font-semibold text-danger">Suspendido</span>}
          <PlanBadge plan={workspace.plan} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {['info', 'pagos'].map(t => (
          <button key={t} onClick={() => setSearchParams({ tab: t })}
            className={`px-4 py-2 text-[13px] font-medium capitalize transition border-b-2 -mb-px ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
            }`}>
            {t === 'info' ? 'Información' : 'Pagos'}
            {t === 'pagos' && pagos.some(p => p.estado === 'pendiente') && (
              <span className="ml-1.5 rounded-full bg-warn px-1.5 py-0.5 text-[9px] font-bold text-white">
                {pagos.filter(p => p.estado === 'pendiente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Casos', value: stats.casos, icon: 'ti-briefcase' },
                { label: 'Documentos', value: stats.documentos, icon: 'ti-files' },
                { label: 'Clientes', value: stats.clientes, icon: 'ti-users' },
                { label: 'Tareas', value: stats.tareas, icon: 'ti-checkbox' },
              ].map(m => (
                <div key={m.label} className="rounded-[10px] border border-border bg-surface p-4">
                  <i className={`ti ${m.icon} mb-2 text-[18px] text-mute2`} />
                  <div className="text-[22px] font-bold text-ink">{m.value}</div>
                  <div className="text-[11px] text-muted">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Usuarios */}
            <div className="rounded-[10px] border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-semibold text-ink">Usuarios ({usuarios?.length ?? 0})</h2>
              </div>
              {!usuarios || usuarios.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted">Sin usuarios.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-soft">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-mute2">Nombre</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-mute2">Email</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-mute2">Rol</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-mute2">Desde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 text-[12px] font-medium text-ink">{u.nombre}</td>
                        <td className="px-4 py-2.5 text-[12px] text-muted">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.rol === 'admin' ? 'bg-accent-soft text-accent' : 'bg-soft text-muted'}`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted">
                          {new Date(u.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Lateral */}
          <div className="space-y-4">
            <div className="rounded-[10px] border border-border bg-surface p-4">
              <h3 className="mb-1 text-[12px] font-semibold text-ink">Estado</h3>
              <p className="mb-3 text-[11px] text-muted">
                {workspace.suspended ? 'Workspace suspendido.' : 'Activo y operativo.'}
              </p>
              <button disabled={saving} onClick={handleToggleSuspend}
                className={`w-full rounded-[6px] py-1.5 text-[12px] font-semibold transition disabled:opacity-40 ${
                  workspace.suspended ? 'bg-success text-white hover:opacity-90' : 'border border-danger text-danger hover:bg-danger-soft'
                }`}>
                {saving ? '…' : workspace.suspended ? 'Reactivar workspace' : 'Suspender workspace'}
              </button>
            </div>

            <div className="rounded-[10px] border border-border bg-surface p-4 space-y-2">
              <h3 className="text-[12px] font-semibold text-ink">Info técnica</h3>
              <div className="text-[11px] text-muted"><span className="font-medium text-ink">ID:</span> <span className="font-mono break-all">{workspace.id}</span></div>
              <div className="text-[11px] text-muted"><span className="font-medium text-ink">Notif. email:</span> {workspace.notif_email ? 'Activadas' : 'Desactivadas'}</div>
              <div className="text-[11px] text-muted"><span className="font-medium text-ink">Días anticipación:</span> {workspace.dias_anticipacion}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pagos' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Historial de pagos */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink">Períodos de pago</h2>
              {tienePlan && (
                <button disabled={saving} onClick={handleGenerarPeriodo}
                  className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft disabled:opacity-40">
                  <i className="ti ti-plus text-[13px]" /> Nuevo período
                </button>
              )}
            </div>

            {pagos.length === 0 ? (
              <div className="rounded-[10px] border border-border bg-surface py-10 text-center text-[13px] text-muted">
                {tienePlan ? 'Sin períodos registrados.' : 'Plan free — activa un plan de pago para registrar períodos.'}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-soft">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Período</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Monto</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Estado</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Fecha pago</th>
                      <th className="w-[100px] px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map(p => (
                      <tr key={p.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 text-[12px] text-ink">
                          {fmtDate(p.periodo_inicio)} – {fmtDate(p.periodo_fin)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold text-ink">
                          ${Number(p.monto).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ESTADO_COLOR[p.estado]}`}>
                            {p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted">
                          {p.fecha_pago ? fmtDate(p.fecha_pago) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.estado !== 'pagado' && (
                            <button onClick={() => { setPagoId(p.id); setPagoFecha(new Date().toISOString().slice(0, 10)) }}
                              className="rounded-[6px] bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent hover:text-white">
                              Marcar pagado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lateral — activar plan / confirmar pago */}
          <div className="space-y-4">
            {/* Activar plan */}
            <div className="rounded-[10px] border border-border bg-surface p-4">
              <h3 className="mb-3 text-[12px] font-semibold text-ink">
                {tienePlan ? 'Modificar plan' : 'Activar plan de pago'}
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] text-muted">Plan</label>
                  <div className="flex flex-col gap-1.5">
                    {['pro', 'enterprise'].map(p => (
                      <label key={p} className="flex cursor-pointer items-center gap-2">
                        <input type="radio" name="activar_plan" value={p}
                          checked={activarPlanSel === p} onChange={() => setActivarPlanSel(p)}
                          className="accent-accent" />
                        <PlanBadge plan={p} />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted">Monto mensual ($)</label>
                  <input type="number" min="0" step="0.01" value={activarMonto}
                    onChange={e => setActivarMonto(e.target.value)}
                    placeholder="Ej: 29.99"
                    className="w-full rounded-[6px] border border-border bg-bg px-3 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted">Fecha de inicio</label>
                  <input type="date" value={activarInicio} onChange={e => setActivarInicio(e.target.value)}
                    className="w-full rounded-[6px] border border-border bg-bg px-3 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                </div>
                <button disabled={saving || !activarMonto} onClick={handleActivarPlan}
                  className="mt-1 w-full rounded-[6px] bg-accent py-1.5 text-[12px] font-semibold text-white transition disabled:opacity-40 hover:opacity-90">
                  {saving ? '…' : tienePlan ? 'Actualizar plan' : 'Activar plan'}
                </button>
              </div>
            </div>

            {/* Plan demo oculto, sin facturación — para cuentas de prueba pre-lanzamiento */}
            <div className="rounded-[10px] border border-dashed border-purple bg-surface p-4">
              <h3 className="mb-1 text-[12px] font-semibold text-ink">Plan demo (interno)</h3>
              <p className="mb-3 text-[11px] text-mute2">
                Acceso completo tipo Enterprise, sin generar cobro ni aparecer en Facturación. Solo para cuentas de
                prueba antes del lanzamiento.
              </p>
              <button disabled={saving || workspace.plan === 'demo_enterprise'} onClick={handleAsignarDemo}
                className="w-full rounded-[6px] border border-purple py-1.5 text-[12px] font-semibold text-purple transition disabled:opacity-40 hover:bg-purple-soft">
                {workspace.plan === 'demo_enterprise' ? 'Ya tiene el plan demo' : 'Asignar plan demo'}
              </button>
            </div>

            {/* Modal inline: registrar pago */}
            {pagoId && (
              <div className="rounded-[10px] border border-accent bg-surface p-4">
                <h3 className="mb-3 text-[12px] font-semibold text-ink">Registrar pago</h3>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted">Fecha de pago</label>
                    <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                      className="w-full rounded-[6px] border border-border bg-bg px-3 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted">Notas (opcional)</label>
                    <input value={pagoNotas} onChange={e => setPagoNotas(e.target.value)}
                      placeholder="Transferencia, PayPal…"
                      className="w-full rounded-[6px] border border-border bg-bg px-3 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPagoId(null); setPagoNotas('') }}
                      className="flex-1 rounded-[6px] border border-border py-1.5 text-[12px] text-muted hover:bg-soft">
                      Cancelar
                    </button>
                    <button disabled={saving} onClick={handleRegistrarPago}
                      className="flex-1 rounded-[6px] bg-success py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 hover:opacity-90">
                      {saving ? '…' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}
