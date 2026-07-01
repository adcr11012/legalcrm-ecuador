import { useCallback, useEffect, useState } from 'react'
import { getCliente, deleteCliente, updateCliente } from '@/features/clientes/api'
import { listNotas, addNota, updateNota, deleteNota, addHistorial } from '@/features/clientes/notasApi'
import { listCasosPorCliente, removePersona } from '@/features/casos/personasApi'
import { listCasosByIds } from '@/features/casos/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal'
import { VincularCasoModal } from '@/features/clientes/VincularCasoModal'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Caso, CasoPersona, Cliente, ClienteNota, EstadoCliente, Etapa } from '@/types/database'

const ESTADO_LABEL: Record<EstadoCliente, string> = { activo: 'Activo', inactivo: 'Inactivo', potencial: 'Potencial' }
const TIPO_LABEL: Record<string, string> = { persona_natural: 'Persona natural', empresa: 'Empresa' }

const fieldInputClass =
  'mt-1 w-full rounded-[6px] border border-border bg-bg px-1.5 py-1 text-[13px] font-medium text-ink outline-none focus:border-accent'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export function ClienteDetail({
  clienteId,
  onBack,
  onDeleted,
}: {
  clienteId: string
  onBack: () => void
  onDeleted: () => void
}) {
  const { profile } = useAuth()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [casos, setCasos] = useState<Caso[]>([])
  const [personasCliente, setPersonasCliente] = useState<CasoPersona[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [notas, setNotas] = useState<ClienteNota[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [editandoNota, setEditandoNota] = useState<{ id: string; texto: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [vincularOpen, setVincularOpen] = useState(false)
  const [proximoSeguimiento, setProximoSeguimiento] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, n, personas, e] = await Promise.all([
        getCliente(clienteId),
        listNotas(clienteId),
        listCasosPorCliente(clienteId),
        listEtapas(),
      ])
      setCliente(c)
      setNotas(n)
      setEtapas(e)
      setPersonasCliente(personas)
      setProximoSeguimiento(c?.proximo_seguimiento ?? '')
      const casoIds = personas.map((p) => p.caso_id)
      setCasos(await listCasosByIds(casoIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el cliente.')
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete() {
    if (!cliente) return
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) return
    await deleteCliente(cliente.id)
    onDeleted()
  }

  async function onAddNota() {
    if (!profile || !nuevaNota.trim()) return
    setSaving(true)
    try {
      const nota = await addNota(clienteId, profile.id, nuevaNota.trim())
      setNotas((prev) => [nota, ...prev])
      setNuevaNota('')
    } finally {
      setSaving(false)
    }
  }

  async function onEditNota() {
    if (!profile || !editandoNota || !editandoNota.texto.trim()) return
    const anterior = notas.find((n) => n.id === editandoNota.id)?.contenido ?? ''
    const updated = await updateNota(editandoNota.id, editandoNota.texto.trim())
    setNotas((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    await addHistorial(clienteId, profile.id, 'Interacción editada', `Antes: "${anterior}" → Ahora: "${updated.contenido}"`)
    setEditandoNota(null)
  }

  async function onDeleteNota(nota: ClienteNota) {
    if (!profile) return
    if (!confirm('¿Eliminar esta interacción? Quedará registrado en el historial.')) return
    await deleteNota(nota.id)
    setNotas((prev) => prev.filter((n) => n.id !== nota.id))
    await addHistorial(clienteId, profile.id, 'Interacción eliminada', `"${nota.contenido}"`)
  }

  async function onSaveSeguimiento(value: string) {
    setProximoSeguimiento(value)
    const updated = await updateCliente(clienteId, { proximo_seguimiento: value || null })
    setCliente(updated)
  }

  async function onDesvincularCaso(casoId: string) {
    const persona = personasCliente.find((p) => p.caso_id === casoId)
    if (!persona) return
    if (!confirm('¿Desvincular este caso del cliente?')) return
    await removePersona(persona.id)
    setPersonasCliente((prev) => prev.filter((p) => p.id !== persona.id))
    setCasos((prev) => prev.filter((c) => c.id !== casoId))
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!cliente) return <div className="flex-1 p-5 text-[13px] text-muted">Cliente no encontrado.</div>

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border bg-surface px-3 pb-3.5 pt-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink lg:hidden"
          >
            <i className="ti ti-arrow-left" />
          </button>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[16px] font-semibold text-accent">
            {initials(cliente.nombre)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold text-ink sm:text-[19px]">{cliente.nombre}</div>
            <div className="text-[12px] text-muted">{TIPO_LABEL[cliente.tipo]}</div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-edit" /> <span className="hidden sm:inline">Editar</span>
          </button>
          {profile?.rol === 'administrador' && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <i className="ti ti-trash" /> <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
          <button
            onClick={onBack}
            title="Cerrar"
            className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft hover:text-ink lg:flex"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Estado</div>
            <div className="mt-1 text-[13px] font-medium text-ink">{ESTADO_LABEL[cliente.estado]}</div>
          </div>
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Correo</div>
            <div className={`mt-1 text-[13px] font-medium ${cliente.email ? 'text-ink' : 'italic text-muted'}`}>
              {cliente.email || 'Sin registrar'}
            </div>
          </div>
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Teléfono</div>
            <div className={`mt-1 text-[13px] font-medium ${cliente.telefono ? 'text-ink' : 'italic text-muted'}`}>
              {cliente.telefono || 'Sin registrar'}
            </div>
          </div>
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Origen</div>
            <div className={`mt-1 text-[13px] font-medium ${cliente.origen ? 'text-ink' : 'italic text-muted'}`}>
              {cliente.origen || 'Sin registrar'}
            </div>
          </div>
          <div className="sm:col-span-2 rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Próximo seguimiento</div>
            <input
              type="date"
              value={proximoSeguimiento}
              onChange={(e) => onSaveSeguimiento(e.target.value)}
              className={fieldInputClass}
            />
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

        <div className="mt-6 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-mute2">Casos vinculados</span>
          <button
            onClick={() => setVincularOpen(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            <i className="ti ti-plus" /> Vincular caso
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {casos.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5"
            >
              <span className="text-[13px] font-medium text-ink">{c.titulo}</span>
              <div className="flex items-center gap-2">
                <EtapaPill etapa={c.etapa_id ? etapas.find((e) => e.id === c.etapa_id) : null} />
                <button
                  onClick={() => onDesvincularCaso(c.id)}
                  title="Desvincular"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-mute2 opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
                >
                  <i className="ti ti-x text-[12px]" />
                </button>
              </div>
            </div>
          ))}
          {casos.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-border p-5 text-center text-[12px] text-mute2">
              Sin casos vinculados todavía.
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
            <div key={n.id} className="group rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
              {editandoNota?.id === n.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={editandoNota.texto}
                    onChange={(e) => setEditandoNota({ ...editandoNota, texto: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') onEditNota(); if (e.key === 'Escape') setEditandoNota(null) }}
                    className="flex-1 rounded-[6px] border border-accent bg-bg px-2 py-1 text-[13px] text-ink outline-none"
                  />
                  <button onClick={onEditNota} className="rounded-[6px] bg-accent px-3 py-1 text-[12px] text-white">Guardar</button>
                  <button onClick={() => setEditandoNota(null)} className="rounded-[6px] border border-border px-3 py-1 text-[12px] text-muted">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] text-ink">{n.contenido}</div>
                    <div className="mt-1 text-[11px] text-mute2">
                      {new Date(n.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  {profile?.rol === 'administrador' && (
                    <div className="flex flex-shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => setEditandoNota({ id: n.id, texto: n.contenido })}
                        className="flex h-6 w-6 items-center justify-center rounded-[5px] text-mute2 hover:bg-soft hover:text-ink"
                        title="Editar"
                      >
                        <i className="ti ti-edit text-[12px]" />
                      </button>
                      <button
                        onClick={() => onDeleteNota(n)}
                        className="flex h-6 w-6 items-center justify-center rounded-[5px] text-mute2 hover:bg-danger-soft hover:text-danger"
                        title="Eliminar"
                      >
                        <i className="ti ti-trash text-[12px]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {notas.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-[12px] text-mute2">
              Sin interacciones registradas.
            </div>
          )}
        </div>
      </div>

      <ClienteFormModal open={editOpen} onClose={() => setEditOpen(false)} cliente={cliente} onUpdated={(updated) => setCliente(updated)} />
      <VincularCasoModal
        open={vincularOpen}
        onClose={() => setVincularOpen(false)}
        clienteId={clienteId}
        clienteNombre={cliente.nombre}
        casosVinculadosIds={casos.map((c) => c.id)}
        onVinculado={(caso) => setCasos((prev) => [...prev, caso])}
      />
    </div>
  )
}
