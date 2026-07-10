import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Modal } from '@/components/Modal'
import { FilePickerButton } from '@/components/FilePickerButton'
import {
  listMisTickets,
  listMensajes,
  crearTicket,
  enviarMensaje,
  type TicketConWorkspace,
} from '@/features/soporte/api'
import type { TicketSoporte, TicketMensaje, CategoriaTicket } from '@/types/database'

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

function NuevoTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: TicketSoporte) => void }) {
  const { profile } = useAuth()
  const [categoria, setCategoria] = useState<CategoriaTicket>('duda')
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [captura, setCaptura] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    if (!profile || !asunto.trim() || !mensaje.trim()) return
    setEnviando(true)
    setError(null)
    try {
      const ticket = await crearTicket({
        workspaceId: profile.workspace_id,
        userId: profile.id,
        categoria,
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        capturaFile: captura,
      })
      onCreated(ticket)
      setAsunto('')
      setMensaje('')
      setCaptura(null)
      setCategoria('duda')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el ticket.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo ticket de soporte">
      <div className="flex flex-col gap-3">
        {error && <div className="rounded-[8px] bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaTicket)}
            className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          >
            {Object.entries(CATEGORIA_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Asunto</label>
          <input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Resume el problema en pocas palabras"
            className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Descripción</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={5}
            placeholder="Cuéntanos con detalle qué pasó o qué necesitas"
            className="w-full resize-none rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Captura de pantalla (opcional)</label>
          <FilePickerButton file={captura} onChange={setCaptura} />
        </div>
        <button
          onClick={onSubmit}
          disabled={enviando || !asunto.trim() || !mensaje.trim()}
          className="mt-1 rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Crear ticket'}
        </button>
      </div>
    </Modal>
  )
}

function TicketThread({ ticket, onClose }: { ticket: TicketSoporte; onClose: () => void }) {
  const { profile } = useAuth()
  const [mensajes, setMensajes] = useState<TicketMensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [captura, setCaptura] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMensajes(ticket.id).then(setMensajes).finally(() => setLoading(false))
  }, [ticket.id])

  async function onEnviar() {
    if (!profile || !nuevoMensaje.trim()) return
    setEnviando(true)
    try {
      await enviarMensaje({
        workspaceId: profile.workspace_id,
        ticketId: ticket.id,
        userId: profile.id,
        autorTipo: 'usuario',
        mensaje: nuevoMensaje.trim(),
        capturaFile: captura,
      })
      setNuevoMensaje('')
      setCaptura(null)
      const actualizados = await listMensajes(ticket.id)
      setMensajes(actualizados)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={ticket.asunto} maxWidth={560} bodyClassName="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[ticket.estado]}`}>{ESTADO_LABEL[ticket.estado]}</span>
        <span className="text-[11px] text-mute2">{CATEGORIA_LABEL[ticket.categoria]}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center text-[12px] text-muted">Cargando…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <div key={m.id} className={`flex flex-col gap-1 rounded-[10px] p-3 ${m.autor_tipo === 'soporte' ? 'bg-accent-soft' : 'bg-soft'}`}>
                <div className="text-[11px] font-medium text-mute2">{m.autor_tipo === 'soporte' ? 'Soporte' : 'Tú'} · {new Date(m.created_at).toLocaleString('es-EC')}</div>
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
      {ticket.estado !== 'cerrado' && (
        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-border p-3">
          <textarea
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            rows={2}
            placeholder="Escribe un mensaje…"
            className="w-full resize-none rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
          <div className="flex items-center justify-between gap-2">
            <FilePickerButton file={captura} onChange={setCaptura} />
            <button
              onClick={onEnviar}
              disabled={enviando || !nuevoMensaje.trim()}
              className="flex-shrink-0 rounded-[8px] bg-accent px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
      {ticket.estado === 'cerrado' && (
        <div className="flex-shrink-0 border-t border-border p-3 text-center text-[12px] text-mute2">
          Este ticket está cerrado. Si necesitas más ayuda, crea uno nuevo.
        </div>
      )}
    </Modal>
  )
}

export default function Soporte() {
  const [tickets, setTickets] = useState<TicketConWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [ticketAbierto, setTicketAbierto] = useState<TicketSoporte | null>(null)

  function load() {
    setLoading(true)
    listMisTickets().then((t) => setTickets(t as TicketConWorkspace[])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 rounded-[10px] border border-accent/30 bg-accent-soft p-3.5 text-[12px] text-ink">
          <i className="ti ti-info-circle mr-1.5 text-accent" />
          <strong>Temis IA</strong> puede resolver tu duda de primera mano — pregúntale primero. Si no logró resolverlo, este es el lugar. Soporte responde en un plazo de <strong>24 horas</strong>.
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Mis tickets</span>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover"
          >
            <i className="ti ti-plus" /> Nuevo ticket
          </button>
        </div>

        {loading ? (
          <div className="text-center text-[13px] text-muted">Cargando…</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">
            Aún no has creado ningún ticket.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setTicketAbierto(t)}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-surface p-3 text-left transition hover:bg-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{t.asunto}</div>
                  <div className="mt-0.5 text-[11px] text-mute2">{CATEGORIA_LABEL[t.categoria]} · {new Date(t.created_at).toLocaleDateString('es-EC')}</div>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <NuevoTicketModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => load()} />
      {ticketAbierto && <TicketThread ticket={ticketAbierto} onClose={() => { setTicketAbierto(null); load() }} />}
    </div>
  )
}
