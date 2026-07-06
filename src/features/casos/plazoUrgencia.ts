export type Urgencia = 'rojo' | 'amarillo' | 'verde'

export function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = new Date(fecha + 'T00:00:00')
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000)
}

// Semáforo: rojo 0-7 días, amarillo 8-29 días, verde 30+ días
export function clasificarUrgencia(dias: number): Urgencia {
  if (dias <= 7) return 'rojo'
  if (dias <= 29) return 'amarillo'
  return 'verde'
}

export function labelDias(dias: number): string {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

export const URGENCIA_CLASS: Record<Urgencia, string> = {
  rojo:     'bg-danger-soft text-danger',
  amarillo: 'bg-warn-soft text-warn',
  verde:    'bg-success-soft text-success',
}

export const URGENCIA_BORDER: Record<Urgencia, string> = {
  rojo:     'border-l-[3px] border-l-danger',
  amarillo: 'border-l-[3px] border-l-warn',
  verde:    'border-l-[3px] border-l-success',
}

export const URGENCIA_DOT: Record<Urgencia, string> = {
  rojo:     'bg-danger',
  amarillo: 'bg-warn',
  verde:    'bg-success',
}
