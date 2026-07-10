import { useEffect, useState } from 'react'
import type { Caso, Etapa } from '@/types/database'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { MATERIA_LABEL } from '@/features/casos/materias'
import { useDevice } from '@/context/DeviceModeContext'
import { URGENCIA_DOT, type Urgencia } from '@/features/casos/plazoUrgencia'

const URGENCIA_LABEL: Record<Urgencia, string> = { rojo: 'Vencido/urgente', amarillo: 'Próximo', verde: 'Sin apuro' }
const ORDEN_OPTS = [
  { value: 'reciente', label: 'Más reciente' },
  { value: 'antiguo', label: 'Más antiguo' },
] as const
type Orden = (typeof ORDEN_OPTS)[number]['value']

export function CaseSidebar({
  casos,
  etapas,
  etapasById,
  urgenciaByCaso,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
  loadingMore,
  onFiltroActivo,
}: {
  casos: Caso[]
  etapas?: Etapa[]
  etapasById: Map<string, Etapa>
  urgenciaByCaso?: Map<string, Urgencia>
  selectedId: string | null
  onSelect: (id: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  onFiltroActivo?: () => void
}) {
  const [query, setQuery] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [urgencia, setUrgencia] = useState<Urgencia | null>(null)
  const [materia, setMateria] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [orden, setOrden] = useState<Orden>('reciente')
  const { isMobile } = useDevice()

  const filtrosActivos = Boolean(urgencia || materia || etapaId)

  useEffect(() => {
    if (filtrosActivos) onFiltroActivo?.()
  }, [filtrosActivos, onFiltroActivo])

  function limpiarFiltros() {
    setUrgencia(null)
    setMateria('')
    setEtapaId('')
    setOrden('reciente')
  }

  let filtered = casos.filter((c) => {
    const q = query.toLowerCase()
    if (q && !c.titulo.toLowerCase().includes(q) && !(c.materia ?? '').toLowerCase().includes(q)) return false
    if (urgencia && urgenciaByCaso?.get(c.id) !== urgencia) return false
    if (materia && c.materia !== materia) return false
    if (etapaId && c.etapa_id !== etapaId) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at).getTime()
    const db = new Date(b.created_at).getTime()
    return orden === 'reciente' ? db - da : da - db
  })

  const FiltroPanel = (
    <div className="absolute right-0 top-full z-10 mt-1.5 w-[260px] rounded-[10px] border border-border bg-surface p-3 shadow-lg">
      <div className="mb-2.5">
        <label className="mb-1 block text-[10px] font-medium text-mute2">Urgencia</label>
        <div className="flex flex-wrap gap-1.5">
          {(['rojo', 'amarillo', 'verde'] as Urgencia[]).map((u) => (
            <button
              key={u}
              onClick={() => setUrgencia(urgencia === u ? null : u)}
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition ${
                urgencia === u ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:bg-soft'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${URGENCIA_DOT[u]}`} />
              {URGENCIA_LABEL[u]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2.5">
        <label className="mb-1 block text-[10px] font-medium text-mute2">Materia</label>
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="w-full rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none"
        >
          <option value="">Todas</option>
          {Object.entries(MATERIA_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {etapas && etapas.length > 0 && (
        <div className="mb-2.5">
          <label className="mb-1 block text-[10px] font-medium text-mute2">Etapa</label>
          <select
            value={etapaId}
            onChange={(e) => setEtapaId(e.target.value)}
            className="w-full rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none"
          >
            <option value="">Todas</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-1">
        <label className="mb-1 block text-[10px] font-medium text-mute2">Ordenar por</label>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="w-full rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none"
        >
          {ORDEN_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filtrosActivos && (
        <button onClick={limpiarFiltros} className="mt-2 w-full rounded-[6px] border border-border py-1.5 text-[11px] text-muted transition hover:bg-soft">
          Limpiar filtros
        </button>
      )}
    </div>
  )

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
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <EtapaPill etapa={c.etapa_id ? etapasById.get(c.etapa_id) : null} />
                {(c.etiquetas ?? []).map((t) => (
                  <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-mute2">{t}</span>
                ))}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[14px] text-muted">Sin resultados.</div>
          )}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full rounded-[10px] border border-border py-2.5 text-[13px] text-muted transition hover:bg-soft disabled:opacity-50"
            >
              {loadingMore ? 'Cargando…' : 'Cargar más casos'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border bg-surface lg:w-[270px]">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-1.5">
          <div className="flex flex-1 items-center gap-1.5 rounded-[6px] bg-soft px-2.5 py-1.5">
            <i className="ti ti-search text-[14px] text-mute2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar caso..."
              className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-mute2"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setPanelAbierto((v) => !v)}
              className={`relative flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[6px] border transition ${
                filtrosActivos ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:bg-soft'
              }`}
              title="Filtros"
            >
              <i className="ti ti-adjustments-horizontal text-[15px]" />
              {filtrosActivos && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
            {panelAbierto && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setPanelAbierto(false)} />
                {FiltroPanel}
              </>
            )}
          </div>
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
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <EtapaPill etapa={c.etapa_id ? etapasById.get(c.etapa_id) : null} />
              {(c.etiquetas ?? []).map((t) => (
                <span key={t} className="rounded-full bg-soft px-1.5 py-0.5 text-[9px] text-mute2">{t}</span>
              ))}
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="p-4 text-center text-[12px] text-mute2">Sin resultados.</div>
        )}

        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full border-t border-border py-2.5 text-[12px] text-muted transition hover:bg-soft disabled:opacity-50"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más casos'}
          </button>
        )}
      </div>
    </div>
  )
}
