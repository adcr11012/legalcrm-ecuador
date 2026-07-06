import type { Urgencia } from '@/features/casos/plazoUrgencia'

const ON: Record<Urgencia, string> = {
  rojo:     '#e53e3e',
  amarillo: '#d97706',
  verde:    '#16a34a',
}
const OFF = '#e2e2e2'

export function SemaforoDot({ urgencia }: { urgencia: Urgencia }) {
  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-[4px] rounded-[6px] bg-[#1a1a1a] px-[5px] py-[6px]">
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: urgencia === 'rojo'     ? ON.rojo     : OFF, boxShadow: urgencia === 'rojo'     ? `0 0 6px 2px ${ON.rojo}`     : 'none' }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: urgencia === 'amarillo' ? ON.amarillo : OFF, boxShadow: urgencia === 'amarillo' ? `0 0 6px 2px ${ON.amarillo}` : 'none' }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: urgencia === 'verde'    ? ON.verde    : OFF, boxShadow: urgencia === 'verde'    ? `0 0 6px 2px ${ON.verde}`    : 'none' }} />
    </div>
  )
}
