import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getCaso, updateCaso, updateEtapaCaso, deleteCaso } from '@/features/casos/api'
import { listPersonas, removePersona } from '@/features/casos/personasApi'
import { listDocumentos, toggleVisibilidad, deleteDocumento, deleteDocumentosCaso, leerDocumentoAhora } from '@/features/casos/documentosApi'
import { renameDriveFile } from '@/features/workspace/driveApi'
import { listPlazos, deletePlazo } from '@/features/casos/plazosApi'
import { listTareas } from '@/features/casos/tareasApi'
import { listHistorial } from '@/features/casos/historialApi'
import { listWorkspaceUsers } from '@/features/users/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { listAnticipos, listGastos, listHoras } from '@/features/casos/pagosApi'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { InfoTab } from '@/features/casos/tabs/InfoTab'
import { DocumentosTab } from '@/features/casos/tabs/DocumentosTab'
import { PlazosTab } from '@/features/casos/tabs/PlazosTab'
import { TareasTab } from '@/features/casos/tabs/TareasTab'
import { HistorialTab } from '@/features/casos/tabs/HistorialTab'
import { NotasTab } from '@/features/casos/tabs/NotasTab'
import { IATab } from '@/features/casos/tabs/IATab'
import { PagosTab } from '@/features/casos/tabs/PagosTab'
import { AddPersonaModal } from '@/features/casos/AddPersonaModal'
import { AddPlazoModal } from '@/features/casos/AddPlazoModal'
import { AddDocumentoModal } from '@/features/casos/AddDocumentoModal'
import { CasoFormModal } from '@/features/casos/CasoFormModal'
import { MATERIA_LABEL } from '@/features/casos/materias'
import type { Caso, CasoAnticipo, CasoGasto, CasoHora, CasoPersona, Documento, Etapa, HistorialEntry, Plazo, Tarea, Usuario } from '@/types/database'

