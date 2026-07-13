import { useEffect, useState } from 'react'
import {
  listarSuperadmins,
  agregarSuperadmin,
  quitarSuperadmin,
  listarAccesosSuperadmin,
  type Superadmin,
  type AccesoSuperadmin,
} from '@/features/admin/adminApi'
import { supabase } from '@/lib/supabase'

const ACCION_LABEL: Record<string, string> = {
  ver_detalle_workspace: 'Vio el detalle del workspace',
  ver_pagos_workspace: 'Vio los pagos del workspace',
}

export default function AdminSuperadmins() {
  const [tab, setTab] = useState<'superadmins' | 'accesos'>('superadmins')
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([])
  const [accesos, setAccesos] = useState<AccesoSuperadmin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAccesos, setLoadingAccesos] = useState(true)
  const [email, setEmail] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [miUserId, setMiUserId] = useState<string | null>(null)

  const load = () => listarSuperadmins().then(setSuperadmins).finally(() => setLoading(false))
  const loadAccesos = () => listarAccesosSuperadmin().then(setAccesos).finally(() => setLoadingAccesos(false))

  useEffect(() => {
    load()
    loadAccesos()
    supabase.auth.getUser().then(({ data }) => setMiUserId(data.user?.id ?? null))
  }, [])

  async function onAgregar(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setAgregando(true)
    try {
      await agregarSuperadmin(email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar.')
    } finally {
      setAgregando(false)
    }
  }

  async function onQuitar(userId: string, correo: string) {
    if (!confirm(`¿Quitar el acceso de superadmin a ${correo}?`)) return
    setError(null)
    try {
      await quitarSuperadmin(userId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar.')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-[18px] font-bold text-ink">Superadmins</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Personas con acceso total al panel de administración (todos los workspaces). Es independiente del rol
          "Administrador" de cada workspace individual. El superadmin propietario no puede ser eliminado desde acá, y
          sus accesos no quedan en el historial de auditoría — el resto de superadmins sí.
        </p>
      </div>

      <div className="mb-5 flex gap-1 rounded-[8px] bg-soft p-1 w-fit">
        <button
          onClick={() => setTab('superadmins')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition ${tab === 'superadmins' ? 'bg-surface text-ink shadow-sm font-medium' : 'text-muted'}`}
        >
          Superadmins
        </button>
        <button
          onClick={() => setTab('accesos')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition ${tab === 'accesos' ? 'bg-surface text-ink shadow-sm font-medium' : 'text-muted'}`}
        >
          Historial de accesos ({accesos.length})
        </button>
      </div>

      {tab === 'superadmins' && (
        <>
          <form onSubmit={onAgregar} className="mb-6 flex flex-wrap items-end gap-3 rounded-[10px] border border-border bg-surface p-4">
            <div className="flex-1 min-w-[240px]">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Correo de una cuenta ya registrada
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={agregando}
              className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {agregando ? 'Agregando…' : 'Agregar superadmin'}
            </button>
          </form>

          {error && (
            <div className="mb-4 rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
          )}

          {loading ? (
            <div className="py-8 text-center text-[13px] text-muted">Cargando…</div>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-soft">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Nombre</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Correo</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Desde</th>
                    <th className="w-[100px] px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {superadmins.map((s) => (
                    <tr key={s.user_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-[13px] font-medium text-ink">
                        {s.nombre ?? '—'}
                        {s.es_propietario && (
                          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                            Propietario
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted">{s.email}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {new Date(s.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {s.es_propietario ? (
                          <span className="text-[11px] text-mute2">—</span>
                        ) : s.user_id === miUserId ? (
                          <span className="text-[11px] text-mute2">Tú</span>
                        ) : (
                          <button
                            onClick={() => onQuitar(s.user_id, s.email)}
                            className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-danger-soft hover:text-danger"
                          >
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'accesos' && (
        loadingAccesos ? (
          <div className="py-8 text-center text-[13px] text-muted">Cargando…</div>
        ) : accesos.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">
            Sin accesos registrados todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-soft">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Superadmin</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Qué vio</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Workspace</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {accesos.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 text-[13px] text-ink">{a.superadmin_nombre ?? a.superadmin_email}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted">{ACCION_LABEL[a.accion] ?? a.accion}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted">{a.workspace_nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted">
                      {new Date(a.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
