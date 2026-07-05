import { useEffect, useRef, useState } from 'react'
import { preguntarWorkspaceIA } from '@/features/workspace/workspaceIaApi'

type Mensaje = { rol: 'user' | 'ia'; texto: string }

const soportaMic = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
const soportaTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

export function WorkspaceAssistant() {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pregunta, setPregunta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escuchando, setEscuchando] = useState(false)
  const [vozActiva, setVozActiva] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechRecognition | null>(null)

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

  function toggleMic(onResult: (t: string) => void) {
    if (escuchando) { recRef.current?.stop(); setEscuchando(false); return }
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'es-EC'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onresult = (e: SpeechRecognitionEvent) => onResult(e.results[0][0].transcript)
    rec.onend = () => setEscuchando(false)
    rec.onerror = () => setEscuchando(false)
    recRef.current = rec; rec.start(); setEscuchando(true)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function enviar(textoPregunta?: string) {
    const texto = textoPregunta ?? pregunta.trim()
    if (!texto || loading) return
    setMensajes((prev) => [...prev, { rol: 'user', texto }])
    setPregunta('')
    setLoading(true)
    setError(null)
    try {
      const respuesta = await preguntarWorkspaceIA(texto)
      setMensajes((prev) => [...prev, { rol: 'ia', texto: respuesta }])
      hablar(respuesta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Asistente TSADOQ IA"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink"
      >
        <i className="ti ti-sparkles text-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[200] flex max-h-[420px] w-[340px] flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3.5 py-2.5 text-[12px] font-semibold text-ink">TSADOQ IA · Workspace</div>

          <div className="flex-1 overflow-y-auto p-3">
            {mensajes.length === 0 && (
              <div className="rounded-[8px] border border-dashed border-border p-4 text-center text-[12px] text-mute2">
                Pregunta lo que sea sobre tus casos, clientes o plazos del workspace.
              </div>
            )}
            <div className="flex flex-col gap-2">
              {mensajes.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[12px] ${
                    m.rol === 'user' ? 'self-end bg-accent text-white' : 'self-start border border-border bg-bg text-ink'
                  }`}
                >
                  {m.texto}
                </div>
              ))}
              {loading && (
                <div className="self-start rounded-[8px] border border-border bg-bg px-3 py-2 text-[12px] text-mute2">Pensando…</div>
              )}
            </div>
            {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
          </div>

          <div className="flex gap-1.5 border-t border-border p-2.5">
            {soportaMic && (
              <button
                onClick={() => toggleMic((t) => { setPregunta(t); enviar(t) })}
                title={escuchando ? 'Detener' : 'Hablar'}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border transition ${escuchando ? 'border-danger bg-danger-soft text-danger' : 'border-border text-muted hover:bg-soft'}`}
              >
                <i className={`ti ${escuchando ? 'ti-microphone-off' : 'ti-microphone'} text-[14px]`} />
              </button>
            )}
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder={escuchando ? 'Escuchando…' : 'Preguntar algo…'}
              className="flex-1 rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
            />
            {soportaTTS && (
              <button
                onClick={() => { setVozActiva(v => !v); window.speechSynthesis.cancel() }}
                title={vozActiva ? 'Desactivar voz' : 'Activar voz'}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border transition ${vozActiva ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:bg-soft'}`}
              >
                <i className={`ti ${vozActiva ? 'ti-volume' : 'ti-volume-off'} text-[14px]`} />
              </button>
            )}
            <button
              onClick={() => enviar()}
              disabled={loading || !pregunta.trim()}
              className={`flex-shrink-0 rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium transition ${
                pregunta.trim() ? 'bg-accent text-white hover:bg-accent-hover' : 'cursor-not-allowed border border-border text-mute2'
              }`}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
