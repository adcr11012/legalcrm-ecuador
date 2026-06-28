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
  { to: '/configuracion', icon: 'ti-settings', label: 'Configuración' },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Sidebar() {
  const { profile, signOut } = useAuth()

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 mx-1.5 text-[13px] transition-colors ${
      isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-[#f2f1ee] hover:text-ink'
    }`

  return (
    <nav className="flex h-screen w-[220px] min-w-[220px] flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 pb-3.5 pt-4.5">
        <div className="text-[13px] font-bold text-accent">LegalCRM Ecuador</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-mute2">Workspace</div>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Principal</div>
        {PRINCIPAL.map((item) => (
          <NavLink key={item.to} to={item.to} className={navItemClass}>
            <i className={`ti ${item.icon} text-[16px]`} />
            {item.label}
          </NavLink>
        ))}

        <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Workspace</div>
        {WORKSPACE.map((item) => (
          <NavLink key={item.to} to={item.to} className={navItemClass}>
            <i className={`ti ${item.icon} text-[16px]`} />
            {item.label}
          </NavLink>
        ))}
      </div>

      {profile && (
        <div className="border-t border-border p-2">
          <div className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5">
            <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {initials(profile.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-ink">{profile.nombre}</div>
              <div className="text-[10px] text-mute2">{profile.es_admin ? 'Administrador' : 'Miembro'}</div>
            </div>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-mute2 transition hover:bg-[#f2f1ee] hover:text-ink"
            >
              <i className="ti ti-logout text-[15px]" />
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
