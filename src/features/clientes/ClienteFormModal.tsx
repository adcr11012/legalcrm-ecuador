import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createCliente, updateCliente } from '@/features/clientes/api'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Cliente, EstadoCliente, TipoCliente } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function ClienteFormModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  cliente,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (c: Cliente) => void
  onUpdated?: (c: Cliente) => void
  cliente?: Cliente | null
}) {
  const { profile } = useAuth()
  const editing = Boolean(cliente)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCliente>('persona_natural')
  const [estado, setEstado] = useState<EstadoCliente>('activo')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [etiquetas, setEtiquetas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre(cliente?.nombre ?? '')
    setTipo(cliente?.tipo ?? 'persona_natural')
    setEstado(cliente?.estado ?? 'activo')
    setEmail(cliente?.email ?? '')
    setTelefono(cliente?.telefono ?? '')
    setEtiquetas(cliente?.etiquetas.join(', ') ?? '')
    setError(null)
  }, [open, cliente])

  function reset() {
    setNombre('')
    setTipo('persona_natural')
    setEstado('activo')
    setEmail('')
    setTelefono('')
    setEtiquetas('')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setLoading(true)
    const etiquetasArr = etiquetas
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      if (editing && cliente) {
        const updated = await updateCliente(cliente.id, {
          nombre,
          tipo,
          estado,
          email: email || null,
          telefono: telefono || null,
          etiquetas: etiquetasArr,
        })
        onUpdated?.(updated)
      } else {
        const created = await createCliente({
          workspace_id: profile.workspace_id,
          nombre,
          tipo,
          email: email || null,
          telefono: telefono || null,
          etiquetas: etiquetasArr,
        })
        onCreated?.(created)
        reset()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo ${editing ? 'actualizar' : 'crear'} el cliente.`)
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
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} placeholder="Ej. ENSA S.A." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)} className={inputClass}>
              <option value="persona_natural">Persona natural</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoCliente)} className={inputClass}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="potencial">Potencial</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Correo (opcional)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono (opcional)</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Etiquetas (separadas por coma)</label>
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} className={inputClass} placeholder="Corporativo, VIP" />
        </div>

        {error && (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
