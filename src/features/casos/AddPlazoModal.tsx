import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createPlazo, updatePlazo } from '@/features/casos/plazosApi'
import { listPersonasConEmail, type PersonaConEmail } from '@/features/casos/personasApi'
import type { Plazo, TipoPlazo, Usuario } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function AddPlazoModal({
  open, onClose, casoId, workspaceId, users, plazo, onAdded, onUpdated,
}: {
  open: boolean
  onClose: () => void
  casoId: string
  workspaceId: string
  users: Usuario[]
  plazo?: Plazo | null
  onAdded: (p: Plazo) => void
  onUpdated?: (p: Plazo) => void
}) {
  const editing = Boolean(plazo)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<TipoPlazo>('plazo')
  const [asignadoA, setAsignadoA] = useState('')
  const [personas, setPersonas] = useState<PersonaConEmail[]>([])
  const [notificarA, setNotificarA] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    listPersonasConEmail(casoId).then(setPersonas).catch(() => {})
  }, [open, casoId])

  useEffect(() => {
    if (!open) return
    if (plazo) {
      setTitulo(plazo.titulo)
      setDescripcion(plazo.descripcion ?? '')
      setFecha(plazo.fecha)
      setTipo(plazo.tipo)
      setAsignadoA(plazo.asignado_a ?? '')
      setNotificarA(new Set(plazo.notificar_a ?? []))
    } else {
      setTitulo(''); setDescripcion(''); setFecha('')
      setTipo('plazo'); setAsignadoA(''); setNotificarA(new Set())
    }
    setError(null)
    setSyncWarning(null)
  }, [open, plazo])

  useEffect(() => {
    if (!asignadoA || editing) return
    const persona = personas.find((p) => p.userId === asignadoA)
    if (persona) setNotificarA((prev) => new Set(prev).add(persona.casoPersonaId))
  }, [asignadoA, personas, editing])

  function reset() {
    setTitulo(''); setDescripcion(''); setFecha('')
    setTipo('plazo'); setAsignadoA(''); setNotificarA(new Set()); setError(null)
  }

  function toggleNotificar(id: string) {
    setNotificarA((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSyncWarning(null)
    setLoading(true)
    try {
      const notificarSeleccionados = notificarA.size > 0
      if (editing && plazo) {
        const updated = await updatePlazo(plazo.id, {
          titulo,
          descripcion: descripcion || null,
          fecha,
          tipo,
          asignado_a: asignadoA || null,
          notificar_a: Array.from(notificarA),
        })
        onUpdated?.(updated)
        if (notificarSeleccionados && updated._calendarSync && !updated._calendarSync.sincronizado) {
          setSyncWarning(updated._calendarSync.motivo ?? 'No se pudo sincronizar con Google Calendar.')
          setLoading(false)
          return
        }
      } else {
        const nuevo = await createPlazo({
          caso_id: casoId,
          workspace_id: workspaceId,
          titulo,
          descripcion: descripcion || null,
          fecha,
          tipo,
          asignado_a: asignadoA || null,
          notificar_a: Array.from(notificarA),
        })
        onAdded(nuevo)
        if (notificarSeleccionados && nuevo._calendarSync && !nuevo._calendarSync.sincronizado) {
          setSyncWarning(nuevo._calendarSync.motivo ?? 'No se pudo sincronizar con Google Calendar.')
          setLoading(false)
          return
        }
      }
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={editing ? 'Editar agenda' : 'Agregar a la agenda'}>
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

        {personas.length > 0 && (
          <div>
            <label className={labelClass}>Notificar a (Google Calendar)</label>
            <div className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-bg p-2.5">
              {personas.map((p) => (
                <label key={p.casoPersonaId} className="flex items-center gap-2 text-[12px] text-ink">
                  <input
                    type="checkbox"
                    checked={notificarA.has(p.casoPersonaId)}
                    onChange={() => toggleNotificar(p.casoPersonaId)}
                    disabled={!p.email}
                  />
                  <span className={!p.email ? 'text-mute2' : ''}>
                    {p.nombre}{!p.email && ' (sin email registrado)'}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-mute2">
              Se enviará una invitación de Google Calendar a los seleccionados, si la cuenta de Google está conectada.
            </p>
          </div>
        )}

        {syncWarning && (
          <div className="rounded-[6px] border border-warn/20 bg-warn-soft px-3 py-2 text-[12px] text-warn">
            El {editing ? 'plazo se actualizó' : 'plazo se guardó'}, pero no se pudo sincronizar con Google Calendar: {syncWarning}
          </div>
        )}

        {error && (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={() => { reset(); onClose() }}
            className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft">
            {syncWarning ? 'Cerrar' : 'Cancelar'}
          </button>
          {!syncWarning && (
            <button type="submit" disabled={loading}
              className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60">
              {loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
