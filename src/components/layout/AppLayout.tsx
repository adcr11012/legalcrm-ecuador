import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { PageActionContext, type PageAction } from '@/components/layout/PageActionContext'
import { DeviceModeProvider, useDevice } from '@/context/DeviceModeContext'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { OnboardingModal } from '@/components/OnboardingModal'
import { useAuth } from '@/features/auth/AuthProvider'
import { marcarOnboardingCompletado } from '@/features/users/api'

function AppLayoutInner() {
  const [action, setAction] = useState<PageAction>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const { isMobile, mode, forceFullView, setForceFullView } = useDevice()
  const isRealMobileForced = mode === 'mobile' && forceFullView
  const { profile, refreshProfile } = useAuth()
  const [onboardingVisible, setOnboardingVisible] = useState(false)

  useEffect(() => {
    if (profile && !profile.onboarding_completado) setOnboardingVisible(true)
  }, [profile])

  async function cerrarOnboarding() {
    setOnboardingVisible(false)
    await marcarOnboardingCompletado()
    refreshProfile()
  }

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar action={action} sidebarOpen={isMobile ? false : sidebarOpen} />
        <div className="relative flex flex-1 overflow-hidden">
          <PageActionContext.Provider value={setAction}>
            <Outlet />
          </PageActionContext.Provider>
        </div>
        {isMobile && <MobileBottomNav />}
        {isRealMobileForced && (
          <button
            onClick={() => setForceFullView(false)}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 shadow-lg text-[13px] font-semibold text-white"
          >
            <i className="ti ti-device-mobile text-[16px]" />
            Vista móvil
          </button>
        )}
      </div>
      {onboardingVisible && profile && (
        <OnboardingModal nombre={profile.nombre} rol={profile.rol} onFinish={cerrarOnboarding} />
      )}
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
