import { useState } from 'react'
import { canjearCodigoReferido } from '@/features/referidos/api'

export function CanjearBeneficios({ yaCanjeado, onCanjeado }: { yaCanjeado: boolean; onCanjeado: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (yaCanjeado) return null

  async function canjear() {
    if (!codigo.trim()) return
    setLoading(true)
    setError(null)
    try {
      await canjearCodigoReferido(codigo.trim())
      setAbierto(false)
      setCodigo('')
      onCanjeado()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('CODIGO_INVALIDO')) setError('Código inválido, ya usado o expirado.')
      else if (msg.includes('YA_CANJEADO')) setError('Este workspace ya canjeó un código antes.')
      else setError('No se pudo canjear el código.')
    } finally {
      setLoading(false)
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-accent/40 bg-accent-soft px-3 py-2.5 text-[12px] font-medium text-accent transition hover:bg-accent hover:text-white"
      >
        <i className="ti ti-gift" />
        Canjear beneficios con un código de referido
      </button>
    )
  }

  return (
    <div className="mb-2.5 rounded-[10px] border border-border bg-surface p-3">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
        Canjear código de referido
      </label>
      <div className="flex items-center gap-2">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ej. A1B2C3D4"
          className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 font-mono text-[13px] uppercase text-ink outline-none transition focus:border-accent"
        />
        <button
          onClick={canjear}
          disabled={loading || !codigo.trim()}
          className="shrink-0 rounded-[8px] bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Canjeando…' : 'Canjear'}
        </button>
        <button onClick={() => { setAbierto(false); setError(null) }} className="shrink-0 text-[12px] text-mute2 hover:text-ink">
          Cancelar
        </button>
      </div>
      {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}
    </div>
  )
}
