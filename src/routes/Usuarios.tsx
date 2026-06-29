import { useCallback, useEffect, useState } from 'react'
import { usePageAction } from '@/components/layout/PageActionContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { listWorkspaceUsers, setEsAdmin, removeUsuario } from '@/features/users/api'
import { listPersonasPorUsuarios } from '@/features/casos/personasApi'
import { listInvitacionesPendientes, deleteInvitacion } from '@/features/usuarios/invitacionesApi'
import { InvitarUsuarioModal } from '@/features/usuarios/InvitarUsuarioModal'
import type { Invitacion, Usuario } from '@/types/database'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default function Usuarios() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [casosPorUsuario, setCasosPorUsuario] = useState<Map<string, number>>(new Map())
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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
      if (profile?.es_admin) setInvitaciones(await listInvitacionesPendientes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [profile?.es_admin])

  useEffect(() => {
    load()
  }, [load])

  usePageAction(profile?.es_admin ? { label: 'Invitar usuario', onClick: () => setModalOpen(true) } : null)

  async function onToggleAdmin(u: Usuario) {
    const updated = await setEsAdmin(u.id, !u.es_admin)
    setUsuarios((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
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

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando usuarios…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_80px] bg-soft px-4 py-2.5">
          {['Usuario', 'Rol', 'Casos asignados', ''].map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-mute2">
              {h}
            </span>
          ))}
        </div>
        {usuarios.map((u) => (
          <div key={u.id} className="grid grid-cols-[2fr_1.2fr_1fr_80px] items-center border-b border-border px-4 py-3 last:border-b-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {initials(u.nombre)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">{u.nombre}</div>
                <div className="truncate text-[11px] text-mute2">{u.email}</div>
              </div>
            </div>
            <div>
              {profile?.es_admin ? (
                <button
                  onClick={() => onToggleAdmin(u)}
                  disabled={u.id === profile.id}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition disabled:opacity-60 ${
                    u.es_admin ? 'bg-accent-soft text-accent' : 'border border-border bg-soft text-muted hover:bg-bg'
                  }`}
                  title={u.id === profile.id ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                >
                  {u.es_admin ? 'Administrador' : 'Miembro'}
                </button>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${u.es_admin ? 'bg-accent-soft text-accent' : 'border border-border bg-soft text-muted'}`}>
                  {u.es_admin ? 'Administrador' : 'Miembro'}
                </span>
              )}
            </div>
            <div className="text-[12px] text-muted">{casosPorUsuario.get(u.id) ?? 0}</div>
            <div>
              {profile?.es_admin && u.id !== profile.id && (
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

      {profile?.es_admin && (
        <div className="mt-3 rounded-[10px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[12px] text-accent">
          <i className="ti ti-info-circle" /> El rol <strong>Administrador</strong> puede otorgarse a cualquier usuario. Siempre
          debe haber al menos un administrador en el workspace.
        </div>
      )}

      {profile?.es_admin && invitaciones.length > 0 && (
        <>
          <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Invitaciones pendientes</div>
          <div className="flex flex-col gap-2">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink">{inv.email}</div>
                  <div className="text-[11px] text-mute2">
                    {inv.es_admin ? 'Administrador' : 'Miembro'} · expira {new Date(inv.expires_at).toLocaleDateString('es-EC')}
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

      <InvitarUsuarioModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(inv) => setInvitaciones((prev) => [inv, ...prev])} />
    </div>
  )
}
