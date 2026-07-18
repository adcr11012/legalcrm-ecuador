import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageAction } from '@/components/layout/PageActionContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { listClientes } from '@/features/clientes/api'
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal'
import { ClienteSidebar } from '@/features/clientes/ClienteSidebar'
import { ClienteDetail } from '@/features/clientes/ClienteDetail'
import type { Cliente } from '@/types/database'

export default function Clientes() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const puedeCrear = profile?.rol === 'administrador' || profile?.rol === 'master'
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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

  usePageAction(puedeCrear ? { label: 'Nuevo cliente', onClick: () => setModalOpen(true) } : null)

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando clientes…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>

  return (
    <div className="flex flex-1 overflow-hidden">
      {clientes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
          Aún no hay clientes registrados.
        </div>
      ) : (
        <>
          <div className={`${id ? 'hidden lg:flex' : 'flex'} w-full lg:w-auto`}>
            <ClienteSidebar clientes={clientes} selectedId={id ?? null} onSelect={(cid) => navigate(`/clientes/${cid}`)} />
          </div>
          {id && (
            <div className="min-w-0 flex flex-1">
              <ClienteDetail
                clienteId={id}
                onBack={() => navigate('/clientes')}
                onDeleted={() => {
                  setClientes((prev) => prev.filter((c) => c.id !== id))
                  navigate('/clientes')
                }}
              />
            </div>
          )}
        </>
      )}

      <ClienteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(c) => {
          setClientes((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))
          navigate(`/clientes/${c.id}`)
        }}
      />
    </div>
  )
}