const TABS = [
  { key: 'info', label: 'Información', icon: 'ti-info-circle' },
  { key: 'tareas', label: 'Tareas', icon: 'ti-checkbox' },
  { key: 'docs', label: 'Documentos', icon: 'ti-files' },
  { key: 'plazos', label: 'Plazos', icon: 'ti-clock' },
  { key: 'pagos', label: 'Pagos', icon: 'ti-cash' },
  { key: 'hist', label: 'Historial', icon: 'ti-history' },
  { key: 'notas', label: 'Notas', icon: 'ti-notes' },
  { key: 'ia', label: 'IA', icon: 'ti-sparkles' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function CaseDetail({
  casoId,
  onDeleted,
  onBack,
}: {
  casoId: string
  onDeleted?: () => void
  onBack?: () => void
}) {
  const { profile } = useAuth()
  const [caso, setCaso] = useState<Caso | null>(null)
  const [personas, setPersonas] = useState<CasoPersona[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [plazos, setPlazos] = useState<Plazo[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [anticipos, setAnticipos] = useState<CasoAnticipo[]>([])
  const [gastos, setGastos] = useState<CasoGasto[]>([])
  const [horas, setHoras] = useState<CasoHora[]>([])
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('info')

  const [addPersonaOpen, setAddPersonaOpen] = useState(false)
  const [addPlazoOpen, setAddPlazoOpen] = useState(false)
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [campoError, setCampoError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTab('info')
    try {
      const [c, p, d, pl, h, u, e, tr, ant, gas, hor] = await Promise.all([
        getCaso(casoId),
        listPersonas(casoId),
        listDocumentos(casoId),
        listPlazos(casoId),
        listHistorial(casoId),
        listWorkspaceUsers(),
        listEtapas(),
        listTareas(casoId),
        listAnticipos(casoId),
        listGastos(casoId),
        listHoras(casoId),
      ])
      setCaso(c)
      setPersonas(p)
      setDocumentos(d)
      setPlazos(pl)
      setHistorial(h)
      setTareas(tr)
      setAnticipos(ant)
      setGastos(gas)
      setHoras(hor)
      setUsersById(new Map(u.map((x) => [x.id, x])))
      setEtapas(e)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el caso.')
    } finally {
      setLoading(false)
    }
  }, [casoId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando caso…</div>
  if (error) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!caso) return <div className="flex-1 p-5 text-[13px] text-muted">Caso no encontrado.</div>

  const miRol = personas.find((p) => p.user_id === profile?.id)?.rol
  const esAdmin = profile?.rol === 'administrador'
  const esMaster = profile?.rol === 'master'
  const puedeEditar = esAdmin || esMaster || miRol === 'abogado'
  const puedeSubirDocs = puedeEditar || miRol === 'cliente'
  const showNotas = puedeEditar

  async function onChangeEtapa(etapaId: string) {
    const updated = await updateEtapaCaso(caso!.id, etapaId)
    setCaso(updated)
    setHistorial(await listHistorial(caso!.id))
  }

  async function onSaveNota(nota: string) {
    const updated = await updateCaso(caso!.id, { nota_interna: nota })
    setCaso(updated)
    setHistorial(await listHistorial(caso!.id))
  }

  async function onUpdateCampo(patch: Partial<Caso>) {
    try {
      setCampoError(null)
      const updated = await updateCaso(caso!.id, patch)
      setCaso(updated)
    } catch (err) {
      setCampoError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.')
    }
  }

  async function onRemovePersona(id: string) {
    await removePersona(id)
    setPersonas((prev) => prev.filter((p) => p.id !== id))
  }

  async function onToggleDocVisibilidad(doc: Documento) {
    const updated = await toggleVisibilidad(doc.id, doc.visibilidad === 'privado' ? 'compartido' : 'privado')
    setDocumentos((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  async function onRenameDoc(id: string, nuevoNombre: string) {
    const updated = await renameDriveFile(id, nuevoNombre)
    setDocumentos((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  async function onDeleteDoc(id: string) {
    await deleteDocumento(id)
    setDocumentos((prev) => prev.filter((d) => d.id !== id))
  }

  async function onLeerDocAhora(id: string) {
    try {
      await leerDocumentoAhora(id)
    } finally {
      setDocumentos(await listDocumentos(caso!.id))
    }
  }

  async function onDeletePlazo(id: string) {
    await deletePlazo(id)
    setPlazos((prev) => prev.filter((p) => p.id !== id))
  }

  async function onDeleteCaso() {
    if (!confirm(`¿Eliminar el caso "${caso!.titulo}"? Esta acción no se puede deshacer.`)) return
    const docsConArchivo = documentos.filter((d) => d.drive_file_id)
    if (docsConArchivo.length > 0) {
      const borrarDrive = confirm(
        `Este caso tiene ${docsConArchivo.length} documento${docsConArchivo.length === 1 ? '' : 's'} en Google Drive.\n\n¿Deseas eliminarlos también de Drive?\n\nAceptar = eliminar de Drive\nCancelar = dejar en Drive (quedarán sin vínculo)`
      )
      if (borrarDrive) await deleteDocumentosCaso(caso!.id)
    }
    await deleteCaso(caso!.id)
    onDeleted?.()
  }

  const visibleTabs = TABS.filter((t) => t.key !== 'notas' || showNotas)

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border bg-surface px-3 pb-3.5 pt-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-muted transition hover:bg-soft hover:text-ink lg:hidden"
            >
              <i className="ti ti-arrow-left" />
            </button>
          )}
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold tracking-tight text-ink sm:text-[19px]">{caso.titulo}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <EtapaPill etapa={caso.etapa_id ? etapas.find((e) => e.id === caso.etapa_id) : null} />
              <span className="inline-block rounded-full border border-border bg-soft px-2 py-0.5 text-[10px] font-medium text-muted">
                {MATERIA_LABEL[caso.materia ?? 'otro']}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {puedeEditar && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
            >
              <i className="ti ti-edit" /> <span className="hidden sm:inline">Editar</span>
            </button>
          )}
          {esAdmin && (
            <button
              onClick={onDeleteCaso}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <i className="ti ti-trash" /> <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-0 overflow-x-auto border-b border-border bg-surface px-3 sm:px-5">
        {visibleTabs.map((t) => {
          const isActive = tab === t.key
          const tareasCount = t.key === 'tareas' ? tareas.filter((x) => x.estado !== 'completada').length : 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.label}
              className={`relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition ${
                isActive ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <i className={`ti ${t.icon} text-[16px]`} />
              {isActive && <span>{t.label}</span>}
              {t.key === 'tareas' && tareasCount > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${isActive ? 'bg-accent/20 text-accent' : 'bg-accent-soft text-accent'}`}>
                  {tareasCount}
                </span>
              )}
              {t.key === 'docs' && documentos.length > 0 && !isActive && (
                <span className="rounded-full bg-soft px-1.5 text-[10px] text-mute2">{documentos.length}</span>
              )}
              {t.key === 'plazos' && plazos.length > 0 && !isActive && (
                <span className="rounded-full bg-soft px-1.5 text-[10px] text-mute2">{plazos.length}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {campoError && (
          <div className="mb-3 rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">
            {campoError}
          </div>
        )}
        {tab === 'info' && (
          <InfoTab
            caso={caso}
            personas={personas}
            usersById={usersById}
            etapas={etapas}
            puedeEditar={puedeEditar}
            onChangeEtapa={onChangeEtapa}
            onUpdateCampo={onUpdateCampo}
            onOpenAddPersona={() => setAddPersonaOpen(true)}
            onRemovePersona={onRemovePersona}
            tienePlazos={plazos.length > 0}
            tieneDocumentos={documentos.length > 0}
            onOpenAddPlazo={() => setAddPlazoOpen(true)}
            onOpenAddDoc={() => {
              setTab('docs')
              setAddDocOpen(true)
            }}
          />
        )}
        {tab === 'tareas' && (
          <TareasTab
            tareas={tareas}
            casoId={caso.id}
            workspaceId={caso.workspace_id}
            puedeEditar={puedeEditar}
            usersById={usersById}
            onTareasChange={setTareas}
          />
        )}
        {tab === 'docs' && (
          <DocumentosTab
            documentos={documentos}
            puedeEditar={puedeEditar}
            puedeSubir={puedeSubirDocs}
            onOpenAdd={() => setAddDocOpen(true)}
            onToggleVisibilidad={onToggleDocVisibilidad}
            onRename={onRenameDoc}
            onDelete={onDeleteDoc}
            onLeerAhora={onLeerDocAhora}
          />
        )}
        {tab === 'plazos' && (
          <PlazosTab plazos={plazos} puedeEditar={puedeEditar} onOpenAdd={() => setAddPlazoOpen(true)} onDelete={onDeletePlazo} />
        )}
        {tab === 'pagos' && (
          <PagosTab
            caso={caso}
            anticipos={anticipos}
            gastos={gastos}
            horas={horas}
            puedeEditar={puedeEditar}
            onAnticipoAdded={(a) => setAnticipos((prev) => [...prev, a].sort((x, y) => x.fecha.localeCompare(y.fecha)))}
            onAnticipoDeleted={(id) => setAnticipos((prev) => prev.filter((a) => a.id !== id))}
            onGastoAdded={(g) => setGastos((prev) => [...prev, g].sort((x, y) => x.fecha.localeCompare(y.fecha)))}
            onGastoDeleted={(id) => setGastos((prev) => prev.filter((g) => g.id !== id))}
            onHoraAdded={(h) => setHoras((prev) => [...prev, h].sort((x, y) => x.fecha.localeCompare(y.fecha)))}
            onHoraDeleted={(id) => setHoras((prev) => prev.filter((h) => h.id !== id))}
          />
        )}
        {tab === 'hist' && <HistorialTab historial={historial} />}
        {tab === 'notas' && showNotas && <NotasTab nota={caso.nota_interna} onSave={onSaveNota} />}
        {tab === 'ia' && <IATab casoId={caso.id} />}
      </div>

      <AddPersonaModal
        open={addPersonaOpen}
        onClose={() => setAddPersonaOpen(false)}
        casoId={caso.id}
        onAdded={(p) => setPersonas((prev) => [...prev, p])}
      />
      <AddPlazoModal
        open={addPlazoOpen}
        onClose={() => setAddPlazoOpen(false)}
        casoId={caso.id}
        onAdded={(p) => setPlazos((prev) => [...prev, p].sort((a, b) => a.fecha.localeCompare(b.fecha)))}
      />
      <AddDocumentoModal
        open={addDocOpen}
        onClose={() => setAddDocOpen(false)}
        casoId={caso.id}
        onAdded={(d) => setDocumentos((prev) => [d, ...prev])}
      />
      <CasoFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        caso={caso}
        onUpdated={(updated) => setCaso(updated)}
      />
    </div>
  )
}
