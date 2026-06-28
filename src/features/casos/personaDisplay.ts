import type { CasoPersona, Usuario } from '@/types/database'

export function nombrePersona(p: CasoPersona, usersById: Map<string, Usuario>): string {
  if (p.nombre_externo) return p.nombre_externo
  if (p.user_id) return usersById.get(p.user_id)?.nombre ?? 'Usuario del workspace'
  return 'Sin nombre'
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
