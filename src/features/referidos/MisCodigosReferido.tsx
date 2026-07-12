import { useEffect, useState } from 'react'
import { listMisCodigosReferido } from '@/features/referidos/api'
import type { CodigoReferido } from '@/types/database'

export function MisCodigosReferido() {
  const [codigos, setCodigos] = useState<CodigoReferido[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    listMisCodigosReferido().then(setCodigos).finally(() => setLoading(false))
  }, [])

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 1500)
  }

  if (loading) return null
  if (codigos.length === 0) return null

  const disponibles = codigos.filter((c) => !c.usado)
  const usados = codigos.filter((c) => c.usado)

  return (
    <div className="mb-2.5 rounded-[10px] border border-border bg-surface p-3">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
        Mis códigos de referido
      </label>
      {disponibles.length === 0 ? (
        <div className="text-[12px] text-mute2">Ya usaste todos tus códigos disponibles.</div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {disponibles.map((c) => (
            <button
              key={c.id}
              onClick={() => copiar(c.codigo)}
              title="Copiar código"
              className="flex items-center justify-between gap-1.5 rounded-[6px] border border-border bg-bg px-2 py-1.5 font-mono text-[12px] font-semibold tracking-wide text-ink transition hover:border-accent"
            >
              {c.codigo}
              <i className={`ti ${copiado === c.codigo ? 'ti-check text-success' : 'ti-copy text-mute2'} text-[13px]`} />
            </button>
          ))}
        </div>
      )}
      {usados.length > 0 && (
        <div className="mt-2 text-[11px] text-mute2">{usados.length} código{usados.length === 1 ? '' : 's'} ya usado{usados.length === 1 ? '' : 's'}.</div>
      )}
    </div>
  )
}
