import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getDriveEstado } from '@/features/workspace/driveApi'
import { getGroqEstado } from '@/features/workspace/groqApi'
import { getOpenRouterEstado } from '@/features/workspace/openrouterApi'
import { isSuperadmin } from '@/features/admin/adminApi'
import { VideoLogoModal } from '@/components/VideoLogoModal'

const PRINCIPAL = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/casos', icon: 'ti-briefcase', label: 'Casos' },
  { to: '/clientes', icon: 'ti-users', label: 'Clientes' },
  { to: '/agenda', icon: 'ti-calendar', label: 'Agenda' },
  { to: '/buscar', icon: 'ti-search', label: 'Buscar / Reportes' },
  { to: '/soporte', icon: 'ti-lifebuoy', label: 'Soporte' },
  { to: '/calculadora-laboral', icon: 'ti-calculator', label: 'Calc. Laboral' },
]

const WORKSPACE = [
  { to: '/usuarios', icon: 'ti-user-shield', label: 'Usuarios y roles', soloAdmin: true },
  { to: '/anuncios', icon: 'ti-speakerphone', label: 'Anuncios', soloAdmin: true },
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

function useServiciosEstado() {
  const [drive, setDrive] = useState<boolean | null>(null)
  const [groq, setGroq] = useState<boolean | null>(null)
  const [openrouter, setOpenRouter] = useState<boolean | null>(null)

  useEffect(() => {
    getDriveEstado().then((e) => setDrive(e.conectado)).catch(() => setDrive(false))
    getGroqEstado().then((e) => setGroq(e.conectado)).catch(() => setGroq(false))
    getOpenRouterEstado().then((e) => setOpenRouter(e.conectado)).catch(() => setOpenRouter(false))
  }, [])

  return { drive, groq, openrouter }
}

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { profile, signOut } = useAuth()
  const servicios = useServiciosEstado()
  const navigate = useNavigate()
  const [videoAbierto, setVideoAbierto] = useState(false)
  const [esSuperadmin, setEsSuperadmin] = useState(false)

  useEffect(() => {
    isSuperadmin().then(setEsSuperadmin)
  }, [])

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 mx-1.5 text-[13px] transition-colors ${
      open ? '' : 'justify-center px-0'
    } ${isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-soft hover:text-ink'}`

  return (
    <>
      {open && <div onClick={onToggle} className="fixed inset-0 z-[150] bg-black/35 lg:hidden" />}
      <nav
        className={`flex h-screen flex-shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 ${
          open ? 'fixed inset-y-0 left-0 z-[160] w-[240px] lg:static lg:w-[220px]' : 'static z-auto w-[60px]'
        }`}
      >
        <div className={`flex h-[52px] flex-shrink-0 items-center border-b border-border ${open ? 'gap-2.5 px-3' : 'justify-center px-1'}`}>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink"
            title={open ? 'Colapsar menú' : 'Expandir menú'}
          >
            <i className="ti ti-menu-2 text-[18px]" />
          </button>
          {open && (
            <>
              <button onClick={() => setVideoAbierto(true)} title="Ver video de TSADOQ">
                <img src="/LOGO.png" alt="TSADOQ" className="h-7 w-auto object-contain" />
              </button>
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-tight text-ink">TSADOQ</div>
                <div className="text-[10px] leading-tight text-mute2">Gestor de casos</div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5">
          {open && (
            <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Principal</div>
          )}
          {PRINCIPAL.map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label} className={navItemClass}>
              <i className={`ti ${item.icon} flex-shrink-0 text-[16px]`} />
              {open && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

          {open && (
            <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-mute2">Workspace</div>
          )}
          {!open && <div className="my-2 border-t border-border" />}
          {WORKSPACE.filter((item) => !item.soloAdmin || profile?.rol === 'administrador').map((item) => (
            <NavLink key={item.to} to={item.to} title={item.soloAdmin ? `${item.label} (ADMIN)` : item.label} className={navItemClass}>
              <i className={`ti ${item.icon} flex-shrink-0 text-[16px]`} />
              {open && (
                <span className="truncate">
                  {item.label}
                  {item.soloAdmin && <span className="ml-1 text-[10px] font-normal text-mute2">(ADMIN)</span>}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className={`border-t border-border px-3 py-2 ${open ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'}`}>
          {[
            { key: 'drive', icon: 'ti-brand-google-drive', label: 'Drive', estado: servicios.drive },
            { key: 'groq', icon: 'ti-brain', label: 'IA', estado: servicios.groq },
            { key: 'openrouter', icon: 'ti-eye', label: 'Visión', estado: servicios.openrouter },
          ].map(({ key, icon, label, estado }) => (
            <div
              key={key}
              title={`${label}: ${estado === null ? 'verificando…' : estado ? 'Conectado' : 'No conectado'}`}
              className="relative flex items-center justify-center"
            >
              <i className={`ti ${icon} text-[16px] ${estado ? 'text-mute2' : 'text-mute2/50'}`} />
              <span
                className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface ${
                  estado === null ? 'bg-mute2' : estado ? 'bg-success' : 'bg-danger'
                }`}
              />
              {open && <span className="ml-1.5 text-[11px] text-mute2">{label}</span>}
            </div>
          ))}
        </div>

        {profile && (
          <div className="border-t border-border p-2">
            <div className={`flex items-center gap-2 rounded-[6px] py-1.5 ${open ? 'px-2.5' : 'justify-center px-0'}`}>
              {esSuperadmin ? (
                <button
                  onClick={() => navigate('/admin')}
                  title="Panel de superadmin"
                  className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent transition hover:ring-2 hover:ring-accent"
                >
                  {initials(profile.nombre)}
                </button>
              ) : (
                <div
                  title={profile.nombre}
                  className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent"
                >
                  {initials(profile.nombre)}
                </div>
              )}
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
      <VideoLogoModal open={videoAbierto} onClose={() => setVideoAbierto(false)} />
    </>
  )
}
