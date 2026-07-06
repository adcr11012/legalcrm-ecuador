import type { Urgencia } from '@/features/casos/plazoUrgencia'

const COLORS: Record<Urgencia, string> = {
  rojo:     '#c0392b',
  amarillo: '#d68910',
  verde:    '#1e8449',
}

export function SemaforoDot({ urgencia }: { urgencia: Urgencia }) {
  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-[3px]">
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: urgencia === 'rojo'     ? COLORS.rojo     : '#d0d0d0' }} />
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: urgencia === 'amarillo' ? COLORS.amarillo : '#d0d0d0' }} />
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: urgencia === 'verde'    ? COLORS.verde    : '#d0d0d0' }} />
    </div>
  )
}
