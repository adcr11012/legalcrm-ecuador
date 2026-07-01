import { useState } from 'react'
import type { Cliente, EstadoCliente } from '@/types/database'

const ESTADO_LABEL: Record<EstadoCliente, string> = { activo: 'Activo', inactivo: 'Inactivo', potencial: 'Potencial' }
const ESTADO_CLASS: Record<EstadoCliente, string> = {
  activo: 'bg-accent-soft text-accent',
  inactivo: 'bg-soft text-mute2 border border-border',
  potencial: 'bg-purple-soft text-purple',
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function seguimientoVencido(c: Cliente): boolean {
  if (!c.proximo_seguimiento) return false
  return c.proximo_seguimiento <= new Date().toISOString().slice(0, 10)
}

export function ClienteSidebar({
  clientes,
  selectedId,
  onSelect,
}: {
  clientes: Cliente[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<EstadoCliente | 'todos' | 'seguimiento'>('todos')

  const filtered = clientes.filter((c) => {
    if (filtro === 'seguimiento' && !seguimientoVencido(c)) return false
    if (filtro !== 'todos' && filtro !== 'seguimiento' && c.estado !== filtro) return false
    const q = query.toLowerCase()
    if (!q) return true
    return c.nombre.toLowerCase().includes(q)
  })

  const pendientes = clientes.filter(seguimientoVencido).length

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border bg-surface lg:w-[290px]">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1.5 rounded-[6px] bg-soft px-2.5 py-1.5">
          <i className="ti ti-search text-[14px] text-mute2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-mute2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {(['todos', 'activo', 'inactivo'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
                  filtro === f ? 'bg-accent text-white' : 'border border-border text-muted hover:bg-soft'
                }`}
              >
                {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFiltro('potencial')}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
                filtro === 'potencial' ? 'bg-accent text-white' : 'border border-border text-muted hover:bg-soft'
              }`}
            >
              {ESTADO_LABEL['potencial']}
            </button>
            <button
              onClick={() => setFiltro('seguimiento')}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
                filtro === 'seguimiento' ? 'bg-warn text-white' : 'border border-warn/30 bg-warn-soft text-warn'
              }`}
            >
              Seguimiento{pendientes > 0 ? ` (${pendientes})` : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-2.5 border-b border-border/70 px-3.5 py-2.5 text-left transition hover:bg-soft ${
              c.id === selectedId ? 'border-l-[3px] border-l-accent bg-accent-soft' : ''
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {initials(c.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-ink">{c.nombre}</div>
              <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                {ESTADO_LABEL[c.estado]}
              </span>
            </div>
            {seguimientoVencido(c) && (
              <span title="Seguimiento pendiente" className="h-2 w-2 flex-shrink-0 rounded-full bg-warn" />
            )}
          </button>
        ))}

        {filtered.length === 0 && <div className="p-4 text-center text-[12px] text-mute2">Sin resultados.</div>}
      </div>
    </div>
  )
}
