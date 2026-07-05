import { useLocation } from 'react-router-dom'
import type { PageAction } from '@/components/layout/PageActionContext'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { WorkspaceAssistant } from '@/features/workspace/WorkspaceAssistant'

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

export function Topbar({ action }: { action: PageAction }) {
  const { pathname } = useLocation()
  const title = TITLES[sectionFor(pathname)] ?? ''

  return (
    <div className="flex h-[52px] flex-shrink-0 items-center gap-2.5 border-b border-border bg-surface px-3 sm:px-5">
      <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{title}</div>
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
