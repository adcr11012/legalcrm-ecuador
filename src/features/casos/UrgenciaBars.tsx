import type { Urgencia } from '@/features/casos/plazoUrgencia'

const ORDEN: Urgencia[] = ['rojo', 'amarillo', 'verde']
const COLOR: Record<Urgencia, string> = {
  rojo: '#E24B4A',
  amarillo: '#EF9F27',
  verde: '#639922',
}

export function UrgenciaBars({ urgencia, height = 40 }: { urgencia: Urgencia; height?: number }) {
  return (
    <div className="flex flex-shrink-0 flex-col gap-[3px]" style={{ width: 5, height }}>
      {ORDEN.map((u) => (
        <div
          key={u}
          className="flex-1 rounded-[3px]"
          style={{ background: u === urgencia ? COLOR[u] : 'var(--color-border)' }}
        />
      ))}
    </div>
  )
}
