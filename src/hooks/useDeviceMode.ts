import { useEffect, useState } from 'react'

const FORCE_KEY = 'tsadoq_force_full_view'

function getWidth() {
  return window.innerWidth
}

export type DeviceMode = 'mobile' | 'tablet' | 'desktop'

export function useDeviceMode() {
  const [width, setWidth] = useState(getWidth)
  const [forceFullView, setForceFullViewState] = useState(
    () => localStorage.getItem(FORCE_KEY) === '1'
  )

  useEffect(() => {
    const handler = () => setWidth(getWidth())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ?mobile in URL forces mobile mode (useful for browsers in desktop mode)
  const urlForceMobile = new URLSearchParams(window.location.search).has('mobile')

  const mode: DeviceMode = (width < 768 || urlForceMobile) ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'

  function setForceFullView(value: boolean) {
    localStorage.setItem(FORCE_KEY, value ? '1' : '0')
    setForceFullViewState(value)
  }

  const isMobile = mode === 'mobile' && !forceFullView
  const isTablet = mode === 'tablet'
  const isDesktop = mode === 'desktop' || forceFullView

  return { mode, isMobile, isTablet, isDesktop, forceFullView, setForceFullView, width }
}
