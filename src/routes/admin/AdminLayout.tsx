import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { isSuperadmin } from '@/features/admin/adminApi'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login', { replace: true }); return }
      const ok = await isSuperadmin()
      if (!ok) { navigate('/dashboard', { replace: true }); return }
      setEmail(user.email ?? null)
      setChecking(false)
    }
    check()
  }, [navigate])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-muted">
        Verificando acceso…
      </div>
    )
  }

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13px] transition ${
      isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-soft hover:text-ink'
    }`

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar admin */}
      <nav className="flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-border bg-surface">
        {/* Logo */}
        <div className="flex h-[52px] items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-danger text-white">
            <i className="ti ti-shield-lock text-[15px]" />
          </div>
          <div>
            <div className="text-[13px] font-bold leading-tight text-ink">TSADOQ</div>
            <div className="text-[10px] leading-tight text-danger font-semibold uppercase tracking-wide">Superadmin</div>
          </div>
        </div>

        {/* Navegación */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-mute2">Panel</div>
          <NavLink to="/admin/dashboard" className={navItem}>
            <i className="ti ti-layout-dashboard text-[16px]" /> Dashboard
          </NavLink>
          <NavLink to="/admin/workspaces" className={navItem}>
            <i className="ti ti-building text-[16px]" /> Workspaces
          </NavLink>
        </div>

        {/* Pie: email + volver */}
        <div className="border-t border-border p-3 space-y-1">
          <div className="px-1 text-[11px] text-mute2 truncate">{email}</div>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] text-muted transition hover:bg-soft hover:text-ink"
          >
            <i className="ti ti-arrow-left text-[14px]" /> Volver a la app
          </NavLink>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <i className="ti ti-logout text-[14px]" /> Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar admin */}
        <div className="flex h-[52px] flex-shrink-0 items-center border-b border-border bg-surface px-5">
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Admin
            </span>
            <span className="text-[13px] font-semibold text-ink">Panel de administración</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
