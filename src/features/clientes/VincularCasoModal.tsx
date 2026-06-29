import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { listCasos } from '@/features/casos/api'
import { addPersonaCliente } from '@/features/casos/personasApi'
import type { Caso } from '@/types/database'

export function VincularCasoModal({
  open,
  onClose,
  clienteId,
  clienteNombre,
  casosVinculadosIds,
  onVinculado,
}: {
  open: boolean
  onClose: () => void
  clienteId: string
  clienteNombre: string
  casosVinculadosIds: string[]
  onVinculado: (caso: Caso) => void
}) {
  const [casos, setCasos] = useState<Caso[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError(null)
    listCasos().then(setCasos).catch(() => setError('No se pudieron cargar los casos.'))
  }, [open])

  const disponibles = casos.filter((c) => !casosVinculadosIds.includes(c.id) && c.titulo.toLowerCase().includes(query.toLowerCase()))

  async function onVincular(caso: Caso) {
    setLoading(true)
    setError(null)
    try {
      await addPersonaCliente(caso.id, clienteId, clienteNombre)
      onVinculado(caso)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular el caso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Vincular caso existente">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar caso por título…"
          className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
        />

        <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
          {disponibles.map((c) => (
            <button
              key={c.id}
              onClick={() => onVincular(c)}
              disabled={loading}
              className="flex items-center justify-between gap-2 rounded-[8px] border border-border px-3 py-2 text-left text-[13px] text-ink transition hover:border-accent hover:bg-accent-soft disabled:opacity-60"
            >
              {c.titulo}
              <i className="ti ti-link text-[14px] text-mute2" />
            </button>
          ))}
          {disponibles.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-border p-5 text-center text-[12px] text-mute2">
              No hay casos disponibles para vincular.
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
        )}
      </div>
    </Modal>
  )
}
