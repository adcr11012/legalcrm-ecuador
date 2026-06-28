import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageAction } from '@/components/layout/PageActionContext'
import { listClientes } from '@/features/clientes/api'
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal'
import type { Cliente, EstadoCliente } from '@/types/database'

const ESTADO_LABEL: Record<EstadoCliente, string> = { activo: 'Activo', inactivo: 'Inactivo', potencial: 'Potencial' }
const ESTADO_CLASS: Record<EstadoCliente, string> = {
  activo: 'bg-accent-soft text-accent',
  inactivo: 'bg-[#f2f1ee] text-mute2 border border-border',
  potencial: 'bg-purple-soft text-purple',
}
const TIPO_LABEL: Record<string, string> = { persona_natural: 'Persona natural', empresa: 'Empresa' }

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtro, setFiltro] = useState<EstadoCliente | 'todos'>('todos')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setClientes(await listClientes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  usePageAction({ label: 'Nuevo cliente', onClick: () => setModalOpen(true) })

  const filtrados = clientes.filter((c) => filtro === 'todos' || c.estado === filtro)

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando clientes…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-4 flex gap-1 rounded-[6px] bg-[#f2f1ee] p-1" style={{ width: 'fit-content' }}>
        {(['todos', 'activo', 'inactivo', 'potencial'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-[5px] px-3 py-1.5 text-[12px] transition ${filtro === f ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-muted">
          No hay clientes en esta vista.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/clientes/${c.id}`)}
              className="rounded-[10px] border border-border bg-surface p-4 text-left transition hover:border-mute2/40 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent">
                  {initials(c.nombre)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-ink">{c.nombre}</div>
                  <div className="text-[11px] text-mute2">{TIPO_LABEL[c.tipo]}</div>
                </div>
              </div>

              {c.etiquetas.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {c.etiquetas.map((t) => (
                    <span key={t} className="rounded-full border border-border bg-[#f2f1ee] px-1.5 py-0.5 text-[10px] text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                {ESTADO_LABEL[c.estado]}
              </span>
            </button>
          ))}
        </div>
      )}

      <ClienteFormModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(c) => setClientes((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))} />
    </div>
  )
}
