import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createCaso, updateCaso } from '@/features/casos/api'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Caso, Materia } from '@/types/database'

const MATERIAS: { value: Materia; label: string }[] = [
  { value: 'civil', label: 'Civil' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'familia', label: 'Familia' },
  { value: 'penal', label: 'Penal' },
  { value: 'mercantil', label: 'Mercantil' },
  { value: 'otro', label: 'Otro' },
]

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function CasoFormModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  caso,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (caso: Caso) => void
  onUpdated?: (caso: Caso) => void
  caso?: Caso | null
}) {
  const { profile } = useAuth()
  const editing = Boolean(caso)
  const [titulo, setTitulo] = useState('')
  const [materia, setMateria] = useState<Materia>('civil')
  const [numeroCausa, setNumeroCausa] = useState('')
  const [juzgado, setJuzgado] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitulo(caso?.titulo ?? '')
    setMateria(caso?.materia ?? 'civil')
    setNumeroCausa(caso?.numero_causa ?? '')
    setJuzgado(caso?.juzgado ?? '')
    setFechaInicio(caso?.fecha_inicio ?? '')
    setError(null)
  }, [open, caso])

  function reset() {
    setTitulo('')
    setMateria('civil')
    setNumeroCausa('')
    setJuzgado('')
    setFechaInicio('')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setLoading(true)
    try {
      if (editing && caso) {
        const updated = await updateCaso(caso.id, {
          titulo,
          materia,
          numero_causa: numeroCausa || null,
          juzgado: juzgado || null,
          fecha_inicio: fechaInicio || null,
        })
        onUpdated?.(updated)
      } else {
        const created = await createCaso({
          workspace_id: profile.workspace_id,
          created_by: profile.id,
          titulo,
          materia,
          numero_causa: numeroCausa || null,
          juzgado: juzgado || null,
          fecha_inicio: fechaInicio || null,
        })
        onCreated?.(created)
        reset()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo ${editing ? 'actualizar' : 'crear'} el caso.`)
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
      title={editing ? 'Editar caso' : 'Nuevo caso'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Título del caso</label>
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={inputClass}
            placeholder="Ej. Laboral ENSA S.A."
          />
        </div>

        <div>
          <label className={labelClass}>Materia</label>
          <select value={materia} onChange={(e) => setMateria(e.target.value as Materia)} className={inputClass}>
            {MATERIAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>N° de causa</label>
            <input
              value={numeroCausa}
              onChange={(e) => setNumeroCausa(e.target.value)}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className={labelClass}>Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Juzgado / Tribunal</label>
          <input
            value={juzgado}
            onChange={(e) => setJuzgado(e.target.value)}
            className={inputClass}
            placeholder="Opcional"
          />
        </div>

        {error && (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">
            {error}
          </div>
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
            disabled={loading}
            className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear caso'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
