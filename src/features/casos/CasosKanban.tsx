import { useState } from 'react'
import type { Caso, CasoPersona, Etapa, Usuario } from '@/types/database'
import { nombrePersona, initialsOf } from '@/features/casos/personaDisplay'
import { MATERIA_LABEL } from '@/features/casos/materias'

export function CasosKanban({
  casos,
  etapas,
  personasByCaso,
  usersById,
  onOpen,
  onEtapaChange,
}: {
  casos: Caso[]
  etapas: Etapa[]
  personasByCaso: Map<string, CasoPersona[]>
  usersById: Map<string, Usuario>
  onOpen: (id: string) => void
  onEtapaChange: (id: string, etapaId: string) => void
}) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4 lg:flex-row lg:gap-3 lg:overflow-x-auto lg:overflow-y-hidden">
      {etapas.map((etapa) => {
        const items = casos.filter((c) => c.etapa_id === etapa.id)
        return (
          <div
            key={etapa.id}
            className="w-full flex-shrink-0 lg:w-[210px]"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCol(etapa.id)
            }}
            onDragLeave={() => setDragOverCol((c) => (c === etapa.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/caso-id')
              const fromEtapa = e.dataTransfer.getData('text/from-etapa')
              setDragOverCol(null)
              if (id && fromEtapa !== etapa.id) onEtapaChange(id, etapa.id)
            }}
          >
            <div className="flex items-center justify-between pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {etapa.nombre}
              <span className="rounded-full border border-border bg-soft px-1.5 py-0.5 text-[10px] text-mute2">
                {items.length}
              </span>
            </div>

            <div className={`flex min-h-[40px] flex-col gap-2 rounded-[8px] p-1 transition ${dragOverCol === etapa.id ? 'bg-accent-soft/60' : ''}`}>
              {items.map((c) => {
                const personas = personasByCaso.get(c.id) ?? []
                const abogado = personas.find((p) => p.rol === 'abogado')
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/caso-id', c.id)
                      e.dataTransfer.setData('text/from-etapa', c.etapa_id ?? '')
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
