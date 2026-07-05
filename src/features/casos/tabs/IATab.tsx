import { useEffect, useRef, useState } from 'react'
import { preguntarCasoIA } from '@/features/casos/casoIaApi'

type Mensaje = { rol: 'user' | 'ia'; texto: string }

export function IATab({ casoId }: { casoId: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pregunta, setPregunta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  async function enviar(textoPregunta?: string) {
    const texto = textoPregunta ?? pregunta.trim()
    if (!texto || loading) return
    setMensajes((prev) => [...prev, { rol: 'user', texto }])
    setPregunta('')
    setLoading(true)
    setError(null)
    try {
      const respuesta = await preguntarCasoIA(casoId, texto)
      setMensajes((prev) => [...prev, { rol: 'ia', texto: respuesta }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {mensajes.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-5 text-center">
          <i className="ti ti-sparkles text-[22px] text-accent" />
          <div className="mt-1.5 text-[13px] font-medium text-ink">Temis · IA de este caso</div>
          <div className="mt-1 text-[12px] text-mute2">
            Responde con los datos del caso, partes, plazos, historial y el contenido de los documentos subidos.
          </div>
          <button
            onClick={() => enviar('Resume este caso en pocas oraciones.')}
            disabled={loading}
            className="mt-3 rounded-[8px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            Resumir caso
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-[10px] px-3.5 py-2.5 text-[13px] ${
              m.rol === 'user' ? 'self-end bg-accent text-white' : 'self-start border border-border bg-surface text-ink'
            }`}
          >
            {m.texto}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[13px] text-mute2">
            Pensando…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
      )}

      <div className="mt-1 flex gap-2">
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Pregunta algo sobre este caso…"
          className="flex-1 rounded-[8px] border border-border bg-surface px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        <button
          onClick={() => enviar()}
          disabled={loading || !pregunta.trim()}
          className={`flex-shrink-0 rounded-[8px] px-3.5 py-2.5 text-[12px] font-medium transition ${
            pregunta.trim() ? 'bg-accent text-white hover:bg-accent-hover' : 'cursor-not-allowed border border-border text-mute2'
          }`}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
