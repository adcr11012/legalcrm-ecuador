import type { Etapa } from '@/types/database'

const COLOR_CLASS: Record<string, string> = {
  neutral: 'bg-[#f2f1ee] text-muted border border-border',
  accent: 'bg-accent-soft text-accent',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  purple: 'bg-purple-soft text-purple',
}

export function EtapaPill({ etapa }: { etapa: Etapa | undefined | null }) {
  if (!etapa) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-border bg-[#f2f1ee] px-2 py-0.5 text-[10px] text-mute2">
        Sin etapa
      </span>
    )
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${COLOR_CLASS[etapa.color] ?? COLOR_CLASS.neutral}`}
    >
      {etapa.nombre}
    </span>
  )
}
