import { useEffect, useState } from 'react'
import type { Caso, CasoPersona, EstadoCaso, Usuario } from '@/types/database'
import { ESTADO_LABEL } from '@/features/casos/estado'
import { nombrePersona, initialsOf } from '@/features/casos/personaDisplay'

const ROL_LABEL: Record<string, string> = { abogado: 'Abogado', cliente: 'Cliente', otro: 'Otro' }

const fieldInputClass =
  'mt-1 w-full rounded-[6px] border border-border bg-bg px-1.5 py-1 text-[13px] font-medium text-ink outline-none focus:border-accent'

export function InfoTab({
  caso,
  personas,
  usersById,
  puedeEditar,
  onChangeEstado,
  onUpdateCampo,
  onOpenAddPersona,
  onRemovePersona,
}: {
  caso: Caso
  personas: CasoPersona[]
  usersById: Map<string, Usuario>
  puedeEditar: boolean
  onChangeEstado: (estado: EstadoCaso) => void
  onUpdateCampo: (patch: Partial<Caso>) => void
  onOpenAddPersona: () => void
  onRemovePersona: (id: string) => void
}) {
  const [numeroCausa, setNumeroCausa] = useState(caso.numero_causa ?? '')
  const [juzgado, setJuzgado] = useState(caso.juzgado ?? '')
  const [fechaInicio, setFechaInicio] = useState(caso.fecha_inicio ?? '')

  // Solo resincroniza cuando cambia el caso seleccionado, no en cada guardado propio.
  useEffect(() => {
    setNumeroCausa(caso.numero_causa ?? '')
    setJuzgado(caso.juzgado ?? '')
    setFechaInicio(caso.fecha_inicio ?? '')
  }, [caso.id])

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">N° de causa</div>
          {puedeEditar ? (
            <input
              value={numeroCausa}
              onChange={(e) => setNumeroCausa(e.target.value)}
              onBlur={() => {
                if (numeroCausa !== (caso.numero_causa ?? '')) onUpdateCampo({ numero_causa: numeroCausa || null })
              }}
              placeholder="Sin registrar"
              className={fieldInputClass}
            />
          ) : (
            <div className={`mt-1 text-[13px] font-medium ${caso.numero_causa ? 'text-ink' : 'italic text-muted'}`}>
              {caso.numero_causa || 'Sin registrar'}
            </div>
          )}
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Fecha de inicio</div>
          {puedeEditar ? (
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value)
                onUpdateCampo({ fecha_inicio: e.target.value || null })
              }}
              className={fieldInputClass}
            />
          ) : (
            <div className="mt-1 text-[13px] font-medium text-ink">{caso.fecha_inicio || '—'}</div>
          )}
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Estado</div>
          {puedeEditar ? (
            <select
              value={caso.estado}
              onChange={(e) => onChangeEstado(e.target.value as EstadoCaso)}
              className={fieldInputClass}
            >
              {Object.entries(ESTADO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1 text-[13px] font-medium text-ink">{ESTADO_LABEL[caso.estado]}</div>
          )}
        </div>
        <div className="col-span-3 rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Juzgado / Tribunal</div>
          {puedeEditar ? (
            <input
              value={juzgado}
              onChange={(e) => setJuzgado(e.target.value)}
              onBlur={() => {
                if (juzgado !== (caso.juzgado ?? '')) onUpdateCampo({ juzgado: juzgado || null })
              }}
              placeholder="Sin asignar"
              className={fieldInputClass}
            />
          ) : (
            <div className={`mt-1 text-[13px] font-medium ${caso.juzgado ? 'text-ink' : 'italic text-muted'}`}>
              {caso.juzgado || 'Sin asignar'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Personas asignadas</div>
      <div className="flex flex-wrap gap-2">
        {personas.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {initialsOf(nombrePersona(p, usersById))}
            </div>
            <div>
              <div className="text-[12px] font-medium text-ink">{nombrePersona(p, usersById)}</div>
              <div className="text-[10px] text-mute2">{ROL_LABEL[p.rol]}</div>
            </div>
            {puedeEditar && (
              <button
                onClick={() => onRemovePersona(p.id)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-mute2 opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
              >
                <i className="ti ti-x text-[12px]" />
              </button>
            )}
          </div>
        ))}
        {personas.length === 0 && (
          <span className="text-[12px] italic text-mute2">Sin personas asignadas.</span>
        )}
        {puedeEditar && (
          <button
            onClick={onOpenAddPersona}
            className="flex items-center gap-1.5 rounded-[10px] border border-dashed border-border px-3 py-2 text-[12px] text-muted transition hover:border-accent hover:text-accent"
          >
            <i className="ti ti-plus" /> Añadir persona
          </button>
        )}
      </div>
    </div>
  )
}
