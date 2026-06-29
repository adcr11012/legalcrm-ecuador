import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageAction } from '@/components/layout/PageActionContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { listCasos, updateEtapaCaso } from '@/features/casos/api'
import { listPersonasForCasos } from '@/features/casos/personasApi'
import { listEtapas } from '@/features/casos/etapasApi'
import { listWorkspaceUsers } from '@/features/users/api'
import { CasoFormModal } from '@/features/casos/CasoFormModal'
import { CaseSidebar } from '@/features/casos/CaseSidebar'
import { CaseDetail } from '@/features/casos/CaseDetail'
import { CasosKanban } from '@/features/casos/CasosKanban'
import { Modal } from '@/components/Modal'
import type { Caso, CasoPersona, Etapa, Usuario } from '@/types/database'

export default function Casos() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [casos, setCasos] = useState<Caso[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [personasByCaso, setPersonasByCaso] = useState<Map<string, CasoPersona[]>>(new Map())
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [kanbanModalCasoId, setKanbanModalCasoId] = useState<string | null>(null)

  const etapasById = new Map(etapas.map((e) => [e.id, e]))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCasos()
      setCasos(data)
      if (!id && data[0]) navigate(`/casos/${data[0].id}`, { replace: true })

      const [personas, users, etapasData] = await Promise.all([
        listPersonasForCasos(data.map((c) => c.id)),
        listWorkspaceUsers(),
        listEtapas(),
      ])
      const pMap = new Map<string, CasoPersona[]>()
      for (const p of personas) {
        pMap.set(p.caso_id, [...(pMap.get(p.caso_id) ?? []), p])
      }
      setPersonasByCaso(pMap)
      setUsersById(new Map(users.map((u) => [u.id, u])))
      setEtapas(etapasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los casos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  usePageAction(
    profile
      ? {
          label: 'Nuevo caso',
          onClick: () => setModalOpen(true),
        }
      : null,
  )

  async function onKanbanEtapaChange(casoId: string, etapaId: string) {
    const updated = await updateEtapaCaso(casoId, etapaId)
    setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando casos…</div>

  if (error) {
    return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-border bg-surface px-3 py-2">
        <div className="flex gap-0.5 rounded-[6px] bg-soft p-0.5">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] transition ${view === 'list' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            <i className="ti ti-list" /> Lista
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] transition ${view === 'kanban' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            <i className="ti ti-layout-columns" /> Kanban
          </button>
        </div>
      </div>

      {casos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
          Aún no hay casos registrados.
        </div>
      ) : view === 'kanban' ? (
        <CasosKanban
          casos={casos}
          etapas={etapas}
          personasByCaso={personasByCaso}
          usersById={usersById}
          onOpen={(cid) => setKanbanModalCasoId(cid)}
          onEtapaChange={onKanbanEtapaChange}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className={`${id ? 'hidden lg:flex' : 'flex'} w-full lg:w-auto`}>
            <CaseSidebar casos={casos} etapasById={etapasById} selectedId={id ?? null} onSelect={(cid) => navigate(`/casos/${cid}`)} />
          </div>
          <div className={`${id ? 'flex' : 'hidden lg:flex'} flex-1`}>
            {id ? (
              <CaseDetail
                casoId={id}
                onBack={() => navigate('/casos')}
                onDeleted={() => {
                  setCasos((prev) => prev.filter((c) => c.id !== id))
                  navigate('/casos')
                }}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-[13px] text-muted">Selecciona un caso.</div>
            )}
          </div>
        </div>
      )}

      <CasoFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(c) => {
          setCasos((prev) => [c, ...prev])
          navigate(`/casos/${c.id}`)
        }}
      />

      <Modal
        open={kanbanModalCasoId !== null}
        onClose={() => setKanbanModalCasoId(null)}
        title="Detalle del caso"
        maxWidth={840}
        bodyClassName="flex flex-1 flex-col overflow-hidden"
      >
        {kanbanModalCasoId && (
          <CaseDetail
            casoId={kanbanModalCasoId}
            onDeleted={() => {
              setCasos((prev) => prev.filter((c) => c.id !== kanbanModalCasoId))
              setKanbanModalCasoId(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
