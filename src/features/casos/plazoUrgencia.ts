export type Urgencia = 'urgente' | 'proximo' | 'normal'

export function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = new Date(fecha + 'T00:00:00')
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000)
}

export function clasificarUrgencia(dias: number): Urgencia {
  if (dias <= 2) return 'urgente'
  if (dias <= 7) return 'proximo'
  return 'normal'
}

export function labelDias(dias: number): string {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

export const URGENCIA_CLASS: Record<Urgencia, string> = {
  urgente: 'bg-danger-soft text-danger',
  proximo: 'bg-warn-soft text-warn',
  normal: 'bg-[#f2f1ee] text-muted',
}

export const URGENCIA_BORDER: Record<Urgencia, string> = {
  urgente: 'border-l-[3px] border-l-danger',
  proximo: 'border-l-[3px] border-l-warn',
  normal: '',
}
