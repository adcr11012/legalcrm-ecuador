import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { PageAction } from '@/components/layout/PageActionContext'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { WorkspaceAssistant } from '@/features/workspace/WorkspaceAssistant'
import { useDevice } from '@/context/DeviceModeContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { useSetupInicial } from '@/hooks/useSetupInicial'
import { SetupInicialWizard, debeResumirSetup } from '@/components/setup/SetupInicialWizard'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/casos': 'Casos',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda',
  '/buscar': 'Buscar',
  '/soporte': 'Soporte',
  '/calculadora': 'Calculadora',
  '/usuarios': 'Usuarios y roles',
  '/drive': 'Google Drive',
  '/configuracion': 'Configuración',
}

function sectionFor(pathname: string): string {
  const match = Object.keys(TITLES).find((p) => pathname === p || pathname.startsWith(p + '/'))
  return match ?? pathname
}

export function Topbar({ action, sidebarOpen }: { action: PageAction; sidebarOpen: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = TITLES[sectionFor(pathname)] ?? ''
  const { isMobile } = useDevice()
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const enCasos = sectionFor(pathname) === '/casos'
  const view: 'list' | 'kanban' = searchParams.get('view') === 'kanban' ? 'kanban' : 'list'

  const esAdmin = profile?.rol === 'administrador'
  const { driveConectado, groqConectado, pendiente, refetch } = useSetupInicial(esAdmin)
  const [setupOpen, setSetupOpen] = useState(false)

  useEffect(() => {
    if (debeResumirSetup()) setSetupOpen(true)
  }, [])

  function cerrarSetup() {
    setSetupOpen(false)
    refetch()
  }

  const botonSetup = pendiente && (
    <button
      onClick={() => setSetupOpen(true)}
      title="Configuración inicial pendiente"
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full bg-danger px-2.5 text-[11px] font-medium text-white transition hover:opacity-90 ${isMobile ? 'h-9' : 'h-7'}`}
    >
      <i className="ti ti-alert-circle text-[13px]" />
      <span className={isMobile ? '' : 'hidden sm:inline'}>Configurar</span>
    </button>
  )

  const wizard = setupOpen && (
    <SetupInicialWizard driveConectado={driveConectado} groqConectado={groqConectado} onClose={cerrarSetup} />
  )

  if (isMobile) {
    const enDashboard = sectionFor(pathname) === '/dashboard'
    return (
      <>
      <div className="relative flex h-[56px] flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {enDashboard ? (
            <>
              <img src="/LOGO_1.png" alt="TSADOQ" className="logo-claro h-7 w-auto flex-shrink-0 object-contain" />
              <img src="/LOGO_2.png" alt="TSADOQ" className="logo-oscuro h-7 w-auto flex-shrink-0 object-contain" />
              <span className="truncate text-[16px] font-bold text-ink">TSADOQ</span>
            </>
          ) : (
            <span className="truncate text-[16px] font-bold text-ink">{title}</span>
          )}
          {botonSetup}
          {enCasos && (
            <div className="flex flex-shrink-0 gap-0.5 rounded-[6px] bg-soft p-0.5">
              <button
                onClick={() => setSearchParams((prev) => { prev.set('view', 'list'); return prev })}
                className={`flex h-7 items-center gap-1 rounded-[5px] px-2 text-[11px] transition ${view === 'list' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              >
                <i className="ti ti-list" />
              </button>
              <button
                onClick={() => setSearchParams((prev) => { prev.set('view', 'kanban'); return prev })}
                className={`flex h-7 items-center gap-1 rounded-[5px] px-2 text-[11px] transition ${view === 'kanban' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              >
                <i className="ti ti-layout-columns" />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {action && (
            <button
              onClick={action.onClick}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white"
            >
              <i className="ti ti-plus text-[18px]" />
            </button>
          )}
          <WorkspaceAssistant />
          <button
            onClick={() => navigate('/ayuda')}
            title="Ayuda / Manual"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-soft hover:text-ink"
          >
            <i className="ti ti-help-circle text-[18px]" />
          </button>
          <NotificationsBell />
        </div>
      </div>
      {wizard}
      </>
    )
  }

  return (
    <>
    <div className="relative flex h-[52px] flex-shrink-0 items-center border-b border-border bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate text-[15px] font-semibold text-ink">{title}</span>
        {botonSetup}
        {enCasos && (
          <div className="flex flex-shrink-0 gap-0.5 rounded-[6px] bg-soft p-0.5">
            <button
              onClick={() => setSearchParams((prev) => { prev.set('view', 'list'); return prev })}
              className={`flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] transition ${view === 'list' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            >
              <i className="ti ti-list" /> Lista
            </button>
            <button
              onClick={() => setSearchParams((prev) => { prev.set('view', 'kanban'); return prev })}
              className={`flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] transition ${view === 'kanban' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            >
              <i className="ti ti-layout-columns" /> Kanban
            </button>
          </div>
        )}
      </div>

      {!sidebarOpen && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img src="/LOGO_1.png" alt="TSADOQ" className="logo-claro h-7 w-auto object-contain" />
            <img src="/LOGO_2.png" alt="TSADOQ" className="logo-oscuro h-7 w-auto object-contain" />
            <span className="text-[14px] font-bold text-ink">TSADOQ</span>
            <span className="hidden text-[12px] text-mute2 sm:inline">| Gestor de casos</span>
          </div>
        </div>
      )}
      <button
        onClick={() => navigate('/ayuda')}
        title="Ayuda / Manual"
        className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink"
      >
        <i className="ti ti-help-circle text-[18px]" />
      </button>
      <WorkspaceAssistant />
      <NotificationsBell />
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-[6px] border border-accent bg-accent px-2.5 py-1.5 text-[12px] text-white transition hover:bg-accent-hover sm:px-3"
        >
          <i className="ti ti-plus" /> <span className="hidden sm:inline">{action.label}</span>
        </button>
      )}
    </div>
    {wizard}
    </>
  )
}
