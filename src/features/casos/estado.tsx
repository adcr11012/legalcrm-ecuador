import type { EstadoCaso } from '@/types/database'

export const ESTADO_LABEL: Record<EstadoCaso, string> = {
  nuevo: 'Nuevo',
  activo: 'Activo',
  en_espera: 'En espera',
  audiencia_proxima: 'Audiencia próxima',
  resuelto: 'Resuelto',
  archivado: 'Archivado',
}

export const ESTADO_CLASS: Record<EstadoCaso, string> = {
  nuevo: 'bg-[#f2f1ee] text-muted border border-border',
  activo: 'bg-accent-soft text-accent',
  en_espera: 'bg-warn-soft text-warn',
  audiencia_proxima: 'bg-danger-soft text-danger',
  resuelto: 'bg-success-soft text-success',
  archivado: 'bg-[#f2f1ee] text-mute2 border border-border',
}

export function EstadoPill({ estado }: { estado: EstadoCaso }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_CLASS[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  )
}
