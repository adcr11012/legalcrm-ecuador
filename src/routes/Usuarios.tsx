import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usePageAction } from '@/components/layout/PageActionContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { listWorkspaceUsers, setRolUsuario, removeUsuario } from '@/features/users/api'
import { listPersonasPorUsuarios } from '@/features/casos/personasApi'
import { listInvitacionesPendientes, deleteInvitacion } from '@/features/usuarios/invitacionesApi'
import { InvitarUsuarioModal } from '@/features/usuarios/InvitarUsuarioModal'
import { listGrupos, type GrupoConMiembros } from '@/features/users/gruposApi'
import { GruposSection } from '@/features/users/GruposSection'
import type { Invitacion, RolUsuario, Usuario } from '@/types/database'

const ROL_LABEL: Record<RolUsuario, string> = {
  administrador: 'Administrador',
  master: 'Master',
  limitado: 'Limitado',
}

const ROL_CLASS: Record<RolUsuario, string> = {
  administrador: 'bg-accent-soft text-accent',
  master: 'bg-success-soft text-success',
  limitado: 'border border-border bg-soft text-muted',
}

const ROLES_DISPONIBLES: RolUsuario[] = ['administrador', 'master', 'limitado']

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function lastSeenLabel(lastSeen: string | null): string {
  if (!lastSeen) return 'Nunca'
  const diff = Date.now() - new Date(lastSeen).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 2) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Ayer'
  if (d < 30) return `Hace ${d} días`
  return new Date(lastSeen).toLocaleDateString('es-EC')
}

