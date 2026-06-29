import { useEffect, useState } from 'react'
import { getGeminiEstado, conectarGemini, desconectarGemini, probarGemini } from '@/features/workspace/geminiApi'

const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'
const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'

export function GeminiSettings({ puedeEditar }: { puedeEditar: boolean }) {
  const [conectado, setConectado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)
  const [respuesta, setRespuesta] = useState<string | null>(null)

  useEffect(() => {
    getGeminiEstado()
      .then((e) => setConectado(e.conectado))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function onConectar() {
    if (!apiKey.trim()) return
    setBusy(true)
    setError(null)
    try {
      await conectarGemini(apiKey.trim())
      setConectado(true)
      setApiKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar Gemini.')
    } finally {
      setBusy(false)
    }
  }

  async function onDesconectar() {
    if (!confirm('¿Desconectar Gemini de este workspace?')) return
    setBusy(true)
    setError(null)
    try {
      await desconectarGemini()
      setConectado(false)
      setRespuesta(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desconectar.')
    } finally {
      setBusy(false)
    }
  }

  async function onProbar() {
    setProbando(true)
    setError(null)
    setRespuesta(null)
    try {
      setRespuesta(await probarGemini())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gemini no respondió.')
    } finally {
      setProbando(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <label className={labelClass}>Gemini (IA)</label>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? 'bg-success' : 'bg-mute2'}`} />
          {conectado ? 'Conectado' : 'No conectado'}
        </div>
        {puedeEditar && conectado && (
          <div className="flex gap-2">
            <button
              onClick={onProbar}
              disabled={probando}
              className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft disabled:opacity-60"
            >
              {probando ? 'Probando…' : 'Probar conexión'}
            </button>
            <button
              onClick={onDesconectar}
              disabled={busy}
              className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        )}
      </div>

      {puedeEditar && !conectado && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[11px] text-mute2">
            Genera una clave gratuita con la cuenta de Google de este workspace y pégala aquí. Cada workspace usa su propia
            clave, sin compartir cupo con otros.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-[6px] border border-border px-2.5 py-1.5 text-[11px] text-accent transition hover:bg-accent-soft"
          >
            <i className="ti ti-external-link" /> Generar mi clave en Google AI Studio
          </a>
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pega aquí tu clave de Gemini…"
              className={inputClass}
            />
            <button
              onClick={onConectar}
              disabled={busy || !apiKey.trim()}
              className={`flex-shrink-0 rounded-[8px] px-3 py-2 text-[12px] font-medium transition ${
                apiKey.trim() ? 'bg-accent text-white hover:bg-accent-hover' : 'cursor-not-allowed border border-border text-mute2'
              }`}
            >
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
        </div>
      )}

      {respuesta && (
        <div className="mt-3 rounded-[8px] border border-accent/20 bg-accent-soft px-3 py-2 text-[12px] text-ink">
          <span className="font-semibold text-accent">Gemini dice:</span> {respuesta}
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
