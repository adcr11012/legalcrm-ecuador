import { useEffect, useState } from 'react'
import {
  getOpenRouterEstado,
  conectarOpenRouter,
  desconectarOpenRouter,
  probarOpenRouter,
  OPENROUTER_MODEL_LABEL,
} from '@/features/workspace/openrouterApi'

const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'
const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'

export function OpenRouterSettings({ puedeEditar }: { puedeEditar: boolean }) {
  const [conectado, setConectado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)
  const [respuesta, setRespuesta] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState(false)

  useEffect(() => {
    getOpenRouterEstado()
      .then((e) => setConectado(e.conectado))
      .catch(() => setConectado(false))
      .finally(() => setLoading(false))
  }, [])

  async function onConectar() {
    if (!apiKey.trim()) return
    setBusy(true)
    setError(null)
    try {
      await conectarOpenRouter(apiKey.trim())
      setConectado(true)
      setApiKey('')
      setCambiando(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar.')
    } finally {
      setBusy(false)
    }
  }

  async function onDesconectar() {
    if (!confirm('¿Desconectar la lectura de imágenes de este workspace?')) return
    setBusy(true)
    setError(null)
    try {
      await desconectarOpenRouter()
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
      setRespuesta(await probarOpenRouter())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No respondió.')
    } finally {
      setProbando(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <label className={labelClass}>Lectura de imágenes y escaneados</label>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? 'bg-success' : 'bg-mute2'}`} />
          {conectado ? `Conectado · Modelo: ${OPENROUTER_MODEL_LABEL}` : 'No conectado'}
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
        <i className="ti ti-info-circle text-accent" /> Permite que <strong>TSADOQ IA</strong> "vea" imágenes y documentos
        escaneados, usando un modelo de visión <strong>gratuito</strong> provisto por{' '}
        <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
          OpenRouter
        </a>
        . Es opcional: sin esto, los PDFs con texto y los Word siguen leyéndose igual.
      </div>

      {puedeEditar && (!conectado || cambiando) && (
        <div className="mt-3 flex flex-col gap-2">
          {!conectado && (
            <div className="rounded-[8px] border border-dashed border-border p-3">
              <div className="mb-1.5 text-[11px] font-semibold text-ink">Cómo obtener tu clave gratuita:</div>
              <ol className="list-decimal space-y-1 pl-4 text-[11px] text-muted">
                <li>
                  Entra a{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    openrouter.ai/keys
                  </a>{' '}
                  e inicia sesión (puedes usar tu cuenta de Google), sin tarjeta.
                </li>
                <li>Haz clic en "Create Key", ponle un nombre cualquiera (ej. "TSADOQ").</li>
                <li>Copia la clave que aparece (empieza con "sk-or-…").</li>
                <li>Pégala abajo y haz clic en "Conectar".</li>
              </ol>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={cambiando ? 'Nueva clave (sk-or-…)' : 'Pega aquí tu clave (sk-or-…)'}
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
          <span className="font-semibold text-accent">Respuesta:</span> {respuesta}
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
