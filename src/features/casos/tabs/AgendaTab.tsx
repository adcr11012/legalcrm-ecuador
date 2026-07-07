import { useState } from 'react'
import type { Plazo, TipoPlazo, EstadoAgenda, Usuario } from '@/types/database'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS } from '@/features/casos/plazoUrgencia'
import { SemaforoDot } from '@/features/casos/SemaforoDot'
import { updatePlazo, deletePlazo } from '@/features/casos/plazosApi'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TIPO_LABEL: Record<TipoPlazo, string> = {
  audiencia: 'Audiencia',
  plazo:     'Plazo',
  tarea:     'Tarea',
  otro:      'Otro',
}

const TIPO_COLOR: Record<TipoPlazo, string> = {
  audiencia: 'bg-orange-100 text-orange-600',
  plazo:     'bg-danger-soft text-danger',
  tarea:     'bg-accent-soft text-accent',
  otro:      'bg-soft text-muted',
}

const ESTADO_LABEL: Record<EstadoAgenda, string> = {
  pendiente:    'Pendiente',
  en_progreso:  'En progreso',
  completada:   'Completada',
  vencida:      'Vencida',
}

const ESTADO_COLOR: Record<EstadoAgenda, string> = {
  pendiente:   'bg-soft text-muted',
  en_progreso: 'bg-accent-soft text-accent',
  completada:  'bg-success-soft text-success',
  vencida:     'bg-danger-soft text-danger',
}

function calcularEstado(p: Plazo): EstadoAgenda {
  if (p.estado === 'completada') return 'completada'
  if (p.tipo === 'tarea' && p.estado === 'en_progreso') return 'en_progreso'
  if (p.tipo !== 'tarea' && diasRestantes(p.fecha) < 0) return 'vencida'
  return p.estado === 'vencida' ? 'vencida' : p.estado
}

function AgendaItem({
  p, puedeEditar, usersById, onChange, onDelete, onEdit,
}: {
  p: Plazo
  puedeEditar: boolean
  usersById: Map<string, Usuario>
  onChange: (updated: Plazo) => void
  onDelete: (id: string) => void
  onEdit: (p: Plazo) => void
}) {
  const [notaOpen, setNotaOpen] = useState(false)
  const [notaVal, setNotaVal] = useState(p.nota ?? '')
  const [saving, setSaving] = useState(false)

  const dias = diasRestantes(p.fecha)
  const urgencia = clasificarUrgencia(dias)
  const estado = calcularEstado(p)
  const fecha = new Date(p.fecha + 'T00:00:00')
  const asignado = p.asignado_a ? usersById.get(p.asignado_a) : null

  async function cambiarEstado(nuevoEstado: EstadoAgenda) {
    setSaving(true)
    try { onChange(await updatePlazo(p.id, { estado: nuevoEstado })) }
    finally { setSaving(false) }
  }

  async function guardarNota() {
    setSaving(true)
    try { onChange(await updatePlazo(p.id, { nota: notaVal })); setNotaOpen(false) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-3">
        <SemaforoDot urgencia={urgencia} />

        {/* Fecha */}
        <div className="min-w-[40px] text-center">
          <div className="text-[20px] font-bold leading-none text-ink">{fecha.getDate()}</div>
          <div className="text-[10px] uppercase text-mute2">{MESES[fecha.getMonth()]}</div>
        </div>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIPO_COLOR[p.tipo]}`}>
              {TIPO_LABEL[p.tipo]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLOR[estado]}`}>
              {ESTADO_LABEL[estado]}
            </span>
          </div>
          <div className="text-[13px] font-medium text-ink">{p.titulo}</div>
          {p.descripcion && <div className="mt-0.5 text-[11px] text-muted">{p.descripcion}</div>}
          {asignado && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
              <i className="ti ti-user text-[11px]" /> {asignado.nombre}
            </div>
          )}
          {p.nota && (
            <div className="mt-1.5 rounded-[6px] bg-warn-soft px-2 py-1 text-[11px] text-warn">
              <i className="ti ti-notes mr-1" />{p.nota}
            </div>
          )}
        </div>

        {/* Días + acciones */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCIA_CLASS[urgencia]}`}>
            {labelDias(dias)}
          </span>
          {puedeEditar && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(p)}
                className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-soft"
                title="Editar">
                <i className="ti ti-edit text-[12px]" />
              </button>
              {/* Nota (para vencidos o cualquiera) */}
              <button onClick={() => setNotaOpen(v => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-soft"
                title="Agregar nota">
                <i className="ti ti-notes text-[12px]" />
              </button>
              <button onClick={() => onDelete(p.id)}
                className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger"
                title="Eliminar">
                <i className="ti ti-trash text-[12px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Estado inline para tareas */}
      {puedeEditar && p.tipo === 'tarea' && estado !== 'vencida' && (
        <div className="flex gap-1 border-t border-border px-3 py-2">
          {(['pendiente', 'en_progreso', 'completada'] as EstadoAgenda[]).map(s => (
            <button key={s} disabled={saving || estado === s}
              onClick={() => cambiarEstado(s)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${estado === s ? ESTADO_COLOR[s] : 'bg-soft text-muted hover:bg-soft/80'}`}>
              {ESTADO_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {/* Nota inline */}
      {notaOpen && (
        <div className="flex gap-2 border-t border-border px-3 py-2">
          <input
            autoFocus
            value={notaVal}
            onChange={e => setNotaVal(e.target.value)}
            placeholder="Agregar nota…"
            className="flex-1 rounded-[6px] border border-border bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
            onKeyDown={e => { if (e.key === 'Enter') guardarNota(); if (e.key === 'Escape') setNotaOpen(false) }}
          />
          <button onClick={guardarNota} disabled={saving}
            className="rounded-[6px] bg-accent px-2.5 py-1 text-[11px] text-white disabled:opacity-50">
            {saving ? '…' : 'Guardar'}
          </button>
          <button onClick={() => setNotaOpen(false)} className="text-muted hover:text-ink">
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
      )}
    </div>
  )
}

