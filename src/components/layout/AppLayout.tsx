import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { PageActionContext, type PageAction } from '@/components/layout/PageActionContext'
import { DeviceModeProvider, useDevice } from '@/context/DeviceModeContext'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'

function AppLayoutInner() {
  const [action, setAction] = useState<PageAction>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const { isMobile } = useDevice()

  useEffect(() => {
    let wasDesktop = window.innerWidth >= 1024
    function onResize() {
      const isDesktop = window.innerWidth >= 1024
      if (isDesktop !== wasDesktop) {
        wasDesktop = isDesktop
        setSidebarOpen(isDesktop)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-screen bg-bg">
      {!isMobile && <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />}
      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <Topbar action={action} sidebarOpen={isMobile ? false : sidebarOpen} />
        <div className="relative flex flex-1 overflow-hidden">
          <PageActionContext.Provider value={setAction}>
            <Outlet />
          </PageActionContext.Provider>
        </div>
        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <DeviceModeProvider>
      <AppLayoutInner />
    </DeviceModeProvider>
  )
}
