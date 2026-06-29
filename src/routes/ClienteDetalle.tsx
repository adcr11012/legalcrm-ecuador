import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCliente, deleteCliente } from '@/features/clientes/api'
import { listNotas, addNota } from '@/features/clientes/notasApi'
import { listCasosPorCliente } from '@/features/casos/personasApi'
import { listCasosByIds } from '@/features/casos/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Caso, Cliente, ClienteNota, EstadoCliente, Etapa } from '@/types/database'

const ESTADO_LABEL: Record<EstadoCliente, string> = { activo: 'Activo', inactivo: 'Inactivo', potencial: 'Potencial' }
const TIPO_LABEL: Record<string, string> = { persona_natural: 'Persona natural', empresa: 'Empresa' }

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [casos, setCasos] = useState<Caso[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [notas, setNotas] = useState<ClienteNota[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [c, n, personas, e] = await Promise.all([getCliente(id), listNotas(id), listCasosPorCliente(id), listEtapas()])
      setCliente(c)
      setNotas(n)
      setEtapas(e)
      const casoIds = personas.map((p) => p.caso_id)
      setCasos(await listCasosByIds(casoIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el cliente.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete() {
    if (!cliente) return
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) return
    await deleteCliente(cliente.id)
    navigate('/clientes')
  }

  async function onAddNota() {
    if (!id || !profile || !nuevaNota.trim()) return
    setSaving(true)
    try {
      const nota = await addNota(id, profile.id, nuevaNota.trim())
      setNotas((prev) => [nota, ...prev])
      setNuevaNota('')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!cliente) return <div className="flex-1 p-5 text-[13px] text-muted">Cliente no encontrado.</div>

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5">
      <button onClick={() => navigate('/clientes')} className="mb-4 flex items-center gap-1.5 text-[12px] text-muted hover:text-ink">
        <i className="ti ti-arrow-left" /> Volver a clientes
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[18px] font-semibold text-accent">
            {initials(cliente.nombre)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[19px] font-bold text-ink">{cliente.nombre}</div>
            <div className="text-[12px] text-muted">{TIPO_LABEL[cliente.tipo]}</div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-edit" /> Editar
          </button>
          {profile?.es_admin && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <i className="ti ti-trash" /> Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Estado</div>
          <div className="mt-1 text-[13px] font-medium text-ink">{ESTADO_LABEL[cliente.estado]}</div>
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Correo</div>
          <div className={`mt-1 text-[13px] font-medium ${cliente.email ? 'text-ink' : 'italic text-muted'}`}>{cliente.email || 'Sin registrar'}</div>
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Teléfono</div>
          <div className={`mt-1 text-[13px] font-medium ${cliente.telefono ? 'text-ink' : 'italic text-muted'}`}>{cliente.telefono || 'Sin registrar'}</div>
        </div>
      </div>

      {cliente.etiquetas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cliente.etiquetas.map((t) => (
            <span key={t} className="rounded-full border border-border bg-soft px-2 py-0.5 text-[11px] text-muted">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Casos vinculados</div>
      <div className="flex flex-col gap-2">
        {casos.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/casos/${c.id}`)}
            className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-left transition hover:border-mute2/40"
          >
            <span className="text-[13px] font-medium text-ink">{c.titulo}</span>
            <EtapaPill etapa={c.etapa_id ? etapas.find((e) => e.id === c.etapa_id) : null} />
          </button>
        ))}
        {casos.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-border p-5 text-center text-[12px] text-mute2">
            Sin casos vinculados todavía. Añádelo desde la pestaña Información de un caso.
          </div>
        )}
      </div>

      <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Bitácora de interacciones</div>

      <div className="mb-3 flex gap-2">
        <input
          value={nuevaNota}
          onChange={(e) => setNuevaNota(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddNota()}
          placeholder="Registrar una interacción..."
          className="flex-1 rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        <button
          onClick={onAddNota}
          disabled={saving || !nuevaNota.trim()}
          className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {notas.map((n) => (
          <div key={n.id} className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
            <div className="text-[13px] text-ink">{n.contenido}</div>
            <div className="mt-1 text-[11px] text-mute2">
              {new Date(n.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        ))}
        {notas.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-[12px] text-mute2">
            Sin interacciones registradas.
          </div>
        )}
      </div>

      <ClienteFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        cliente={cliente}
        onUpdated={(updated) => setCliente(updated)}
      />
    </div>
  )
}