export function AgendaTab({
  plazos: plazosInit, casoId: _casoId, workspaceId: _workspaceId, puedeEditar, usersById, users: _users, onOpenAdd, onOpenEdit, onPlazosChange,
}: {
  plazos: Plazo[]
  casoId: string
  workspaceId: string
  puedeEditar: boolean
  usersById: Map<string, Usuario>
  users: Usuario[]
  onOpenAdd: () => void
  onOpenEdit: (p: Plazo) => void
  onPlazosChange: (plazos: Plazo[]) => void
}) {
  const [plazos, setPlazos] = useState(plazosInit)

  function handleChange(updated: Plazo) {
    const next = plazos.map(p => p.id === updated.id ? updated : p)
    setPlazos(next)
    onPlazosChange(next)
  }

  async function handleDelete(id: string) {
    await deletePlazo(id)
    const next = plazos.filter(p => p.id !== id)
    setPlazos(next)
    onPlazosChange(next)
  }

  // Ordenar: primero pendientes por fecha, luego completadas/vencidas
  const activos = plazos.filter(p => calcularEstado(p) !== 'completada').sort((a, b) => a.fecha.localeCompare(b.fecha))
  const cerrados = plazos.filter(p => calcularEstado(p) === 'completada').sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="flex flex-col gap-2">
      {activos.map(p => (
        <AgendaItem key={p.id} p={p} puedeEditar={puedeEditar} usersById={usersById} onChange={handleChange} onDelete={handleDelete} onEdit={onOpenEdit} />
      ))}

      {cerrados.length > 0 && (
        <>
          <div className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-mute2">Completados</div>
          {cerrados.map(p => (
            <AgendaItem key={p.id} p={p} puedeEditar={puedeEditar} usersById={usersById} onChange={handleChange} onDelete={handleDelete} onEdit={onOpenEdit} />
          ))}
        </>
      )}

      {plazos.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin eventos en la agenda.
        </div>
      )}

      {puedeEditar && (
        <button onClick={onOpenAdd}
          className="mt-1 inline-flex items-center gap-1.5 self-start rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft">
          <i className="ti ti-plus" /> Agregar
        </button>
      )}
    </div>
  )
}
