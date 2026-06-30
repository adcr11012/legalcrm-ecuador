import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'

const PRINCIPAL = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/casos', icon: 'ti-briefcase', label: 'Casos' },
  { to: '/clientes', icon: 'ti-users', label: 'Clientes' },
  { to: '/agenda', icon: 'ti-calendar', label: 'Agenda' },
]

const WORKSPACE = [
  { to: '/usuarios', icon: 'ti-user-shield', label: 'Usuarios y roles' },
  { to: '/drive', icon: 'ti-brand-google-drive', label: 'Google Drive' },
  { to: '/configuracion', icon: 'ti-settings', label: 'Configuración', soloAdmin: true },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, signOut } = useAuth()

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 mx-1.5 text-[13px] transition-colors ${
      open ? '' : 'justify-center px-0'
    } ${isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-soft hover:text-ink'}`

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-[150] bg-black/35 lg:hidden" />}
      <nav
        className={`flex h-screen flex-shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 ${
          open ? 'fixed inset-y-0 left-0 z-[160] w-[240px] lg:static lg:w-[220px]' : 'static z-auto w-[60px]'
        }`}
      >
        <div className={`flex items-center border-b border-border pb-3.5 pt-4.5 ${open ? 'justify-between px-4' : 'justify-center px-1'}`}>
          {open ? (
            <img src="/LOGO.png" alt="TSADOQ" className="h-10 w-auto" />
          ) : (
            <img src="/LOGO.png" alt="TSADOQ" className="h-8 w-auto" />
          )}
          {open && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-mute2 transition hover:bg-soft hover:text-ink lg:hidden"
            >
              <i className="ti ti-x text-[15px]" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5">
          {open && (
            <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Principal</div>
          )}
          {PRINCIPAL.map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label} className={navItemClass} onClick={() => onClose()}>
              <i className={`ti ${item.icon} flex-shrink-0 text-[16px]`} />
              {open && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

          {open && (
            <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Workspace</div>
          )}
          {!open && <div className="my-2 border-t border-border" />}
          {WORKSPACE.filter((item) => !item.soloAdmin || profile?.rol === 'administrador').map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label} className={navItemClass} onClick={() => onClose()}>
              <i className={`ti ${item.icon} flex-shrink-0 text-[16px]`} />
              {open && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {profile && (
          <div className="border-t border-border p-2">
            <div className={`flex items-center gap-2 rounded-[6px] py-1.5 ${open ? 'px-2.5' : 'justify-center px-0'}`}>
              <div
                title={profile.nombre}
                className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent"
              >
                {initials(profile.nombre)}
              </div>
              {open && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-ink">{profile.nombre}</div>
                    <div className="text-[10px] text-mute2 capitalize">{profile.rol}</div>
                  </div>
                  <button
                    onClick={signOut}
                    title="Cerrar sesión"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-mute2 transition hover:bg-soft hover:text-ink"
                  >
                    <i className="ti ti-logout text-[15px]" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
