import { useCallback, useState } from 'react'
import { listAllPlazos } from '@/features/casos/plazosApi'
import { listAllTareasPendientes } from '@/features/casos/tareasApi'
import { listCasos } from '@/features/casos/api'
import { listClientes } from '@/features/clientes/api'
import { listInvitacionesPendientes } from '@/features/usuarios/invitacionesApi'
import { getWorkspace } from '@/features/workspace/api'
import { diasRestantes, labelDias } from '@/features/casos/plazoUrgencia'
import { useAuth } from '@/features/auth/AuthProvider'

export type Notificacion = {
  id: string
  tipo: 'plazo' | 'cliente' | 'invitacion' | 'tarea'
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
      const [plazos, tareas, casos, clientes, invitaciones, workspace] = await Promise.all([
        listAllPlazos(),
        listAllTareasPendientes(),
        listCasos(),
        listClientes(),
        profile.rol === 'administrador' ? listInvitacionesPendientes() : Promise.resolve([]),
        getWorkspace(profile.workspace_id),
      ])
      const casosById = new Map(casos.map((c) => [c.id, c]))

      const hoy = new Date().toISOString().slice(0, 10)
      const mostrarPlazosEnApp = workspace?.notif_email ?? true
      const umbralDias = workspace?.dias_anticipacion ?? 3

      const dePlazos: Notificacion[] = !mostrarPlazosEnApp ? [] : plazos
        .map((p) => ({ p, dias: diasRestantes(p.fecha) }))
        .filter(({ dias }) => dias <= umbralDias)
        .map(({ p, dias }) => ({
          id: `plazo-${p.id}`,
          tipo: 'plazo' as const,
          titulo: p.titulo,
          subtitulo: `Caso: ${casosById.get(p.caso_id)?.titulo ?? 'no disponible'} · ${labelDias(dias)}`,
          urgente: dias <= 1,
          to: `/casos/${p.caso_id}`,
        }))

      const deTareas: Notificacion[] = tareas
        .filter((t) => t.fecha_limite && t.fecha_limite <= hoy)
        .map((t) => {
          const diasT = diasRestantes(t.fecha_limite!)
          return {
            id: `tarea-${t.id}`,
            tipo: 'tarea' as const,
            titulo: t.titulo,
            subtitulo: `Tarea · ${casosById.get(t.caso_id)?.titulo ?? 'no disponible'} · ${diasT < 0 ? 'Vencida' : 'Hoy'}`,
            urgente: true,
            to: `/casos/${t.caso_id}`,
          }
        })

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

      setItems([...deClientes, ...deTareas, ...dePlazos, ...deInvitaciones])
    } finally {
      setLoading(false)
    }
  }, [profile])

  return { items, loading, refetch }
}
