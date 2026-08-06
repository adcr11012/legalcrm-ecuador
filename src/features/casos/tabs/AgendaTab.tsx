import { useState } from 'react'
import type { Plazo, TipoPlazo, EstadoAgenda, Usuario } from '@/types/database'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS } from '@/features/casos/plazoUrgencia'
import { UrgenciaBars } from '@/features/casos/UrgenciaBars'
import { updatePlazo, deletePlazo } from '@/features/casos/plazosApi'
import { useDevice } from '@/context/DeviceModeContext'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TIPO_LABEL: Record<TipoPlazo, string> = {
  audiencia:    'Audiencia',
  plazo:        'Plazo',
  tarea:        'Tarea',
  prejudicial:  'Gestión prejudicial',
  otro:         'Otro',
}

const TIPO_COLOR: Record<TipoPlazo, string> = {
  audiencia:    'bg-orange-100 text-orange-600',
  plazo:        'bg-danger-soft text-danger',
  tarea:        'bg-accent-soft text-accent',
  prejudicial:  'bg-purple-soft text-purple',
  otro:         'bg-soft text-muted',
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
  const { isMobile } = useDevice()

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

  const notaBlock = notaOpen && (
    <div className={`flex gap-2 border-t border-border ${isMobile ? 'px-3.5 py-3' : 'px-3 py-2'}`}>
      <input
        autoFocus
        value={notaVal}
        onChange={e => setNotaVal(e.target.value)}
        placeholder="Agregar nota…"
        className={`flex-1 rounded-[8px] border border-border bg-bg text-ink outline-none focus:border-accent ${isMobile ? 'px-3 py-2 text-[14px]' : 'px-2 py-1 text-[12px]'}`}
        onKeyDown={e => { if (e.key === 'Enter') guardarNota(); if (e.key === 'Escape') setNotaOpen(false) }}
      />
      <button onClick={guardarNota} disabled={saving}
        className={`rounded-[8px] bg-accent text-white disabled:opacity-50 ${isMobile ? 'px-3 py-2 text-[13px]' : 'px-2.5 py-1 text-[11px]'}`}>
        {saving ? '…' : 'Guardar'}
      </button>
      <button onClick={() => setNotaOpen(false)} className="flex items-center text-muted hover:text-ink">
        <i className={`ti ti-x ${isMobile ? 'text-[18px]' : 'text-[14px]'}`} />
      </button>
    </div>
  )

  const estadoTareaBlock = puedeEditar && p.tipo === 'tarea' && estado !== 'vencida' && (
    <div className={`flex gap-1.5 border-t border-border ${isMobile ? 'flex-wrap px-3.5 py-2.5' : 'px-3 py-2'}`}>
      {(['pendiente', 'en_progreso', 'completada'] as EstadoAgenda[]).map(s => (
        <button key={s} disabled={saving || estado === s}
          onClick={() => cambiarEstado(s)}
          className={`rounded-full font-medium transition ${estado === s ? ESTADO_COLOR[s] : 'bg-soft text-muted hover:bg-soft/80'} ${isMobile ? 'px-3 py-1.5 text-[13.5px]' : 'px-2.5 py-0.5 text-[10px]'}`}>
          {ESTADO_LABEL[s]}
        </button>
      ))}
    </div>
  )

  if (isMobile) {
    return (
      <div className="rounded-[14px] border border-border bg-surface">
        <div className="flex items-start gap-3 px-3.5 py-3.5">
          <UrgenciaBars urgencia={urgencia} height={48} />
          <div className="flex flex-shrink-0 flex-col items-center rounded-[10px] bg-soft px-2.5 py-1.5">
            <div className="text-[20px] font-bold leading-none text-ink">{fecha.getDate()}</div>
            <div className="text-[11.5px] font-medium uppercase text-mute2">{MESES[fecha.getMonth()]}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold leading-snug text-ink">{p.titulo}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${TIPO_COLOR[p.tipo]}`}>
                {TIPO_LABEL[p.tipo]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ESTADO_COLOR[estado]}`}>
                {ESTADO_LABEL[estado]}
              </span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-medium ${URGENCIA_CLASS[urgencia]}`}>
                {labelDias(dias)}
              </span>
            </div>
            {p.descripcion && <div className="mt-1.5 text-[14px] leading-snug text-muted">{p.descripcion}</div>}
            {asignado && (
              <div className="mt-1.5 flex items-center gap-1 text-[13.5px] text-muted">
                <i className="ti ti-user text-[13px]" /> {asignado.nombre}
              </div>
            )}
            {p.nota && (
              <div className="mt-2 rounded-[8px] bg-warn-soft px-2.5 py-1.5 text-[13.5px] text-warn">
                <i className="ti ti-notes mr-1" />{p.nota}
              </div>
            )}
          </div>
        </div>

        {puedeEditar && (
          <div className="flex gap-2 border-t border-border px-3.5 py-2.5">
            <button onClick={() => onEdit(p)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-border text-[14px] font-medium text-muted transition active:bg-soft">
              <i className="ti ti-edit text-[15px]" /> Editar
            </button>
            <button onClick={() => setNotaOpen(v => !v)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-border text-[14px] font-medium text-muted transition active:bg-soft">
              <i className="ti ti-notes text-[15px]" /> Nota
            </button>
            <button onClick={() => onDelete(p.id)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border border-border text-muted transition active:bg-danger-soft active:text-danger">
              <i className="ti ti-trash text-[15px]" />
            </button>
          </div>
        )}

        {estadoTareaBlock}
        {notaBlock}
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-3">
        <UrgenciaBars urgencia={urgencia} height={40} />

        {/* Fecha */}
        <div className="min-w-[40px] text-center">
          <div className="text-[20px] font-bold leading-none text-ink">{fecha.getDate()}</div>
          <div className="text-[10px] uppercase text-mute2">{MESES[fecha.getMonth()]}</div>
          <div className="text-[9px] text-mute2">{fecha.getFullYear()}</div>
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

      {estadoTareaBlock}
      {notaBlock}
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
  const { isMobile } = useDevice()

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
          className={`mt-1 inline-flex items-center gap-1.5 self-start rounded-[8px] border border-border text-muted transition hover:bg-soft ${isMobile ? 'w-full justify-center px-3 py-2.5 text-[15px]' : 'px-3 py-1.5 text-[12px]'}`}>
          <i className="ti ti-plus" /> Agregar
        </button>
      )}
    </div>
  )
}
