import { useEffect, useState } from 'react'
import { listarSuperadmins, agregarSuperadmin, quitarSuperadmin, type Superadmin } from '@/features/admin/adminApi'
import { supabase } from '@/lib/supabase'

export default function AdminSuperadmins() {
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [miUserId, setMiUserId] = useState<string | null>(null)

  const load = () => listarSuperadmins().then(setSuperadmins).finally(() => setLoading(false))

  useEffect(() => {
    load()
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
    await quitarSuperadmin(userId)
    await load()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-ink">Superadmins</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Personas con acceso total al panel de administración (todos los workspaces). Es independiente del rol
          "Administrador" de cada workspace individual.
        </p>
      </div>

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
                  <td className="px-4 py-2.5 text-[13px] font-medium text-ink">{s.nombre ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted">{s.email}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">
                    {new Date(s.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {s.user_id === miUserId ? (
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
    </div>
  )
}
