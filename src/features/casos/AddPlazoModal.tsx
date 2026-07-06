import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createPlazo } from '@/features/casos/plazosApi'
import type { Plazo, TipoPlazo, Usuario } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function AddPlazoModal({
  open, onClose, casoId, workspaceId, users, onAdded,
}: {
  open: boolean
  onClose: () => void
  casoId: string
  workspaceId: string
  users: Usuario[]
  onAdded: (p: Plazo) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<TipoPlazo>('plazo')
  const [asignadoA, setAsignadoA] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setTitulo(''); setDescripcion(''); setFecha('')
    setTipo('plazo'); setAsignadoA(''); setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const plazo = await createPlazo({
        caso_id: casoId,
        workspace_id: workspaceId,
        titulo,
        descripcion: descripcion || null,
        fecha,
        tipo,
        asignado_a: asignadoA || null,
      })
      onAdded(plazo)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Agregar a la agenda">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoPlazo)} className={inputClass}>
              <option value="audiencia">Audiencia</option>
              <option value="plazo">Plazo</option>
              <option value="tarea">Tarea</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha</label>
            <input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Título</label>
          <input required value={titulo} onChange={e => setTitulo(e.target.value)} className={inputClass}
            placeholder={tipo === 'audiencia' ? 'Ej. Audiencia de juzgamiento' : tipo === 'tarea' ? 'Ej. Enviar escrito' : 'Título'} />
        </div>

        <div>
          <label className={labelClass}>Descripción (opcional)</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className={inputClass} />
        </div>

        {users.length > 0 && (
          <div>
            <label className={labelClass}>Asignar a (opcional)</label>
            <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)} className={inputClass}>
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
        )}

        {error && (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={() => { reset(); onClose() }}
            className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60">
            {loading ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
