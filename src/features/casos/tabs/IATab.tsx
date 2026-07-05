import { useEffect, useRef, useState } from 'react'
import { preguntarCasoIA } from '@/features/casos/casoIaApi'

type Mensaje = { rol: 'user' | 'ia'; texto: string }

const soportaMic = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
const soportaTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

function getVozES() {
  const voces = window.speechSynthesis.getVoices()
  return voces.find(v => v.lang.startsWith('es') && v.localService) ?? voces.find(v => v.lang.startsWith('es'))
}

function hablarTexto(texto: string, onEnd?: () => void) {
  if (!soportaTTS) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(texto)
  utt.lang = 'es-EC'
  const voz = getVozES()
  if (voz) utt.voice = voz
  utt.rate = 1.05
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

function iniciarEscucha(onResult: (texto: string) => void, onEnd: () => void): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  const rec = new SR()
  rec.lang = 'es-EC'
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.onresult = (e: SpeechRecognitionEvent) => onResult(e.results[0][0].transcript)
  rec.onend = onEnd
  rec.onerror = onEnd
  rec.start()
  return () => rec.stop()
}

export function IATab({ casoId }: { casoId: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pregunta, setPregunta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escuchando, setEscuchando] = useState(false)
  const [vozActiva, setVozActiva] = useState(false)
  const [modoVivo, setModoVivo] = useState(false)
  const [estadoVivo, setEstadoVivo] = useState<'escuchando' | 'pensando' | 'hablando'>('escuchando')

  const bottomRef = useRef<HTMLDivElement>(null)
  const modoVivoRef = useRef(false)
  const stopRecRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      modoVivoRef.current = false
      stopRecRef.current?.()
      window.speechSynthesis.cancel()
    }
  }, [])

  // ----- MODO ESCRITO -----

  function hablar(texto: string) {
    if (!soportaTTS || !vozActiva) return
    hablarTexto(texto)
  }

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
      hablar(respuesta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió.')
    } finally {
      setLoading(false)
    }
  }

  function toggleMic() {
    if (escuchando) {
      stopRecRef.current?.()
      setEscuchando(false)
      return
    }
    setEscuchando(true)
    stopRecRef.current = iniciarEscucha(
      (texto) => { setPregunta(texto); enviar(texto) },
      () => setEscuchando(false),
    )
  }

  // ----- MODO VIVO -----

  function escucharVivo() {
    if (!modoVivoRef.current) return
    setEstadoVivo('escuchando')
    stopRecRef.current = iniciarEscucha(
      async (texto) => {
        if (!modoVivoRef.current) return
        setMensajes((prev) => [...prev, { rol: 'user', texto }])
        setEstadoVivo('pensando')
        setLoading(true)
        try {
          const respuesta = await preguntarCasoIA(casoId, texto)
          if (!modoVivoRef.current) return
          setMensajes((prev) => [...prev, { rol: 'ia', texto: respuesta }])
          setEstadoVivo('hablando')
          hablarTexto(respuesta, () => {
            if (modoVivoRef.current) escucharVivo()
          })
        } catch {
          if (modoVivoRef.current) escucharVivo()
        } finally {
          setLoading(false)
        }
      },
      () => {
        // mic ended without result — restart listening
        if (modoVivoRef.current) escucharVivo()
      },
    )
  }

  function entrarModoVivo() {
    modoVivoRef.current = true
    setModoVivo(true)
    setVozActiva(true)
    escucharVivo()
  }

  function salirModoVivo() {
    modoVivoRef.current = false
    setModoVivo(false)
    stopRecRef.current?.()
    window.speechSynthesis.cancel()
    setLoading(false)
    setEstadoVivo('escuchando')
  }

  // ----- UI -----

  if (modoVivo) {
    return (
      <div className="flex flex-col items-center gap-5 py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft">
            {estadoVivo === 'escuchando' && (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-20" />
                <i className="ti ti-microphone text-[36px] text-accent" />
              </>
            )}
            {estadoVivo === 'pensando' && (
              <i className="ti ti-loader-2 animate-spin text-[36px] text-accent" />
            )}
            {estadoVivo === 'hablando' && (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-20" />
                <i className="ti ti-volume text-[36px] text-success" />
              </>
            )}
          </div>
          <div className="text-[14px] font-semibold text-ink">
            {estadoVivo === 'escuchando' && 'Escuchando…'}
            {estadoVivo === 'pensando' && 'Pensando…'}
            {estadoVivo === 'hablando' && 'Respondiendo…'}
          </div>
          <div className="text-[11px] text-mute2">Modo en vivo · Temis</div>
        </div>

        <div className="flex max-h-[260px] w-full flex-col gap-2 overflow-y-auto rounded-[10px] border border-border bg-surface p-3">
          {mensajes.length === 0 && (
            <div className="text-center text-[12px] text-mute2">La conversación aparecerá aquí</div>
          )}
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12px] ${
                m.rol === 'user' ? 'self-end bg-accent text-white' : 'self-start border border-border bg-bg text-ink'
              }`}
            >
              {m.texto}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <button
          onClick={salirModoVivo}
          className="inline-flex items-center gap-2 rounded-[8px] border border-danger/30 bg-danger-soft px-4 py-2 text-[13px] font-medium text-danger transition hover:bg-danger hover:text-white"
        >
          <i className="ti ti-phone-off text-[16px]" /> Salir del modo en vivo
        </button>
      </div>
    )
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
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={() => enviar('Resume este caso en pocas oraciones.')}
              disabled={loading}
              className="rounded-[8px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              Resumir caso
            </button>
            {soportaMic && soportaTTS && (
              <button
                onClick={entrarModoVivo}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-accent/30 bg-accent-soft px-3 py-1.5 text-[12px] font-medium text-accent transition hover:bg-accent hover:text-white"
              >
                <i className="ti ti-phone text-[14px]" /> Modo en vivo
              </button>
            )}
          </div>
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
        {soportaMic && (
          <button
            onClick={toggleMic}
            title={escuchando ? 'Detener' : 'Hablar'}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border transition ${
              escuchando ? 'border-danger bg-danger-soft text-danger' : 'border-border text-muted hover:bg-soft'
            }`}
          >
            <i className={`ti ${escuchando ? 'ti-microphone-off' : 'ti-microphone'} text-[18px]`} />
          </button>
        )}
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder={escuchando ? 'Escuchando…' : 'Pregunta algo sobre este caso…'}
          className="flex-1 rounded-[8px] border border-border bg-surface px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        {soportaTTS && (
          <button
            onClick={() => { setVozActiva(v => !v); window.speechSynthesis.cancel() }}
            title={vozActiva ? 'Desactivar voz' : 'Activar voz'}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border transition ${
              vozActiva ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:bg-soft'
            }`}
          >
            <i className={`ti ${vozActiva ? 'ti-volume' : 'ti-volume-off'} text-[18px]`} />
          </button>
        )}
        {soportaMic && soportaTTS && (
          <button
            onClick={entrarModoVivo}
            title="Modo en vivo"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border border-accent/40 text-accent transition hover:bg-accent hover:text-white"
          >
            <i className="ti ti-phone text-[18px]" />
          </button>
        )}
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
