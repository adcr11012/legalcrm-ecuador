import { useState } from 'react'
import type { Caso, CasoPersona, EstadoCaso, Usuario } from '@/types/database'
import { ESTADO_LABEL } from '@/features/casos/estado'
import { nombrePersona, initialsOf } from '@/features/casos/personaDisplay'
import { MATERIA_LABEL } from '@/features/casos/materias'

const COLUMNS: EstadoCaso[] = ['nuevo', 'activo', 'en_espera', 'audiencia_proxima', 'resuelto', 'archivado']

export function CasosKanban({
  casos,
  personasByCaso,
  usersById,
  onOpen,
  onEstadoChange,
}: {
  casos: Caso[]
  personasByCaso: Map<string, CasoPersona[]>
  usersById: Map<string, Usuario>
  onOpen: (id: string) => void
  onEstadoChange: (id: string, estado: EstadoCaso) => void
}) {
  const [dragOverCol, setDragOverCol] = useState<EstadoCaso | null>(null)

  return (
    <div className="flex flex-1 gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const items = casos.filter((c) => c.estado === col)
        return (
          <div
            key={col}
            className="w-[210px] flex-shrink-0"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCol(col)
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/caso-id')
              const fromEstado = e.dataTransfer.getData('text/from-estado')
              setDragOverCol(null)
              if (id && fromEstado !== col) onEstadoChange(id, col)
            }}
          >
            <div className="flex items-center justify-between pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {ESTADO_LABEL[col]}
              <span className="rounded-full border border-border bg-[#f2f1ee] px-1.5 py-0.5 text-[10px] text-mute2">
                {items.length}
              </span>
            </div>

            <div className={`flex min-h-[40px] flex-col gap-2 rounded-[8px] p-1 transition ${dragOverCol === col ? 'bg-accent-soft/60' : ''}`}>
              {items.map((c) => {
                const personas = personasByCaso.get(c.id) ?? []
                const abogado = personas.find((p) => p.rol === 'abogado')
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/caso-id', c.id)
                      e.dataTransfer.setData('text/from-estado', c.estado)
                    }}
                    onClick={() => onOpen(c.id)}
                    className="cursor-pointer rounded-[10px] border border-border bg-surface p-3 transition hover:-translate-y-px hover:border-accent hover:shadow-md"
                  >
                    <div className="text-[13px] font-semibold leading-snug text-ink">{c.titulo}</div>
                    <div className="mt-0.5 text-[11px] text-mute2">{MATERIA_LABEL[c.materia ?? 'otro']}</div>
                    <div className="mt-2 flex items-center justify-between">
                      {abogado ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[8px] font-semibold text-accent">
                            {initialsOf(nombrePersona(abogado, usersById))}
                          </div>
                          <span className="text-[11px] text-muted">{nombrePersona(abogado, usersById).split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-mute2">Sin abogado</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {items.length === 0 && (
                <div className="rounded-[8px] border border-dashed border-border/70 p-3 text-center text-[11px] text-mute2">
                  Sin casos
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
