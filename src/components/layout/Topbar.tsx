import { useLocation } from 'react-router-dom'
import type { PageAction } from '@/components/layout/PageActionContext'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { WorkspaceAssistant } from '@/features/workspace/WorkspaceAssistant'
import { useDevice } from '@/context/DeviceModeContext'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/casos': 'Casos',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda',
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
  const title = TITLES[sectionFor(pathname)] ?? ''
  const { isMobile } = useDevice()

  if (isMobile) {
    return (
      <div className="relative flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <img src="/LOGO.png" alt="TSADOQ" className="h-7 w-auto object-contain" />
          <span className="text-[16px] font-bold text-ink">TSADOQ</span>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white"
            >
              <i className="ti ti-plus text-[18px]" />
            </button>
          )}
          <NotificationsBell />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-[52px] flex-shrink-0 items-center border-b border-border bg-surface px-3 sm:px-5">
      <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{title}</div>

      {!sidebarOpen && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img src="/LOGO.png" alt="TSADOQ" className="h-7 w-auto object-contain" />
            <span className="text-[14px] font-bold text-ink">TSADOQ</span>
            <span className="hidden text-[12px] text-mute2 sm:inline">| Gestor de casos</span>
          </div>
        </div>
      )}
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
  )
}
