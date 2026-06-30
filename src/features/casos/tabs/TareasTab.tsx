import { useState, type FormEvent } from 'react'
import { createTarea, updateEstadoTarea, deleteTarea } from '@/features/casos/tareasApi'
import type { EstadoTarea, Tarea, Usuario } from '@/types/database'

const ESTADO_CONFIG: Record<EstadoTarea, { label: string; icon: string; class: string }> = {
  pendiente:   { label: 'Pendiente',    icon: 'ti-circle',       class: 'text-muted bg-soft' },
  en_progreso: { label: 'En progreso',  icon: 'ti-loader',       class: 'text-warn bg-warn-soft' },
  completada:  { label: 'Completada',   icon: 'ti-circle-check', class: 'text-success bg-success-soft' },
}

const ESTADOS: EstadoTarea[] = ['pendiente', 'en_progreso', 'completada']

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-mute2'

export function TareasTab({
  tareas,
  casoId,
  workspaceId,
  puedeEditar,
  usersById,
  onTareasChange,
}: {
  tareas: Tarea[]
  casoId: string
  workspaceId: string
  puedeEditar: boolean
  usersById: Map<string, Usuario>
  onTareasChange: (tareas: Tarea[]) => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setSaving(true)
    setError(null)
    try {
      const nueva = await createTarea({
        caso_id: casoId,
        workspace_id: workspaceId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        asignado_a: asignadoA || null,
        fecha_limite: fechaLimite || null,
      })
      onTareasChange([...tareas, nueva])
      setTitulo('')
      setDescripcion('')
      setAsignadoA('')
      setFechaLimite('')
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.')
    } finally {
      setSaving(false)
    }
  }

  async function onCambiarEstado(tarea: Tarea, estado: EstadoTarea) {
    const updated = await updateEstadoTarea(tarea.id, estado)
    onTareasChange(tareas.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function onEliminar(id: string) {
    await deleteTarea(id)
    onTareasChange(tareas.filter((t) => t.id !== id))
  }

  const pendientes = tareas.filter((t) => t.estado !== 'completada')
  const completadas = tareas.filter((t) => t.estado === 'completada')

  return (
    <div className="flex flex-col gap-3">
      {/* Lista de tareas activas */}
      {pendientes.map((t) => (
        <TareaCard
          key={t.id}
          tarea={t}
          usersById={usersById}
          puedeEditar={puedeEditar}
          onCambiarEstado={onCambiarEstado}
          onEliminar={onEliminar}
        />
      ))}

      {pendientes.length === 0 && !formOpen && (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin tareas pendientes.
        </div>
      )}

      {/* Formulario nueva tarea */}
      {formOpen ? (
        <form onSubmit={onSubmit} className="rounded-[10px] border border-accent/30 bg-surface p-4 flex flex-col gap-3">
          <div className="text-[12px] font-semibold text-ink">Nueva tarea</div>
          <div>
            <label className={labelClass}>Título *</label>
            <input
              autoFocus
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Sacar certificado del registro civil"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Asignar a</label>
              <select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} className={inputClass}>
                <option value="">Sin asignar</option>
                {Array.from(usersById.values()).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha límite</label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {error && <div className="text-[11px] text-danger">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !titulo.trim()}
              className="rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Crear tarea'}
            </button>
          </div>
        </form>
      ) : (
        puedeEditar && (
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-plus" /> Nueva tarea
          </button>
        )
      )}

      {/* Tareas completadas colapsadas */}
      {completadas.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-mute2 hover:text-ink">
            {completadas.length} tarea{completadas.length !== 1 ? 's' : ''} completada{completadas.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {completadas.map((t) => (
              <TareaCard
                key={t.id}
                tarea={t}
                usersById={usersById}
                puedeEditar={puedeEditar}
                onCambiarEstado={onCambiarEstado}
                onEliminar={onEliminar}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function TareaCard({
  tarea,
  usersById,
  puedeEditar,
  onCambiarEstado,
  onEliminar,
}: {
  tarea: Tarea
  usersById: Map<string, Usuario>
  puedeEditar: boolean
  onCambiarEstado: (t: Tarea, e: EstadoTarea) => Promise<void>
  onEliminar: (id: string) => Promise<void>
}) {
  const cfg = ESTADO_CONFIG[tarea.estado]
  const asignado = tarea.asignado_a ? usersById.get(tarea.asignado_a) : null
  const vencida =
    tarea.fecha_limite &&
    tarea.estado !== 'completada' &&
    tarea.fecha_limite < new Date().toISOString().slice(0, 10)

  return (
    <div className={`group flex items-start gap-3 rounded-[10px] border bg-surface px-4 py-3 ${vencida ? 'border-danger/40' : 'border-border'}`}>
      {/* Selector de estado */}
      <div className="mt-0.5 flex-shrink-0">
        <select
          value={tarea.estado}
          disabled={!puedeEditar}
          onChange={(e) => onCambiarEstado(tarea, e.target.value as EstadoTarea)}
          className={`cursor-pointer rounded-full border-0 py-0.5 pl-1.5 pr-5 text-[10px] font-medium outline-none disabled:cursor-default ${cfg.class}`}
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>{ESTADO_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium ${tarea.estado === 'completada' ? 'text-muted line-through' : 'text-ink'}`}>
          {tarea.titulo}
        </div>
        {tarea.descripcion && (
          <div className="mt-0.5 text-[11px] text-muted">{tarea.descripcion}</div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {asignado && (
            <span className="flex items-center gap-1 text-[11px] text-mute2">
              <i className="ti ti-user text-[11px]" />
              {asignado.nombre}
            </span>
          )}
          {tarea.fecha_limite && (
            <span className={`flex items-center gap-1 text-[11px] ${vencida ? 'font-medium text-danger' : 'text-mute2'}`}>
              <i className="ti ti-calendar text-[11px]" />
              {new Date(tarea.fecha_limite + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
              {vencida && ' · Vencida'}
            </span>
          )}
        </div>
      </div>

      {/* Eliminar */}
      {puedeEditar && (
        <button
          onClick={() => onEliminar(tarea.id)}
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border border-border text-muted opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
        >
          <i className="ti ti-trash text-[13px]" />
        </button>
      )}
    </div>
  )
}
