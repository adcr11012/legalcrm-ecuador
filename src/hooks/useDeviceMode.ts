import { useEffect, useState } from 'react'

function getWidth() {
  return window.innerWidth
}

export type DeviceMode = 'mobile' | 'tablet' | 'desktop'

export function useDeviceMode() {
  const [width, setWidth] = useState(getWidth)

  // ?mobile en la URL fuerza modo mobile (para pruebas)
  const urlForceMobile = new URLSearchParams(window.location.search).has('mobile')

  // "Ver versión completa" es solo para la pestaña/sesión actual — a
  // propósito NO se guarda en localStorage. Guardarlo permanente dejaba a
  // cualquiera que lo tocara una vez atascado en modo escritorio en su
  // celular para siempre, sin ver el menú mobile, hasta encontrar el botón
  // flotante "Vista móvil" (poco visible) o borrar datos del navegador.
  const [forceFullView, setForceFullViewState] = useState(false)

  useEffect(() => {
    const handler = () => setWidth(getWidth())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const mode: DeviceMode = (width < 768 || urlForceMobile) ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'

  function setForceFullView(value: boolean) {
    setForceFullViewState(value)
  }

  const isMobile = mode === 'mobile' && !forceFullView
  const isTablet = mode === 'tablet'
  const isDesktop = mode === 'desktop' || forceFullView

  return { mode, isMobile, isTablet, isDesktop, forceFullView, setForceFullView, width }
}
