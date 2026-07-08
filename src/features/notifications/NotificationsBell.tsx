import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, type Notificacion } from '@/features/notifications/useNotifications'

const ICON: Record<Notificacion['tipo'], string> = {
  plazo: 'ti-clock',
  cliente: 'ti-user-circle',
  invitacion: 'ti-mail',
  tarea: 'ti-checkbox',
  inactividad: 'ti-moon-2',
}

export function NotificationsBell() {
  const navigate = useNavigate()
  const { items, loading, refetch, marcarLeida } = useNotifications()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const urgentes = items.filter((i) => i.urgente).length

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) refetch()
        }}
        className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink"
      >
        <i className="ti ti-bell text-[18px]" />
        {items.length > 0 && (
          <span
            className={`absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white ${
              urgentes > 0 ? 'bg-danger' : 'bg-accent'
            }`}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[200] w-[calc(100vw-16px)] max-w-[320px] overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3.5 py-2.5 text-[12px] font-semibold text-ink">Novedades</div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading && <div className="p-4 text-center text-[12px] text-mute2">Cargando…</div>}
            {!loading && items.length === 0 && (
              <div className="p-5 text-center text-[12px] text-mute2">No hay novedades pendientes.</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setOpen(false)
                  if (n.avisoAdminId) marcarLeida(n)
                  navigate(n.to)
                }}
                className="flex w-full items-start gap-2.5 border-b border-border/70 px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-soft"
              >
                <i className={`ti ${ICON[n.tipo]} mt-0.5 flex-shrink-0 text-[15px] ${n.urgente ? 'text-danger' : 'text-mute2'}`} />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-ink">{n.titulo}</div>
                  <div className="text-[11px] text-mute2">{n.subtitulo}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
