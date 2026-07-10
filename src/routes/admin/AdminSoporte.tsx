import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/Modal'
import {
  listTicketsSuperadmin,
  listMensajes,
  enviarMensaje,
  cerrarTicket,
  reabrirTicket,
  type TicketConWorkspace,
} from '@/features/soporte/api'
import type { TicketMensaje, CategoriaTicket, EstadoTicket } from '@/types/database'

const CATEGORIA_LABEL: Record<CategoriaTicket, string> = {
  bug: 'Error / Bug',
  duda: 'Duda',
  sugerencia: 'Sugerencia',
  facturacion: 'Facturación',
  otro: 'Otro',
}

const ESTADO_CLASS: Record<string, string> = {
  abierto: 'bg-warn-soft text-warn',
  respondido: 'bg-accent-soft text-accent',
  cerrado: 'bg-soft text-mute2',
}

const ESTADO_LABEL: Record<string, string> = { abierto: 'Abierto', respondido: 'Respondido', cerrado: 'Cerrado' }

function tiempoAbierto(createdAt: string): { texto: string; vencido: boolean } {
  const horas = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  const restantes = 24 - horas
  if (restantes <= 0) return { texto: `Vencido hace ${Math.floor(-restantes)}h`, vencido: true }
  return { texto: `${Math.floor(restantes)}h restantes`, vencido: restantes < 6 }
}

function TicketDetalle({ ticket, userId, onClose, onCambio }: {
  ticket: TicketConWorkspace
  userId: string
  onClose: () => void
  onCambio: () => void
}) {
  const [mensajes, setMensajes] = useState<TicketMensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [respuesta, setRespuesta] = useState('')
  const [captura, setCaptura] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [procesando, setProcesando] = useState(false)

  function cargarMensajes() {
    listMensajes(ticket.id).then(setMensajes).finally(() => setLoading(false))
  }

  useEffect(() => { cargarMensajes() }, [ticket.id])

  async function onResponder() {
    if (!respuesta.trim()) return
    setEnviando(true)
    try {
      await enviarMensaje({
        workspaceId: ticket.workspace_id,
        ticketId: ticket.id,
        userId,
        autorTipo: 'soporte',
        mensaje: respuesta.trim(),
        capturaFile: captura,
      })
      setRespuesta('')
      setCaptura(null)
      cargarMensajes()
      onCambio()
    } finally {
      setEnviando(false)
    }
  }

  async function onToggleEstado() {
    setProcesando(true)
    try {
      if (ticket.estado === 'cerrado') await reabrirTicket(ticket.id)
      else await cerrarTicket(ticket.id)
      onCambio()
      onClose()
    } finally {
      setProcesando(false)
    }
  }

  const t = tiempoAbierto(ticket.created_at)

  return (
    <Modal open onClose={onClose} title={ticket.asunto} maxWidth={600} bodyClassName="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[ticket.estado]}`}>{ESTADO_LABEL[ticket.estado]}</span>
        <span className="text-[11px] text-mute2">{CATEGORIA_LABEL[ticket.categoria]}</span>
        <span className="text-[11px] text-mute2">· {ticket.workspace_nombre}</span>
        {ticket.estado !== 'cerrado' && (
          <span className={`text-[11px] font-medium ${t.vencido ? 'text-danger' : 'text-mute2'}`}>· {t.texto}</span>
        )}
        <div className="flex-1" />
        <button
          onClick={onToggleEstado}
          disabled={procesando}
          className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
            ticket.estado === 'cerrado'
              ? 'border-accent text-accent hover:bg-accent-soft'
              : 'border-danger text-danger hover:bg-danger-soft'
          }`}
        >
          {ticket.estado === 'cerrado' ? 'Reabrir' : 'Cerrar ticket'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center text-[12px] text-muted">Cargando…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <div key={m.id} className={`flex flex-col gap-1 rounded-[10px] p-3 ${m.autor_tipo === 'soporte' ? 'bg-accent-soft' : 'bg-soft'}`}>
                <div className="text-[11px] font-medium text-mute2">{m.autor_tipo === 'soporte' ? 'Soporte (tú)' : 'Usuario'} · {new Date(m.created_at).toLocaleString('es-EC')}</div>
                <div className="whitespace-pre-wrap text-[13px] text-ink">{m.mensaje}</div>
                {m.captura_url && (
                  <a href={m.captura_url} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                    <img src={m.captura_url} alt="Captura adjunta" className="max-h-[200px] rounded-[8px] border border-border" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col gap-2 border-t border-border p-3">
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={2}
          placeholder="Responder…"
          className="w-full resize-none rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCaptura(e.target.files?.[0] ?? null)}
            className="flex-1 text-[11px] text-muted"
          />
          <button
            onClick={onResponder}
            disabled={enviando || !respuesta.trim()}
            className="flex-shrink-0 rounded-[8px] bg-accent px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Responder'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminSoporte() {
  const [tickets, setTickets] = useState<TicketConWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<TicketConWorkspace | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoTicket | ''>('')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaTicket | ''>('')
  const [busqueda, setBusqueda] = useState('')

  function load() {
    setLoading(true)
    listTicketsSuperadmin().then(setTickets).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return tickets.filter((t) => {
      if (filtroEstado && t.estado !== filtroEstado) return false
      if (filtroCategoria && t.categoria !== filtroCategoria) return false
      if (q && !t.asunto.toLowerCase().includes(q) && !t.workspace_nombre.toLowerCase().includes(q)) return false
      return true
    })
  }, [tickets, filtroEstado, filtroCategoria, busqueda])

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por asunto o workspace…"
          className="min-w-[200px] flex-1 rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoTicket | '')}
          className="rounded-[8px] border border-border bg-surface px-2.5 py-2 text-[12px] text-ink outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as CategoriaTicket | '')}
          className="rounded-[8px] border border-border bg-surface px-2.5 py-2 text-[12px] text-ink outline-none"
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-[13px] text-muted">Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">Sin tickets.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((t) => {
            const tiempo = tiempoAbierto(t.created_at)
            return (
              <button
                key={t.id}
                onClick={() => setSeleccionado(t)}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-surface p-3 text-left transition hover:bg-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{t.asunto}</div>
                  <div className="mt-0.5 text-[11px] text-mute2">
                    {t.workspace_nombre} · {CATEGORIA_LABEL[t.categoria]} · {new Date(t.created_at).toLocaleDateString('es-EC')}
                  </div>
                </div>
                {t.estado !== 'cerrado' && (
                  <span className={`flex-shrink-0 text-[11px] font-medium ${tiempo.vencido ? 'text-danger' : 'text-mute2'}`}>{tiempo.texto}</span>
                )}
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span>
              </button>
            )
          })}
        </div>
      )}

      {seleccionado && userId && (
        <TicketDetalle ticket={seleccionado} userId={userId} onClose={() => setSeleccionado(null)} onCambio={load} />
      )}
    </div>
  )
}
