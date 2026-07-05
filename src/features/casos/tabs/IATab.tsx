import { useEffect, useRef, useState } from 'react'
import { preguntarCasoIA } from '@/features/casos/casoIaApi'

type Mensaje = { rol: 'user' | 'ia'; texto: string }

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

function useSpeech() {
  const [escuchando, setEscuchando] = useState(false)
  const [vozActiva, setVozActiva] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)
  const soportaMic = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  const soportaTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

  function hablar(texto: string) {
    if (!soportaTTS || !vozActiva) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(texto)
    utt.lang = 'es-EC'
    const voces = window.speechSynthesis.getVoices()
    const esVoz = voces.find(v => v.lang.startsWith('es') && v.localService) ?? voces.find(v => v.lang.startsWith('es'))
    if (esVoz) utt.voice = esVoz
    utt.rate = 1.05
    window.speechSynthesis.speak(utt)
  }

  function escuchar(onResult: (texto: string) => void) {
    if (!soportaMic) return
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'es-EC'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => onResult(e.results[0][0].transcript)
    rec.onend = () => setEscuchando(false)
    rec.onerror = () => setEscuchando(false)
    recRef.current = rec
    rec.start()
    setEscuchando(true)
  }

  function detener() {
    recRef.current?.stop()
    setEscuchando(false)
  }

  return { escuchando, vozActiva, setVozActiva, hablar, escuchar, detener, soportaMic, soportaTTS }
}

export function IATab({ casoId }: { casoId: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pregunta, setPregunta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { escuchando, vozActiva, setVozActiva, hablar, escuchar, detener, soportaMic, soportaTTS } = useSpeech()

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
      hablar(respuesta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió.')
    } finally {
      setLoading(false)
    }
  }

  function toggleMic() {
    if (escuchando) { detener(); return }
    escuchar((texto) => {
      setPregunta(texto)
      enviar(texto)
    })
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
