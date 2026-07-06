import { useDevice } from '@/context/DeviceModeContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  feature?: string
}

export function MobileBlock({ children, feature }: Props) {
  const { isMobile } = useDevice()

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
          Accede desde un computador para usar esta función.
        </p>
      </div>
    </div>
  )
}
