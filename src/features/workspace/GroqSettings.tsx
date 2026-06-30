import { useEffect, useState } from 'react'
import { getGroqEstado, conectarGroq, desconectarGroq, probarGroq, GROQ_MODEL_LABEL } from '@/features/workspace/groqApi'

const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'
const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'

export function GroqSettings({ puedeEditar }: { puedeEditar: boolean }) {
  const [conectado, setConectado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)
  const [respuesta, setRespuesta] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState(false)

  useEffect(() => {
    getGroqEstado()
      .then((e) => setConectado(e.conectado))
      .catch(() => setConectado(false))
      .finally(() => setLoading(false))
  }, [])

  async function onConectar() {
    if (!apiKey.trim()) return
    setBusy(true)
    setError(null)
    try {
      await conectarGroq(apiKey.trim())
      setConectado(true)
      setApiKey('')
      setCambiando(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar la IA.')
    } finally {
      setBusy(false)
    }
  }

  async function onDesconectar() {
    if (!confirm('¿Desconectar la IA de este workspace?')) return
    setBusy(true)
    setError(null)
    try {
      await desconectarGroq()
      setConectado(false)
      setRespuesta(null)
      setCambiando(false)
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
      setRespuesta(await probarGroq())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió.')
    } finally {
      setProbando(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <label className={labelClass}>TSADOQ IA</label>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? 'bg-success' : 'bg-mute2'}`} />
          {conectado ? `Conectado · Modelo: ${GROQ_MODEL_LABEL}` : 'No conectado'}
        </div>
        {puedeEditar && conectado && !cambiando && (
          <div className="flex gap-2">
            <button
              onClick={onProbar}
              disabled={probando}
              className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft disabled:opacity-60"
            >
              {probando ? 'Probando…' : 'Probar'}
            </button>
            <button
              onClick={() => setCambiando(true)}
              className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft"
            >
              Cambiar clave
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

      <div className="mt-2 rounded-[8px] border border-accent/20 bg-accent-soft px-3 py-2 text-[11px] text-ink">
        <i className="ti ti-info-circle text-accent" /> <strong>TSADOQ IA</strong> es <strong>gratuita</strong> (modelo {GROQ_MODEL_LABEL}, provisto por{' '}
        <a href="https://groq.com" target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
          Groq
        </a>
        ). El plan gratuito tiene un límite de uso diario generoso para un estudio jurídico normal.
      </div>
      <div className="mt-1.5 text-[10px] text-mute2">
        Groq is a trademark of Groq, Inc. and/or its affiliates.
      </div>

      {puedeEditar && (!conectado || cambiando) && (
        <div className="mt-3 flex flex-col gap-2">
          {!conectado && (
            <div className="rounded-[8px] border border-dashed border-border p-3">
              <div className="mb-1.5 text-[11px] font-semibold text-ink">Cómo obtener tu clave gratuita:</div>
              <ol className="list-decimal space-y-1 pl-4 text-[11px] text-muted">
                <li>
                  Entra a{' '}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    console.groq.com/keys
                  </a>{' '}
                  e inicia sesión (puedes usar tu cuenta de Google).
                </li>
                <li>Haz clic en "Create API Key", ponle un nombre cualquiera (ej. "TSADOQ").</li>
                <li>Copia la clave que aparece (empieza con "gsk_…") — solo se muestra una vez.</li>
                <li>Pégala abajo y haz clic en "Conectar".</li>
              </ol>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={cambiando ? 'Nueva clave (gsk_…)' : 'Pega aquí tu clave (gsk_…)'}
              className={inputClass}
            />
            <button
              onClick={onConectar}
              disabled={busy || !apiKey.trim()}
              className={`flex-shrink-0 rounded-[8px] px-3 py-2 text-[12px] font-medium transition ${
                apiKey.trim() ? 'bg-accent text-white hover:bg-accent-hover' : 'cursor-not-allowed border border-border text-mute2'
              } disabled:opacity-60`}
            >
              {busy ? 'Guardando…' : cambiando ? 'Actualizar' : 'Conectar'}
            </button>
            {cambiando && (
              <button
                onClick={() => { setCambiando(false); setApiKey(''); setError(null) }}
                className="flex-shrink-0 rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted transition hover:bg-soft"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {respuesta && (
        <div className="mt-3 rounded-[8px] border border-accent/20 bg-accent-soft px-3 py-2 text-[12px] text-ink">
          <span className="font-semibold text-accent">TSADOQ IA dice:</span> {respuesta}
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
