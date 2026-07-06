import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useDevice } from '@/context/DeviceModeContext'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Inicio' },
  { to: '/casos',     icon: 'ti-briefcase',        label: 'Casos'  },
  { to: '/agenda',    icon: 'ti-calendar',          label: 'Agenda' },
]

const MORE_LINKS = [
  { to: '/clientes',     icon: 'ti-users',          label: 'Clientes',      blocked: true  },
  { to: '/usuarios',     icon: 'ti-user-cog',       label: 'Usuarios',      blocked: true  },
  { to: '/drive',        icon: 'ti-brand-google-drive', label: 'Drive',     blocked: true  },
  { to: '/configuracion',icon: 'ti-settings',       label: 'Configuración', blocked: true  },
]

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setForceFullView } = useDevice()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMore = MORE_LINKS.some(l => pathname.startsWith(l.to))

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="flex h-[60px] flex-shrink-0 items-center border-t border-border bg-surface">
        {NAV.map(({ to, icon, label }) => {
          const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
          return (
            <NavLink key={to} to={to}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition ${active ? 'text-accent' : 'text-muted'}`}>
              <i className={`ti ${icon} text-[22px]`} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          )
        })}
        {/* Más */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition ${isMore || moreOpen ? 'text-accent' : 'text-muted'}`}>
          <i className="ti ti-dots text-[22px]" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-[60px] left-0 right-0 z-50 rounded-t-[20px] border-t border-border bg-surface px-4 pb-6 pt-4 shadow-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Otras secciones</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MORE_LINKS.map(({ to, icon, label, blocked }) => (
                <button key={to}
                  onClick={() => { navigate(to); setMoreOpen(false) }}
                  className="flex items-center gap-3 rounded-[10px] border border-border bg-bg px-3 py-3 text-left transition hover:bg-soft">
                  <i className={`ti ${icon} text-[18px] ${blocked ? 'text-muted' : 'text-ink'}`} />
                  <div>
                    <div className={`text-[13px] font-medium ${blocked ? 'text-muted' : 'text-ink'}`}>{label}</div>
                    {blocked && <div className="text-[10px] text-mute2">Solo escritorio</div>}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              <button
                onClick={() => { setForceFullView(true); setMoreOpen(false) }}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-soft">
                <i className="ti ti-device-desktop text-[18px] text-ink" />
                <div>
                  <div className="text-[13px] font-medium text-ink">Ver versión completa</div>
                  <div className="text-[10px] text-mute2">Accede a todas las funciones</div>
                </div>
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-danger-soft">
                <i className="ti ti-logout text-[18px] text-danger" />
                <div className="text-[13px] font-medium text-danger">Cerrar sesión</div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
