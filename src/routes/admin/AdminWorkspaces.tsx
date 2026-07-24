import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminWorkspaces, toggleWorkspaceSuspended, type WorkspaceStat } from '@/features/admin/adminApi'
import { PlanBadge } from '@/routes/admin/AdminDashboard'

export default function AdminWorkspaces() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<WorkspaceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    getAdminWorkspaces()
      .then(setWorkspaces)
      .finally(() => setLoading(false))
  }, [])

  const filtered = workspaces.filter(ws =>
    ws.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (ws.owner_email ?? '').toLowerCase().includes(query.toLowerCase()) ||
    (ws.owner_nombre ?? '').toLowerCase().includes(query.toLowerCase())
  )

  async function handleToggleSuspend(ws: WorkspaceStat, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`¿${ws.suspended ? 'Reactivar' : 'Suspender'} el workspace "${ws.nombre}"?`)) return
    setToggling(ws.id)
    try {
      await toggleWorkspaceSuspended(ws.id, !ws.suspended)
      setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, suspended: !ws.suspended } : w))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-ink">Workspaces</h1>
          <p className="mt-0.5 text-[12px] text-muted">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2 focus-within:border-accent">
        <i className="ti ti-search text-[15px] text-mute2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email del propietario…"
          className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-mute2"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-mute2 hover:text-ink">
            <i className="ti ti-x text-[13px]" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-[13px] text-muted">Cargando workspaces…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-muted">Sin resultados.</div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-soft">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Workspace</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Plan</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Usuarios</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Casos</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Docs</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Creado</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Estado</th>
                <th className="w-[80px] px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(ws => (
                <tr
                  key={ws.id}
                  onClick={() => navigate(`/admin/workspaces/${ws.id}`)}
                  className={`cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-soft ${ws.suspended ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-ink">{ws.nombre}</div>
                    <div className="text-[11px] text-mute2">
                      {ws.owner_nombre ?? '—'}{ws.owner_email ? ` · ${ws.owner_email}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={ws.plan} /></td>
                  <td className="px-4 py-3 text-right text-[13px] text-ink">
                    <span className={ws.usuarios > ws.limite_usuarios ? 'font-semibold text-warn' : ''}>{ws.usuarios}</span>
                    <span className="text-mute2">/{ws.limite_usuarios}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] text-ink">{ws.casos}</td>
                  <td className="px-4 py-3 text-right text-[13px] text-ink">{ws.documentos}</td>
                  <td className="px-4 py-3 text-[12px] text-muted">
                    {new Date(ws.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    {ws.suspended ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">Suspendido</span>
                    ) : (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Activo</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={toggling === ws.id}
                      onClick={e => handleToggleSuspend(ws, e)}
                      className={`rounded-[6px] px-2.5 py-1 text-[11px] transition disabled:opacity-50 ${
                        ws.suspended
                          ? 'border border-border text-muted hover:bg-success-soft hover:text-success'
                          : 'border border-border text-muted hover:bg-danger-soft hover:text-danger'
                      }`}
                    >
                      {toggling === ws.id ? '…' : ws.suspended ? 'Reactivar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
