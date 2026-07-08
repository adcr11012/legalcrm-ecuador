import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getCaso, updateCaso, updateEtapaCaso, deleteCaso } from '@/features/casos/api'
import { listPersonas, removePersona } from '@/features/casos/personasApi'
import { listDocumentos, toggleVisibilidad, deleteDocumento, deleteDocumentosCaso, leerDocumentoAhora, registrarAccesoDocumento } from '@/features/casos/documentosApi'
import { renameDriveFile } from '@/features/workspace/driveApi'
import { listPlazos } from '@/features/casos/plazosApi'
import { listHistorial } from '@/features/casos/historialApi'
import { listComentarios } from '@/features/casos/comentariosApi'
import { listWorkspaceUsers } from '@/features/users/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { listAnticipos, listGastos, listHoras } from '@/features/casos/pagosApi'
import { listCarpetas } from '@/features/casos/carpetasApi'
import { EtapaPill } from '@/features/casos/etapaDisplay'
import { InfoTab } from '@/features/casos/tabs/InfoTab'
import { DocumentosTab } from '@/features/casos/tabs/DocumentosTab'
import { AgendaTab } from '@/features/casos/tabs/AgendaTab'
import { HistorialTab } from '@/features/casos/tabs/HistorialTab'
import { NotasTab } from '@/features/casos/tabs/NotasTab'
import { ComentariosTab } from '@/features/casos/tabs/ComentariosTab'
import { SatjeTab } from '@/features/casos/tabs/SatjeTab'
import { getWorkspace } from '@/features/workspace/api'
import { IATab } from '@/features/casos/tabs/IATab'
import { PagosTab } from '@/features/casos/tabs/PagosTab'
import { AddPersonaModal } from '@/features/casos/AddPersonaModal'
import { AddPlazoModal } from '@/features/casos/AddPlazoModal'
import { AddDocumentoModal } from '@/features/casos/AddDocumentoModal'
import { CasoFormModal } from '@/features/casos/CasoFormModal'
import { InformeCaso } from '@/features/casos/InformeCaso'
import { nombrePersona } from '@/features/casos/personaDisplay'
import { MATERIA_LABEL } from '@/features/casos/materias'
import type { Carpeta, Caso, CasoAnticipo, CasoComentario, CasoGasto, CasoHora, CasoPersona, Documento, Etapa, HistorialEntry, Plazo, Usuario } from '@/types/database'
import { useDevice } from '@/context/DeviceModeContext'