export default function Usuarios() {
  const { profile } = useAuth()
  const esAdmin = profile?.rol === 'administrador'
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [casosPorUsuario, setCasosPorUsuario] = useState<Map<string, number>>(new Map())
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [grupos, setGrupos] = useState<GrupoConMiembros[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [cambiandoRol, setCambiandoRol] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const users = await listWorkspaceUsers()
      setUsuarios(users)
      const personas = await listPersonasPorUsuarios(users.map((u) => u.id))
      const counts = new Map<string, number>()
      for (const p of personas) {
        if (!p.user_id) continue
        counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1)
      }
      setCasosPorUsuario(counts)
      if (esAdmin) {
        setInvitaciones(await listInvitacionesPendientes())
        setGrupos(await listGrupos())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [esAdmin])

  useEffect(() => {
    load()
  }, [load])

  usePageAction(esAdmin ? { label: 'Invitar usuario', onClick: () => setModalOpen(true) } : null)

  async function onChangeRol(u: Usuario, nuevoRol: RolUsuario) {
    if (nuevoRol === u.rol) return
    setCambiandoRol(u.id)
    try {
      const updated = await setRolUsuario(u.id, nuevoRol)
      setUsuarios((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } finally {
      setCambiandoRol(null)
    }
  }

  async function onRemove(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre} del workspace? Esta acción no se puede deshacer.`)) return
    await removeUsuario(u.id)
    setUsuarios((prev) => prev.filter((x) => x.id !== u.id))
  }

  async function onRevokeInvitacion(id: string) {
    await deleteInvitacion(id)
    setInvitaciones((prev) => prev.filter((i) => i.id !== id))
  }

  if (profile && !esAdmin) return <Navigate to="/dashboard" replace />

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando usuarios…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-ink">Usuarios del workspace</div>
          <div className="text-[12px] text-muted">{usuarios.length} usuario{usuarios.length === 1 ? '' : 's'}</div>
        </div>
        {esAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-[8px] bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover"
          >
            <i className="ti ti-user-plus" /> <span className="hidden sm:inline">Invitar usuario</span><span className="sm:hidden">Invitar</span>
          </button>
        )}
      </div>

      {/* Tabla — pantallas grandes */}
      <div className="hidden overflow-hidden rounded-[10px] border border-border bg-surface lg:block">
        <div className="grid grid-cols-[2fr_1.4fr_1fr_90px_48px] bg-soft px-4 py-2.5">
          {['Usuario', 'Rol', 'Casos', 'Última vez', ''].map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-mute2">
              {h}
            </span>
          ))}
        </div>
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[2fr_1.4fr_1fr_90px_48px] items-center border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {initials(u.nombre)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">{u.nombre}</div>
                <div className="truncate text-[11px] text-mute2">{u.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {u.es_propietario && (
                <i className="ti ti-crown text-[12px] text-warn" title="Propietario del workspace" />
              )}
              {esAdmin && u.id !== profile?.id && !u.es_propietario ? (
                <select
                  value={u.rol}
                  disabled={cambiandoRol === u.id}
                  onChange={(e) => onChangeRol(u, e.target.value as RolUsuario)}
                  className={`cursor-pointer rounded-full border-0 py-0.5 pl-2 pr-6 text-[10px] font-medium outline-none disabled:opacity-60 ${ROL_CLASS[u.rol]}`}
                >
                  {ROLES_DISPONIBLES.map((r) => (
                    <option key={r} value={r}>{ROL_LABEL[r]}</option>
                  ))}
                </select>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ROL_CLASS[u.rol]}`}>
                  {ROL_LABEL[u.rol]}
                </span>
              )}
            </div>

            <div className="text-[12px] text-muted">{casosPorUsuario.get(u.id) ?? 0}</div>

            <div className="text-[11px] text-mute2">{lastSeenLabel(u.last_seen_at)}</div>

            <div>
              {esAdmin && u.id !== profile?.id && !u.es_propietario && (
                <button
                  onClick={() => onRemove(u)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <i className="ti ti-trash text-[14px]" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tarjetas — mobile */}
      <div className="flex flex-col gap-2 lg:hidden">
        {usuarios.map((u) => (
          <div key={u.id} className="rounded-[12px] border border-border bg-surface p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
                {initials(u.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold text-ink">{u.nombre}</span>
                  {u.es_propietario && <i className="ti ti-crown flex-shrink-0 text-[13px] text-warn" title="Propietario del workspace" />}
                </div>
                <div className="truncate text-[12px] text-mute2">{u.email}</div>
              </div>
              {esAdmin && u.id !== profile?.id && !u.es_propietario && (
                <button
                  onClick={() => onRemove(u)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] border border-border text-muted transition active:bg-danger-soft active:text-danger"
                >
                  <i className="ti ti-trash text-[15px]" />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
              {esAdmin && u.id !== profile?.id && !u.es_propietario ? (
                <select
                  value={u.rol}
                  disabled={cambiandoRol === u.id}
                  onChange={(e) => onChangeRol(u, e.target.value as RolUsuario)}
                  className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-[11px] font-medium outline-none disabled:opacity-60 ${ROL_CLASS[u.rol]}`}
                >
                  {ROLES_DISPONIBLES.map((r) => (
                    <option key={r} value={r}>{ROL_LABEL[r]}</option>
                  ))}
                </select>
              ) : (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ROL_CLASS[u.rol]}`}>
                  {ROL_LABEL[u.rol]}
                </span>
              )}
              <span className="text-[11.5px] text-muted">
                <i className="ti ti-briefcase mr-1 text-[12px] text-mute2" />{casosPorUsuario.get(u.id) ?? 0} caso{(casosPorUsuario.get(u.id) ?? 0) === 1 ? '' : 's'}
              </span>
              <span className="text-[11.5px] text-mute2">
                <i className="ti ti-clock mr-1 text-[12px]" />{lastSeenLabel(u.last_seen_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {esAdmin && (
        <div className="mt-3 rounded-[10px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[12px] text-accent">
          <i className="ti ti-info-circle" />{' '}
          <strong>Administrador</strong>: acceso total ·{' '}
          <strong>Master</strong>: todo excepto gestión de usuarios ·{' '}
          <strong>Limitado</strong>: solo ve sus casos asignados
        </div>
      )}

      {esAdmin && profile && (
        <GruposSection workspaceId={profile.workspace_id} grupos={grupos} setGrupos={setGrupos} usuarios={usuarios} />
      )}

      {esAdmin && invitaciones.length > 0 && (
        <>
          <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">
            Invitaciones pendientes
          </div>
          <div className="flex flex-col gap-2">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink">{inv.email}</div>
                  <div className="text-[11px] text-mute2">
                    {ROL_LABEL[inv.rol]} · expira {new Date(inv.expires_at).toLocaleDateString('es-EC')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`)
                  }}
                  className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft"
                >
                  Copiar link
                </button>
                <button
                  onClick={() => onRevokeInvitacion(inv.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <i className="ti ti-x text-[14px]" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <InvitarUsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(inv) => setInvitaciones((prev) => [inv, ...prev])}
      />
    </div>
  )
}
