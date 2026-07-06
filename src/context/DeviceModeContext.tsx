import { createContext, useContext, type ReactNode } from 'react'
import { useDeviceMode, type DeviceMode } from '@/hooks/useDeviceMode'

type DeviceModeContextValue = {
  mode: DeviceMode
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  forceFullView: boolean
  setForceFullView: (v: boolean) => void
}

const DeviceModeContext = createContext<DeviceModeContextValue | null>(null)

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const value = useDeviceMode()
  return <DeviceModeContext.Provider value={value}>{children}</DeviceModeContext.Provider>
}

export function useDevice() {
  const ctx = useContext(DeviceModeContext)
  if (!ctx) throw new Error('useDevice must be used inside DeviceModeProvider')
  return ctx
}
