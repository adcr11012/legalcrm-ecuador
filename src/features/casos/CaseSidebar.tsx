import { useState } from 'react'
import type { Caso, Etapa } from '@/types/database'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { MATERIA_LABEL } from '@/features/casos/materias'
import { useDevice } from '@/context/DeviceModeContext'

export function CaseSidebar({
  casos,
  etapasById,
  selectedId,
  onSelect,
}: {
  casos: Caso[]
  etapasById: Map<string, Etapa>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const { isMobile } = useDevice()

  const filtered = casos.filter((c) => {
    const q = query.toLowerCase()
    if (!q) return true
    return c.titulo.toLowerCase().includes(q) || (c.materia ?? '').toLowerCase().includes(q)
  })

  if (isMobile) {
    return (
      <div className="flex h-full w-full flex-col bg-bg">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-[10px] bg-surface border border-border px-3 py-2.5">
            <i className="ti ti-search text-[16px] text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar caso..."
              className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-[76px] space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`block w-full rounded-[12px] border p-4 text-left transition ${
                c.id === selectedId
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:bg-soft'
              }`}
            >
              <div className="text-[15px] font-semibold text-ink leading-snug">{c.titulo}</div>
              <div className="mt-1 text-[13px] text-muted">{MATERIA_LABEL[c.materia ?? 'otro']}</div>
              <div className="mt-2">
                <EtapaPill etapa={c.etapa_id ? etapasById.get(c.etapa_id) : null} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[14px] text-muted">Sin resultados.</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border bg-surface lg:w-[270px]">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-1.5 rounded-[6px] bg-soft px-2.5 py-1.5">
          <i className="ti ti-search text-[14px] text-mute2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar caso..."
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-mute2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`block w-full border-b border-border/70 px-3.5 py-2.5 text-left transition hover:bg-bg ${
              c.id === selectedId ? 'border-l-[3px] border-l-accent bg-accent-soft' : ''
            }`}
          >
            <div className="text-[12px] font-semibold text-ink">{c.titulo}</div>
            <div className="mt-0.5 text-[11px] text-muted">{MATERIA_LABEL[c.materia ?? 'otro']}</div>
            <div className="mt-1.5">
              <EtapaPill etapa={c.etapa_id ? etapasById.get(c.etapa_id) : null} />
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="p-4 text-center text-[12px] text-mute2">Sin resultados.</div>
        )}
      </div>
    </div>
  )
}
