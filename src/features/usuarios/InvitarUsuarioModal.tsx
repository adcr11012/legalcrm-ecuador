import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createInvitacion } from '@/features/usuarios/invitacionesApi'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Invitacion, RolUsuario } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

const ROLES: { value: RolUsuario; label: string; desc: string }[] = [
  { value: 'master',        label: 'Master',        desc: 'Acceso completo excepto gestión de usuarios' },
  { value: 'limitado',      label: 'Limitado',      desc: 'Solo ve los casos que tiene asignados' },
  { value: 'administrador', label: 'Administrador', desc: 'Acceso total al workspace' },
]

export function InvitarUsuarioModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (inv: Invitacion) => void
}) {
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<RolUsuario>('master')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setEmail('')
    setRol('master')
    setError(null)
    setLink(null)
    setCopied(false)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setLoading(true)
    try {
      const inv = await createInvitacion(profile.workspace_id, email, rol)
      onCreated(inv)
      setLink(`${window.location.origin}/invite/${inv.token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Invitar usuario"
    >
      {link ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-[6px] border border-accent/20 bg-accent-soft px-3 py-2.5 text-[12px] text-accent">
            Invitación creada para <strong>{email}</strong>. Comparte este link manualmente con la persona.
          </div>
          <div className="flex gap-2">
            <input readOnly value={link} className={inputClass} onFocus={(e) => e.target.select()} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(link)
                setCopied(true)
              }}
              className="flex-shrink-0 rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted transition hover:bg-soft"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => { reset(); onClose() }}
              className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover"
            >
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="persona@ejemplo.com"
            />
          </div>

          <div>
            <label className={labelClass}>Rol</label>
            <div className="flex flex-col gap-1.5">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-[8px] border px-3 py-2.5 transition ${
                    rol === r.value ? 'border-accent bg-accent-soft' : 'border-border hover:bg-soft'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={r.value}
                    checked={rol === r.value}
                    onChange={() => setRol(r.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="text-[13px] font-medium text-ink">{r.label}</div>
                    <div className="text-[11px] text-muted">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Generar invitación'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
