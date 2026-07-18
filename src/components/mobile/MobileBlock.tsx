import { useDevice } from '@/context/DeviceModeContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  feature?: string
}

export function MobileBlock({ children, feature }: Props) {
  const { isMobile, setForceFullView } = useDevice()

  if (!isMobile) return <>{children}</>

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-soft">
        <i className="ti ti-device-desktop text-[26px] text-muted" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-ink">
          {feature ? `${feature} no está disponible en móvil` : 'Esta sección no está disponible en móvil'}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Todavía no tiene una versión pensada para pantallas chicas — desde ahí es más fácil de usar.
        </p>
      </div>
      <button
        onClick={() => setForceFullView(true)}
        className="mt-1 flex h-11 items-center gap-2 rounded-[10px] bg-accent px-5 text-[14px] font-medium text-white transition active:opacity-80"
      >
        <i className="ti ti-device-desktop text-[16px]" /> Ver versión completa
      </button>
    </div>
  )
}
