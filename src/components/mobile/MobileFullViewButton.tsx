import { useDevice } from '@/context/DeviceModeContext'

export function MobileFullViewButton() {
  const { isMobile, forceFullView, setForceFullView, mode } = useDevice()

  // Solo mostrar en móvil (sin force) o cuando force está activo en móvil
  if (mode !== 'mobile') return null

  if (forceFullView) {
    return (
      <button
        onClick={() => setForceFullView(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-[12px] font-medium text-muted shadow-lg transition hover:bg-soft"
      >
        <i className="ti ti-device-mobile text-[14px]" />
        Vista móvil
      </button>
    )
  }

  if (!isMobile) return null

  return (
    <button
      onClick={() => setForceFullView(true)}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[12px] font-medium text-bg shadow-lg transition hover:opacity-80"
    >
      <i className="ti ti-device-desktop text-[14px]" />
      Ver versión completa
    </button>
  )
}
