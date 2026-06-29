import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { listEtapas, createEtapa, updateEtapa, reordenarEtapas, deleteEtapa, MIN_ETAPAS } from '@/features/casos/etapasApi'
import type { Etapa, EtapaColor } from '@/types/database'

const COLOR_DOT: Record<EtapaColor, string> = {
  neutral: 'bg-mute2',
  accent: 'bg-accent',
  warn: 'bg-warn',
  danger: 'bg-danger',
  success: 'bg-success',
  purple: 'bg-purple',
}

const COLORES: EtapaColor[] = ['neutral', 'accent', 'warn', 'danger', 'success', 'purple']

export function EtapasSettings() {
  const { profile } = useAuth()
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')

  useEffect(() => {
    listEtapas()
      .then(setEtapas)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las etapas.'))
      .finally(() => setLoading(false))
  }, [])

  async function onAgregar() {
    if (!profile || !nuevoNombre.trim()) return
    setError(null)
    try {
      const posicion = (etapas[etapas.length - 1]?.posicion ?? 0) + 1
      const creada = await createEtapa(profile.workspace_id, nuevoNombre.trim(), posicion)
      setEtapas((prev) => [...prev, creada])
      setNuevoNombre('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la etapa.')
    }
  }

  async function confirmRename() {
    if (!editingId || !editingNombre.trim()) return
    try {
      const updated = await updateEtapa(editingId, { nombre: editingNombre.trim() })
      setEtapas((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar la etapa.')
    }
  }

  async function onColor(etapa: Etapa, color: EtapaColor) {
    const updated = await updateEtapa(etapa.id, { color })
    setEtapas((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  async function onTerminal(etapa: Etapa) {
    const updated = await updateEtapa(etapa.id, { es_terminal: !etapa.es_terminal })
    setEtapas((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  async function onMove(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= etapas.length) return
    const next = [...etapas]
    ;[next[index], next[target]] = [next[target], next[index]]
    setEtapas(next)
    await reordenarEtapas(next.map((e, i) => ({ id: e.id, posicion: i + 1 })))
  }

  async function onDelete(etapa: Etapa) {
    if (etapas.length <= MIN_ETAPAS) {
      setError(`Debe haber al menos ${MIN_ETAPAS} etapas.`)
      return
    }
    if (!confirm(`¿Eliminar la etapa "${etapa.nombre}"?`)) return
    setError(null)
    try {
      await deleteEtapa(etapa.id)
      setEtapas((prev) => prev.filter((e) => e.id !== etapa.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la etapa.')
    }
  }

  if (loading) return <div className="text-[12px] text-mute2">Cargando etapas…</div>

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {etapas.map((etapa, i) => (
          <div key={etapa.id} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface p-2.5">
            <div className="flex flex-col">
              <button
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                className="flex h-5 w-5 items-center justify-center rounded text-mute2 transition hover:bg-[#f2f1ee] disabled:opacity-30"
              >
                <i className="ti ti-chevron-up text-[13px]" />
              </button>
              <button
                onClick={() => onMove(i, 1)}
                disabled={i === etapas.length - 1}
                className="flex h-5 w-5 items-center justify-center rounded text-mute2 transition hover:bg-[#f2f1ee] disabled:opacity-30"
              >
                <i className="ti ti-chevron-down text-[13px]" />
              </button>
            </div>

            <button
              type="button"
              title="Cambiar color"
              onClick={() => onColor(etapa, COLORES[(COLORES.indexOf(etapa.color) + 1) % COLORES.length])}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition hover:ring-2 hover:ring-border"
            >
              <span className={`block h-3.5 w-3.5 rounded-full ${COLOR_DOT[etapa.color]}`} />
            </button>

            {editingId === etapa.id ? (
              <input
                autoFocus
                value={editingNombre}
                onChange={(e) => setEditingNombre(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 rounded-[6px] border border-accent bg-bg px-2 py-1 text-[13px] text-ink outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(etapa.id)
                  setEditingNombre(etapa.nombre)
                }}
                className="flex-1 truncate text-left text-[13px] font-medium text-ink hover:underline"
              >
                {etapa.nombre}
              </button>
            )}

            <button
              onClick={() => onTerminal(etapa)}
              title="Marca si esta etapa cierra el caso (no cuenta como activo)"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                etapa.es_terminal ? 'bg-success-soft text-success' : 'border border-border bg-[#f2f1ee] text-muted'
              }`}
            >
              {etapa.es_terminal ? 'Cierra el caso' : 'En curso'}
            </button>

            <button
              onClick={() => onDelete(etapa)}
              disabled={etapas.length <= MIN_ETAPAS}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-30"
            >
              <i className="ti ti-trash text-[13px]" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAgregar()}
          placeholder="Nueva etapa…"
          className="flex-1 rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        <button
          onClick={onAgregar}
          disabled={!nuevoNombre.trim()}
          className="rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted transition hover:bg-[#f2f1ee] disabled:opacity-60"
        >
          <i className="ti ti-plus" /> Añadir
        </button>
      </div>

      <p className="mt-2 text-[11px] text-mute2">Mínimo {MIN_ETAPAS} etapas. Arrástralas con las flechas para definir el orden del tablero Kanban.</p>
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
