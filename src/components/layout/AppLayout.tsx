import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { PageActionContext, type PageAction } from '@/components/layout/PageActionContext'

export function AppLayout() {
  const [action, setAction] = useState<PageAction>(null)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <Topbar action={action} />
        <div className="relative flex flex-1 overflow-hidden">
          <PageActionContext.Provider value={setAction}>
            <Outlet />
          </PageActionContext.Provider>
        </div>
      </div>
    </div>
  )
}
