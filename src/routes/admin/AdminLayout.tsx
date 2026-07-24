import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { isSuperadmin } from '@/features/admin/adminApi'
import { useDevice } from '@/context/DeviceModeContext'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { isMobile, setForceFullView } = useDevice()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [ticketsAbiertos, setTicketsAbiertos] = useState(0)
  const [menuAbierto, setMenuAbierto] = useState(false)

  function volverALaApp() {
    setForceFullView(false)
    navigate('/dashboard')
  }

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

  useEffect(() => {
    if (checking) return
    supabase
      .from('tickets_soporte')
      .select('id', { count: 'exact', head: true })
      .neq('estado', 'cerrado')
      .then(({ count }) => setTicketsAbiertos(count ?? 0))
  }, [checking])

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

  const navLinks = (
    <>
      <NavLink to="/admin/dashboard" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-layout-dashboard text-[16px]" /> Dashboard
      </NavLink>
      <NavLink to="/admin/workspaces" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-building text-[16px]" /> Workspaces
      </NavLink>
      <NavLink to="/admin/billing" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-credit-card text-[16px]" /> Facturación
      </NavLink>
      <NavLink to="/admin/laboral" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-calculator text-[16px]" /> Calculadora (SBU / Feriados)
      </NavLink>
      <NavLink to="/admin/esatje" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-gavel text-[16px]" /> eSATJE
      </NavLink>
      <NavLink to="/admin/soporte" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-lifebuoy text-[16px]" /> Soporte
        {ticketsAbiertos > 0 && (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {ticketsAbiertos}
          </span>
        )}
      </NavLink>
      <NavLink to="/admin/referidos" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-gift text-[16px]" /> Referidos
      </NavLink>
      <NavLink to="/admin/superadmins" className={navItem} onClick={() => setMenuAbierto(false)}>
        <i className="ti ti-shield-lock text-[16px]" /> Superadmins
      </NavLink>
    </>
  )

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar admin — fija en desktop, cajón deslizable en mobile */}
      <nav
        className={`flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-border bg-surface transition-transform ${
          isMobile ? `fixed inset-y-0 left-0 z-[250] ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}` : ''
        }`}
      >
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
          {navLinks}
        </div>

        {/* Pie: email + volver */}
        <div className="border-t border-border p-3 space-y-1">
          <div className="px-1 text-[11px] text-mute2 truncate">{email}</div>
          <button
            onClick={volverALaApp}
            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] text-muted transition hover:bg-soft hover:text-ink"
          >
            <i className="ti ti-arrow-left text-[14px]" /> Volver a la app
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <i className="ti ti-logout text-[14px]" /> Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Fondo oscuro del cajón mobile */}
      {isMobile && menuAbierto && (
        <div className="fixed inset-0 z-[240] bg-black/40" onClick={() => setMenuAbierto(false)} />
      )}

      {/* Contenido */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar admin */}
        <div className="flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-5">
          {isMobile && (
            <button
              onClick={() => setMenuAbierto(true)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft"
            >
              <i className="ti ti-menu-2 text-[18px]" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex-shrink-0 rounded-[4px] bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Admin
            </span>
            <span className="truncate text-[13px] font-semibold text-ink">Panel de administración</span>
          </div>
          {isMobile && (
            <button
              onClick={volverALaApp}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-[12px] font-medium text-white"
            >
              <i className="ti ti-arrow-left text-[14px]" /> Salir
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
