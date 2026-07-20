import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useDevice } from '@/context/DeviceModeContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

const NAV = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Inicio' },
  { to: '/casos',     icon: 'ti-briefcase',        label: 'Casos'  },
  { to: '/agenda',    icon: 'ti-calendar',          label: 'Agenda' },
]

type MoreLink = { to: string; icon: string; label: string; blocked?: boolean; soloAdmin?: boolean }

const MORE_LINKS: MoreLink[] = [
  { to: '/clientes',      icon: 'ti-users',         label: 'Clientes' },
  { to: '/buscar',        icon: 'ti-search',        label: 'Buscar / Reportes' },
  { to: '/calculadora',   icon: 'ti-calculator',    label: 'Calculadora' },
  { to: '/soporte',       icon: 'ti-lifebuoy',      label: 'Soporte' },
  { to: '/anuncios',      icon: 'ti-speakerphone',  label: 'Anuncios',      soloAdmin: true },
  { to: '/usuarios',      icon: 'ti-user-cog',      label: 'Usuarios',      soloAdmin: true },
  { to: '/configuracion', icon: 'ti-settings',      label: 'Configuración', soloAdmin: true },
]

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setForceFullView } = useDevice()
  const { profile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const links = MORE_LINKS.filter((l) => !l.soloAdmin || profile?.rol === 'administrador')

  const isMore = links.some(l => pathname.startsWith(l.to))

  return (
    <>
      {/* Barra inferior — parte normal del layout flex (no "fixed"), para que
          el contenido scrolleable de cada pantalla reserve espacio real y no
          quede tapado detrás. */}
      <nav className="relative z-40 flex min-h-[60px] flex-shrink-0 items-center border-t border-border bg-surface"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(({ to, icon, label }) => {
          const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
          return (
            <NavLink key={to} to={to}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition ${active ? 'text-accent' : 'text-muted'}`}>
              <i className={`ti ${icon} text-[22px]`} />
              <span className="text-[11px] font-medium">{label}</span>
            </NavLink>
          )
        })}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition ${isMore || moreOpen ? 'text-accent' : 'text-muted'}`}>
          <i className="ti ti-dots text-[22px]" />
          <span className="text-[11px] font-medium">Más</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-[60px] left-0 right-0 z-50 rounded-t-[20px] border-t border-border bg-surface px-4 pb-6 pt-4 shadow-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Otras secciones</div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {links.map(({ to, icon, label, blocked }) => (
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
            <div className="space-y-1 border-t border-border pt-3">
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
