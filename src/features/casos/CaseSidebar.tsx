import { useState } from 'react'
import type { Caso } from '@/types/database'
import { EstadoPill } from '@/features/casos/estado'
import { MATERIA_LABEL } from '@/features/casos/materias'

export function CaseSidebar({
  casos,
  selectedId,
  onSelect,
}: {
  casos: Caso[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = casos.filter((c) => {
    const q = query.toLowerCase()
    if (!q) return true
    return c.titulo.toLowerCase().includes(q) || (c.materia ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border bg-surface lg:w-[270px]">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-1.5 rounded-[6px] bg-[#f2f1ee] px-2.5 py-1.5">
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
              <EstadoPill estado={c.estado} />
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
