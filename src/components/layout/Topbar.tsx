import { useLocation } from 'react-router-dom'
import type { PageAction } from '@/components/layout/PageActionContext'

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
    <div className="flex h-[52px] flex-shrink-0 items-center gap-2.5 border-b border-border bg-surface px-5">
      <div className="flex-1 text-[15px] font-semibold text-ink">{title}</div>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-accent bg-accent px-3 py-1.5 text-[12px] text-white transition hover:bg-accent-hover"
        >
          <i className="ti ti-plus" /> {action.label}
        </button>
      )}
    </div>
  )
}
