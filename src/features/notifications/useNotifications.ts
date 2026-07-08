import { useCallback, useState } from 'react'
import { listAllPlazos } from '@/features/casos/plazosApi'
import { listAllTareasPendientes } from '@/features/casos/tareasApi'
import { listCasos } from '@/features/casos/api'
import { listClientes } from '@/features/clientes/api'
import { listInvitacionesPendientes } from '@/features/usuarios/invitacionesApi'
import { listAvisosAdminNoLeidos, marcarAvisoLeido } from '@/features/notifications/avisosAdminApi'
import { listAnunciosNoLeidos, marcarAnuncioLeido } from '@/features/anuncios/api'
import { getWorkspace } from '@/features/workspace/api'
import { diasRestantes, labelDias } from '@/features/casos/plazoUrgencia'
import { useAuth } from '@/features/auth/AuthProvider'

export type Notificacion = {
  id: string
  tipo: 'plazo' | 'cliente' | 'invitacion' | 'tarea' | 'inactividad' | 'anuncio' | 'satje'
  titulo: string
  subtitulo: string
  urgente: boolean
  to: string
  avisoAdminId?: string
  anuncioId?: string
}

export function useNotifications() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const esAdmin = profile.rol === 'administrador'
      const [plazos, tareas, casos, clientes, invitaciones, workspace, avisosAdmin, anuncios] = await Promise.all([
        listAllPlazos(),
        listAllTareasPendientes(),
        listCasos(),
        listClientes(),
        esAdmin ? listInvitacionesPendientes() : Promise.resolve([]),
        getWorkspace(profile.workspace_id),
        esAdmin ? listAvisosAdminNoLeidos() : Promise.resolve([]),
        listAnunciosNoLeidos(profile.id),
      ])
      const casosById = new Map(casos.map((c) => [c.id, c]))

      const hoy = new Date().toISOString().slice(0, 10)
      const mostrarPlazosEnApp = workspace?.notif_email ?? true
      const umbralDias = workspace?.dias_anticipacion ?? 3

      const dePlazos: Notificacion[] = !mostrarPlazosEnApp ? [] : plazos
        .filter((p) => p.estado !== 'completada')
        .map((p) => ({ p, dias: diasRestantes(p.fecha) }))
        .filter(({ dias }) => dias >= 0 && dias <= umbralDias)
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

      const deInactividad: Notificacion[] = avisosAdmin.map((a) => ({
        id: `aviso-${a.id}`,
        tipo: a.tipo === 'satje_causa_invalida' ? ('satje' as const) : ('inactividad' as const),
        titulo: a.titulo,
        subtitulo: a.subtitulo,
        urgente: false,
        to: a.to_path,
        avisoAdminId: a.id,
      }))

      const deAnuncios: Notificacion[] = anuncios.map((a) => ({
        id: `anuncio-${a.id}`,
        tipo: 'anuncio' as const,
        titulo: a.titulo,
        subtitulo: a.contenido,
        urgente: false,
        to: '/anuncios',
        anuncioId: a.id,
      }))

      setItems([...deAnuncios, ...deInactividad, ...deClientes, ...deTareas, ...dePlazos, ...deInvitaciones])
    } finally {
      setLoading(false)
    }
  }, [profile])

  const marcarLeida = useCallback(async (n: Notificacion) => {
    if (n.avisoAdminId) {
      await marcarAvisoLeido(n.avisoAdminId)
      setItems((prev) => prev.filter((x) => x.id !== n.id))
    } else if (n.anuncioId && profile) {
      await marcarAnuncioLeido(n.anuncioId, profile.id)
      setItems((prev) => prev.filter((x) => x.id !== n.id))
    }
  }, [profile])

  return { items, loading, refetch, marcarLeida }
}