const TABS = [
  { key: 'info',    label: 'Información', icon: 'ti-info-circle' },
  { key: 'agenda',  label: 'Agenda',      icon: 'ti-calendar-event' },
  { key: 'docs',    label: 'Documentos',  icon: 'ti-files' },
  { key: 'pagos',   label: 'Pagos',       icon: 'ti-cash' },
  { key: 'comentarios', label: 'Comentarios', icon: 'ti-message-circle' },
  { key: 'esatje',  label: 'eSATJE',       icon: 'ti-gavel' },
  { key: 'hist',    label: 'Historial',   icon: 'ti-history' },
  { key: 'notas',   label: 'Notas',       icon: 'ti-notes' },
  { key: 'ia',      label: 'IA',          icon: 'ti-sparkles' },
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
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [comentarios, setComentarios] = useState<CasoComentario[]>([])
  const [anticipos, setAnticipos] = useState<CasoAnticipo[]>([])
  const [gastos, setGastos] = useState<CasoGasto[]>([])
  const [horas, setHoras] = useState<CasoHora[]>([])
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [usersById, setUsersById] = useState<Map<string, Usuario>>(new Map())
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [satjeActivo, setSatjeActivo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('info')

  const [addPersonaOpen, setAddPersonaOpen] = useState(false)
  const [addPlazoOpen, setAddPlazoOpen] = useState(false)
  const [editingPlazo, setEditingPlazo] = useState<Plazo | null>(null)
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [informeOpen, setInformeOpen] = useState(false)
  const [campoError, setCampoError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTab('info')
    try {
      const [c, p, d, pl, h, u, e, ant, gas, hor, carp, com] = await Promise.all([
        getCaso(casoId),
        listPersonas(casoId),
        listDocumentos(casoId),
        listPlazos(casoId),
        listHistorial(casoId),
        listWorkspaceUsers(),
        listEtapas(),
        listAnticipos(casoId),
        listGastos(casoId),
        listHoras(casoId),
        listCarpetas(casoId).catch(() => [] as Carpeta[]),
        listComentarios(casoId),
      ])
      setCaso(c)
      setPersonas(p)
      setDocumentos(d)
      setPlazos(pl)
      setHistorial(h)
      setAnticipos(ant)
      setGastos(gas)
      setHoras(hor)
      setCarpetas(carp)
      setComentarios(com)
      setUsersById(new Map(u.map((x) => [x.id, x])))
      setEtapas(e)
      if (c) {
        const ws = await getWorkspace(c.workspace_id)
        setSatjeActivo(ws?.satje_sincronizacion_activa ?? false)
      }
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
    if (caso) registrarAccesoDocumento({ documento_id: id, workspace_id: caso.workspace_id, accion: 'renombrado', nombre_doc: nuevoNombre, caso_id: caso.id })
  }

  async function onDeleteDoc(id: string) {
    const doc = documentos.find(d => d.id === id)
    await deleteDocumento(id)
    setDocumentos((prev) => prev.filter((d) => d.id !== id))
    if (caso) registrarAccesoDocumento({ documento_id: id, workspace_id: caso.workspace_id, accion: 'eliminacion', nombre_doc: doc?.nombre, caso_id: caso.id })
  }

  async function onLeerDocAhora(id: string) {
    try {
      await leerDocumentoAhora(id)
    } finally {
      setDocumentos(await listDocumentos(caso!.id))
    }
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

  const { isMobile } = useDevice()
  const MOBILE_TABS = new Set(['info', 'agenda', 'docs', 'notas'])
  const visibleTabs = TABS.filter((t) => {
    if (t.key === 'notas' && !showNotas) return false
    if (isMobile && !MOBILE_TABS.has(t.key)) return false
    return true
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
      <div className={`flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border bg-surface ${isMobile ? 'px-4 pb-4 pt-4' : 'px-3 pb-3.5 pt-4 sm:px-5'}`}>
        <div className="flex min-w-0 items-start gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`flex flex-shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-soft hover:text-ink lg:hidden ${isMobile ? 'h-9 w-9' : 'h-7 w-7 rounded-[6px]'}`}
            >
              <i className={`ti ti-arrow-left ${isMobile ? 'text-[20px]' : ''}`} />
            </button>
          )}
          <div className="min-w-0">
            <div className={`truncate font-bold tracking-tight text-ink ${isMobile ? 'text-[18px] leading-snug' : 'text-[17px] sm:text-[19px]'}`}>{caso.titulo}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <EtapaPill etapa={caso.etapa_id ? etapas.find((e) => e.id === caso.etapa_id) : null} />
              <span className={`inline-block rounded-full border border-border bg-soft px-2 py-0.5 font-medium text-muted ${isMobile ? 'text-[12px]' : 'text-[10px]'}`}>
                {MATERIA_LABEL[caso.materia ?? 'otro']}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => setInformeOpen(true)}
            className={`flex items-center gap-1.5 rounded-[8px] border border-border text-muted transition hover:bg-soft ${isMobile ? 'px-3 py-2 text-[13px]' : 'px-3 py-1.5 text-[12px]'}`}
          >
            <i className="ti ti-file-description" /> <span className={isMobile ? '' : 'hidden sm:inline'}>Informe</span>
          </button>
          {puedeEditar && !isMobile && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
            >
              <i className="ti ti-edit" /> <span className="hidden sm:inline">Editar</span>
            </button>
          )}
          {esAdmin && !isMobile && (
            <button
              onClick={onDeleteCaso}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <i className="ti ti-trash" /> <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      <div className={`flex flex-shrink-0 gap-0 overflow-x-auto border-b border-border bg-surface ${isMobile ? 'px-2' : 'px-3 sm:px-5'}`}>
        {visibleTabs.map((t) => {
          const isActive = tab === t.key
          const agendaCount = t.key === 'agenda' ? plazos.filter(p => p.estado !== 'completada').length : 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.label}
              className={`relative flex items-center gap-1.5 whitespace-nowrap border-b-2 transition ${
                isActive ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-ink'
              } ${isMobile ? 'flex-col gap-[3px] px-3 py-2.5 text-[10px]' : 'px-3 py-2.5 text-[13px]'}`}
            >
              <i className={`ti ${t.icon} ${isMobile ? 'text-[20px]' : 'text-[16px]'}`} />
              {isMobile ? (
                <span>{t.label}</span>
              ) : (
                isActive && <span>{t.label}</span>
              )}
              {t.key === 'agenda' && agendaCount > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${isActive ? 'bg-accent/20 text-accent' : 'bg-accent-soft text-accent'}`}>
                  {agendaCount}
                </span>
              )}
              {t.key === 'docs' && documentos.length > 0 && !isActive && (
                <span className="rounded-full bg-soft px-1.5 text-[10px] text-mute2">{documentos.length}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${isMobile ? 'px-3 pt-3 pb-[80px]' : 'p-3 sm:p-5'}`}>
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
        {tab === 'agenda' && (
          <AgendaTab
            plazos={plazos}
            casoId={caso.id}
            workspaceId={caso.workspace_id}
            puedeEditar={puedeEditar}
            usersById={usersById}
            users={Array.from(usersById.values())}
            onOpenAdd={() => setAddPlazoOpen(true)}
            onOpenEdit={(p) => setEditingPlazo(p)}
            onPlazosChange={setPlazos}
          />
        )}
        {tab === 'docs' && (
          <DocumentosTab
            documentos={documentos}
            carpetas={carpetas}
            casoId={caso.id}
            workspaceId={caso.workspace_id}
            puedeEditar={puedeEditar}
            puedeSubir={puedeSubirDocs}
            onOpenAdd={() => setAddDocOpen(true)}
            onToggleVisibilidad={onToggleDocVisibilidad}
            onRename={onRenameDoc}
            onDelete={onDeleteDoc}
            onLeerAhora={onLeerDocAhora}
            onCarpetasChange={async () => {
              const [d, carp] = await Promise.all([listDocumentos(caso.id), listCarpetas(caso.id)])
              setDocumentos(d)
              setCarpetas(carp)
            }}
          />
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
        {tab === 'comentarios' && profile && (
          <ComentariosTab
            comentarios={comentarios}
            casoId={caso.id}
            currentUserId={profile.id}
            esAdmin={esAdmin}
            usersById={usersById}
            onChange={setComentarios}
          />
        )}
        {tab === 'esatje' && <SatjeTab casoId={caso.id} activo={satjeActivo} esAdmin={esAdmin} />}
        {tab === 'hist' && <HistorialTab historial={historial} />}
        {tab === 'notas' && showNotas && <NotasTab nota={caso.nota_interna} onSave={onSaveNota} />}
        {tab === 'ia' && <IATab casoId={caso.id} />}
      </div>

      <AddPersonaModal
        open={addPersonaOpen}
        onClose={() => setAddPersonaOpen(false)}
        casoId={caso.id}
        personasExistentes={personas}
        onAdded={(p) => setPersonas((prev) => [...prev, p])}
      />
      <AddPlazoModal
        open={addPlazoOpen || Boolean(editingPlazo)}
        onClose={() => { setAddPlazoOpen(false); setEditingPlazo(null) }}
        casoId={caso.id}
        workspaceId={caso.workspace_id}
        users={Array.from(usersById.values())}
        plazo={editingPlazo}
        onAdded={(p) => setPlazos((prev) => [...prev, p].sort((a, b) => a.fecha.localeCompare(b.fecha)))}
        onUpdated={(p) => setPlazos((prev) => prev.map((x) => (x.id === p.id ? p : x)).sort((a, b) => a.fecha.localeCompare(b.fecha)))}
      />
      <AddDocumentoModal
        open={addDocOpen}
        onClose={() => setAddDocOpen(false)}
        casoId={caso.id}
        onAdded={(d) => {
          setDocumentos((prev) => [d, ...prev])
          if (caso) registrarAccesoDocumento({ documento_id: d.id, workspace_id: caso.workspace_id, accion: 'subida', nombre_doc: d.nombre, caso_id: caso.id })
        }}
      />
      <CasoFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        caso={caso}
        onUpdated={(updated) => setCaso(updated)}
      />
      {informeOpen && (
        <InformeCaso
          caso={caso}
          etapas={etapas}
          personas={personas.map(p => ({ nombre: nombrePersona(p, usersById), rol: p.rol }))}
          plazos={plazos}
          tareas={plazos.filter(p => p.tipo === 'tarea').map(p => ({ id: p.id, workspace_id: p.workspace_id ?? '', caso_id: p.caso_id, titulo: p.titulo, descripcion: p.descripcion, asignado_a: p.asignado_a, fecha_limite: p.fecha, estado: p.estado === 'completada' ? 'completada' : p.estado === 'en_progreso' ? 'en_progreso' : 'pendiente' as const, created_by: null, created_at: p.created_at }))}
          documentos={documentos}
          onClose={() => setInformeOpen(false)}
        />
      )}
    </div>
  )
}
