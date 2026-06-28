import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { addPersonaInterna, addPersonaExterna, addPersonaCliente } from '@/features/casos/personasApi'
import { listWorkspaceUsers } from '@/features/users/api'
import { listClientes } from '@/features/clientes/api'
import type { CasoPersona, Cliente, RolPersona, Usuario } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

type Tipo = 'workspace' | 'cliente' | 'externo'

export function AddPersonaModal({
  open,
  onClose,
  casoId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  casoId: string
  onAdded: (p: CasoPersona) => void
}) {
  const [tipo, setTipo] = useState<Tipo>('workspace')
  const [users, setUsers] = useState<Usuario[]>([])
  const [userId, setUserId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [nombreExterno, setNombreExterno] = useState('')
  const [emailExterno, setEmailExterno] = useState('')
  const [rol, setRol] = useState<RolPersona>('abogado')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    listWorkspaceUsers()
      .then((u) => {
        setUsers(u)
        if (u[0]) setUserId(u[0].id)
      })
      .catch(() => {})
    listClientes()
      .then((c) => {
        setClientes(c)
        if (c[0]) setClienteId(c[0].id)
      })
      .catch(() => {})
  }, [open])

  function reset() {
    setTipo('workspace')
    setNombreExterno('')
    setEmailExterno('')
    setRol('abogado')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let persona: CasoPersona
      if (tipo === 'workspace') {
        persona = await addPersonaInterna(casoId, userId, rol)
      } else if (tipo === 'cliente') {
        const cliente = clientes.find((c) => c.id === clienteId)
        persona = await addPersonaCliente(casoId, clienteId, cliente?.nombre ?? '')
      } else {
        persona = await addPersonaExterna(casoId, nombreExterno, emailExterno || null, rol)
      }
      onAdded(persona)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir la persona.')
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
      title="Añadir persona"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-[6px] bg-[#f2f1ee] p-1">
          <button
            type="button"
            onClick={() => setTipo('workspace')}
            className={`flex-1 rounded-[5px] py-1.5 text-[12px] transition ${tipo === 'workspace' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            Del workspace
          </button>
          <button
            type="button"
            onClick={() => setTipo('cliente')}
            className={`flex-1 rounded-[5px] py-1.5 text-[12px] transition ${tipo === 'cliente' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            Cliente registrado
          </button>
          <button
            type="button"
            onClick={() => setTipo('externo')}
            className={`flex-1 rounded-[5px] py-1.5 text-[12px] transition ${tipo === 'externo' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            Externo
          </button>
        </div>

        {tipo === 'workspace' && (
          <div>
            <label className={labelClass}>Persona</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} required>
              {users.length === 0 && <option value="">Sin usuarios disponibles</option>}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} · {u.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === 'cliente' && (
          <div>
            <label className={labelClass}>Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputClass} required>
              {clientes.length === 0 && <option value="">No hay clientes registrados</option>}
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-mute2">
              Se asignará con rol de cliente. Si no está en la lista, créalo primero desde la sección Clientes.
            </p>
          </div>
        )}

        {tipo === 'externo' && (
          <>
            <div>
              <label className={labelClass}>Nombre</label>
              <input required value={nombreExterno} onChange={(e) => setNombreExterno(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Correo (opcional)</label>
              <input
                type="email"
                value={emailExterno}
                onChange={(e) => setEmailExterno(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        {tipo !== 'cliente' && (
          <div>
            <label className={labelClass}>Rol en el caso</label>
            <select value={rol} onChange={(e) => setRol(e.target.value as RolPersona)} className={inputClass}>
              <option value="abogado">Abogado</option>
              <option value="cliente">Cliente</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        )}

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
            className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-[#f2f1ee]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              (tipo === 'workspace' && !userId) ||
              (tipo === 'cliente' && !clienteId)
            }
            className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? 'Añadiendo…' : 'Añadir'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
