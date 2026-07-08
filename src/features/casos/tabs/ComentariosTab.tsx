import { useState } from 'react'
import { crearComentario, eliminarComentario } from '@/features/casos/comentariosApi'
import type { CasoComentario, Usuario } from '@/types/database'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}

export function ComentariosTab({
  comentarios: comentariosInit, casoId, currentUserId, esAdmin, usersById, onChange,
}: {
  comentarios: CasoComentario[]
  casoId: string
  currentUserId: string
  esAdmin: boolean
  usersById: Map<string, Usuario>
  onChange: (comentarios: CasoComentario[]) => void
}) {
  const [comentarios, setComentarios] = useState(comentariosInit)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const nuevo = await crearComentario(casoId, currentUserId, texto.trim())
      const next = [nuevo, ...comentarios]
      setComentarios(next)
      onChange(next)
      setTexto('')
    } finally {
      setEnviando(false)
    }
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este comentario?')) return
    await eliminarComentario(id)
    const next = comentarios.filter((c) => c.id !== id)
    setComentarios(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-3">
        <textarea
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe una actualización sobre este caso…"
          className="w-full resize-none rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="self-end rounded-[8px] bg-accent px-4 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {enviando ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      {comentarios.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin comentarios todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {comentarios.map((c) => {
            const autor = usersById.get(c.user_id)
            const puedeBorrar = esAdmin || c.user_id === currentUserId
            return (
              <div key={c.id} className="flex gap-2.5 rounded-[10px] border border-border bg-surface p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                  {initials(autor?.nombre ?? '?')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-ink">{autor?.nombre ?? 'Usuario'}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-mute2">{formatFecha(c.created_at)}</span>
                      {puedeBorrar && (
                        <button onClick={() => borrar(c.id)} className="text-mute2 hover:text-danger">
                          <i className="ti ti-trash text-[12px]" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{c.contenido}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
