import { useCallback, useState } from 'react'
import { listAllPlazos } from '@/features/casos/plazosApi'
import { listCasos } from '@/features/casos/api'
import { listClientes } from '@/features/clientes/api'
import { listInvitacionesPendientes } from '@/features/usuarios/invitacionesApi'
import { diasRestantes, labelDias } from '@/features/casos/plazoUrgencia'
import { useAuth } from '@/features/auth/AuthProvider'

export type Notificacion = {
  id: string
  tipo: 'plazo' | 'cliente' | 'invitacion'
  titulo: string
  subtitulo: string
  urgente: boolean
  to: string
}

export function useNotifications() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const [plazos, casos, clientes, invitaciones] = await Promise.all([
        listAllPlazos(),
        listCasos(),
        listClientes(),
        profile.rol === 'administrador' ? listInvitacionesPendientes() : Promise.resolve([]),
      ])
      const casosById = new Map(casos.map((c) => [c.id, c]))

      const dePlazos: Notificacion[] = plazos
        .map((p) => ({ p, dias: diasRestantes(p.fecha) }))
        .filter(({ dias }) => dias <= 3)
        .map(({ p, dias }) => ({
          id: `plazo-${p.id}`,
          tipo: 'plazo' as const,
          titulo: p.titulo,
          subtitulo: `Caso: ${casosById.get(p.caso_id)?.titulo ?? 'no disponible'} · ${labelDias(dias)}`,
          urgente: dias <= 1,
          to: `/casos/${p.caso_id}`,
        }))

      const hoy = new Date().toISOString().slice(0, 10)
      const deClientes: Notificacion[] = clientes
        .filter((c) => c.proximo_seguimiento && c.proximo_seguimiento <= hoy)
        .map((c) => ({
          id: `cliente-${c.id}`,
          tipo: 'cliente' as const,
          titulo: 'Seguimiento pendiente',
          subtitulo: `Cliente: ${c.nombre} · ${c.proximo_seguimiento === hoy ? 'Hoy' : 'Vencido'}`,
          urgente: true,
          to: `/clientes/${c.id}`,
        }))

      const deInvitaciones: Notificacion[] = invitaciones.map((inv) => ({
        id: `invitacion-${inv.id}`,
        tipo: 'invitacion' as const,
        titulo: `Invitación pendiente: ${inv.email}`,
        subtitulo: `Expira ${new Date(inv.expires_at).toLocaleDateString('es-EC')}`,
        urgente: false,
        to: '/usuarios',
      }))

      setItems([...deClientes, ...dePlazos, ...deInvitaciones])
    } finally {
      setLoading(false)
    }
  }, [profile])

  return { items, loading, refetch }
}
