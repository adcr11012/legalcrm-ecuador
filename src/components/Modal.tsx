import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 480,
  bodyClassName = 'flex-1 overflow-y-auto p-5',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: number
  bodyClassName?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[14px] bg-surface shadow-2xl"
        style={{ maxWidth }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="text-[16px] font-bold text-ink">{title}</div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-[#f2f1ee]"
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  )
}
