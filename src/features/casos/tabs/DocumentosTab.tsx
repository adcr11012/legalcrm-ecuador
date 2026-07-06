import { useRef, useState } from 'react'
import type { Carpeta, Documento } from '@/types/database'
import { getDocumentoProxyUrl, registrarAccesoDocumento, compartirDocumento } from '@/features/casos/documentosApi'
import { moverDocumento, createCarpeta, deleteCarpeta, renameCarpeta, reindexCarpetas } from '@/features/casos/carpetasApi'
import { useDevice } from '@/context/DeviceModeContext'

function iconFor(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: 'ti-file-type-pdf', bg: 'bg-danger-soft', fg: 'text-danger' }
  if (ext === 'doc' || ext === 'docx') return { icon: 'ti-file-type-doc', bg: 'bg-accent-soft', fg: 'text-accent' }
  if (ext === 'xls' || ext === 'xlsx') return { icon: 'ti-file-spreadsheet', bg: 'bg-success-soft', fg: 'text-success' }
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return { icon: 'ti-photo', bg: 'bg-soft', fg: 'text-muted' }
  return { icon: 'ti-file', bg: 'bg-soft', fg: 'text-muted' }
}

function estadoLecturaBadge(d: Documento) {
  if (d.estado_lectura === 'listo') return { label: 'IA lista', cls: 'bg-success-soft text-success' }
  if (d.estado_lectura === 'pendiente') return { label: 'En cola', cls: 'bg-soft text-muted' }
  if (d.estado_lectura === 'procesando') return { label: 'Leyendo…', cls: 'bg-accent-soft text-accent' }
  if (d.estado_lectura === 'error') return { label: 'Error IA', cls: 'bg-danger-soft text-danger' }
  return null
}

function buildTree(carpetas: Carpeta[]): { root: Carpeta[]; children: Record<string, Carpeta[]> } {
  const root: Carpeta[] = []
  const children: Record<string, Carpeta[]> = {}
  for (const c of carpetas) {
    if (!c.parent_id) root.push(c)
    else {
      if (!children[c.parent_id]) children[c.parent_id] = []
      children[c.parent_id].push(c)
    }
  }
  return { root, children }
}

// Botón compacto con select nativo invisible encima — al hacer click abre el dropdown completo
function FolderPicker({ carpetas, value, onChange }: {
  carpetas: Carpeta[]; value: string | null; onChange: (id: string | null) => void
}) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const { root, children } = buildTree(carpetas)
  const current = carpetas.find(c => c.id === value)

  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => selectRef.current?.showPicker?.() ?? selectRef.current?.click()}
        className="flex items-center gap-1 rounded-[4px] border border-border bg-bg px-1.5 py-0.5 text-[10px] text-muted transition hover:bg-soft"
        title={current?.nombre ?? 'Sin carpeta'}
      >
        <i className="ti ti-folder text-[11px] flex-shrink-0" />
        <span className="max-w-[64px] truncate">{current?.nombre ?? 'Sin carpeta'}</span>
        <i className="ti ti-chevron-down text-[9px] flex-shrink-0" />
      </button>
      <select
        ref={selectRef}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-hidden
      >
        <option value="">Sin carpeta</option>
        {root.flatMap((c) => [
          <option key={c.id} value={c.id}>{c.nombre}</option>,
          ...(children[c.id] ?? []).map((sub) => (
            <option key={sub.id} value={sub.id}>{'  → ' + sub.nombre}</option>
          )),
        ])}
      </select>
    </div>
  )
}

function MobileDocRow({ d, casoId, workspaceId }: { d: Documento; casoId: string; workspaceId: string }) {
  const [abriendo, setAbriendo] = useState(false)
  const [errorDoc, setErrorDoc] = useState<string | null>(null)
  const { icon, bg, fg } = iconFor(d.nombre)

  async function abrirDoc() {
    setErrorDoc(null)
    setAbriendo(true)
    const w = window.open('', '_blank')
    try {
      const url = await getDocumentoProxyUrl(d.id)
      if (w) w.location.href = url
      registrarAccesoDocumento({ documento_id: d.id, workspace_id: workspaceId, accion: 'apertura', nombre_doc: d.nombre, caso_id: casoId })
    } catch (err) {
      if (w) w.close()
      setErrorDoc(err instanceof Error ? err.message : String(err))
    } finally { setAbriendo(false) }
  }

  return (
    <div className="flex flex-col gap-1">
      {errorDoc && (
        <div className="flex items-center gap-2 rounded-[8px] bg-danger-soft px-3 py-2 text-[12px] text-danger">
          <i className="ti ti-alert-circle" />
          <span className="flex-1">{errorDoc}</span>
          <button onClick={() => setErrorDoc(null)}><i className="ti ti-x" /></button>
        </div>
      )}
      <button
        onClick={d.drive_file_id ? abrirDoc : undefined}
        disabled={abriendo || !d.drive_file_id}
        className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-60"
      >
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] ${bg} ${fg}`}>
          <i className={`ti ${icon} text-[20px]`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{d.nombre}</div>
          <div className="mt-0.5 text-[12px] text-muted">{new Date(d.created_at).toLocaleDateString('es-EC')}</div>
        </div>
        {d.drive_file_id && (
          <i className={`ti ${abriendo ? 'ti-loader-2 animate-spin' : 'ti-eye'} flex-shrink-0 text-[18px] text-muted`} />
        )}
      </button>
    </div>
  )
}

function DocRow({
  d, carpetas, puedeEditar, onToggleVisibilidad, onRename, onDelete, onLeerAhora, leyendoId, onMover, casoId, workspaceId,
}: {
  d: Documento; carpetas: Carpeta[]; puedeEditar: boolean
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nombre: string) => Promise<void>
  onDelete: (id: string) => void
  onLeerAhora: (id: string) => Promise<void>
  leyendoId: string | null
  onMover: (docId: string, carpetaId: string | null) => Promise<void>
  casoId: string
  workspaceId: string
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(d.nombre)
  const [saving, setSaving] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [urlCopiada, setUrlCopiada] = useState(false)
  const [errorDoc, setErrorDoc] = useState<string | null>(null)
  const { icon, bg, fg } = iconFor(d.nombre)
  const badge = estadoLecturaBadge(d)

  async function confirmEdit() {
    if (!editVal.trim()) return
    setSaving(true)
    try { await onRename(d.id, editVal.trim()); setEditing(false) }
    finally { setSaving(false) }
  }

  async function abrirDoc() {
    setErrorDoc(null)
    setAbriendo(true)
    const w = window.open('', '_blank')
    try {
      const url = await getDocumentoProxyUrl(d.id)
      if (w) w.location.href = url
      registrarAccesoDocumento({ documento_id: d.id, workspace_id: workspaceId, accion: 'apertura', nombre_doc: d.nombre, caso_id: casoId })
    } catch (err) {
      if (w) w.close()
      setErrorDoc(err instanceof Error ? err.message : String(err))
    } finally {
      setAbriendo(false)
    }
  }

  async function compartirDoc() {
    setErrorDoc(null)
    setCompartiendo(true)
    try {
      const url = await compartirDocumento(d.id)
      await navigator.clipboard.writeText(url)
      setUrlCopiada(true)
      setTimeout(() => setUrlCopiada(false), 2500)
      registrarAccesoDocumento({ documento_id: d.id, workspace_id: workspaceId, accion: 'descarga', nombre_doc: d.nombre, caso_id: casoId })
    } catch (err) {
      setErrorDoc(err instanceof Error ? err.message : String(err))
    } finally {
      setCompartiendo(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {errorDoc && (
        <div className="flex items-center gap-2 rounded-[6px] bg-danger-soft px-2 py-1 text-[11px] text-danger">
          <i className="ti ti-alert-circle" />
          <span className="flex-1">{errorDoc}</span>
          <button onClick={() => setErrorDoc(null)}><i className="ti ti-x text-[11px]" /></button>
        </div>
      )}
      <div className="flex items-start gap-2.5 rounded-[10px] border border-border bg-surface px-3 py-2.5">
        {/* Icono de tipo */}
        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] ${bg} ${fg}`}>
          <i className={`ti ${icon} text-[16px]`} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Fila 1: nombre + acciones */}
          <div className="flex items-center gap-1.5">
            {editing ? (
              <input
                autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false) }}
                disabled={saving}
                className="min-w-0 flex-1 rounded-[6px] border border-accent bg-bg px-2 py-0.5 text-[13px] text-ink outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={d.nombre}>{d.nombre}</span>
            )}

            {/* Botones de acción */}
            <div className="flex flex-shrink-0 items-center gap-1">
              {editing ? (
                <>
                  <button onClick={confirmEdit} disabled={saving} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-accent text-accent transition hover:bg-accent-soft disabled:opacity-60">
                    <i className="ti ti-check text-[13px]" />
                  </button>
                  <button onClick={() => setEditing(false)} disabled={saving} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-soft">
                    <i className="ti ti-x text-[13px]" />
                  </button>
                </>
              ) : (
                <>
                  {d.drive_file_id && (
                    <button disabled={abriendo} onClick={abrirDoc} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-soft disabled:opacity-50" title="Ver archivo">
                      <i className={`ti ${abriendo ? 'ti-loader-2 animate-spin' : 'ti-eye'} text-[13px]`} />
                    </button>
                  )}
                  {d.drive_file_id && (
                    <button disabled={compartiendo} onClick={compartirDoc}
                      className={`flex h-6 w-6 items-center justify-center rounded-[5px] border transition disabled:opacity-50 ${urlCopiada ? 'border-success bg-success-soft text-success' : 'border-border text-muted hover:bg-soft'}`}
                      title={urlCopiada ? '¡Enlace copiado!' : 'Copiar enlace compartible'}
                    >
                      <i className={`ti ${compartiendo ? 'ti-loader-2 animate-spin' : urlCopiada ? 'ti-check' : 'ti-link'} text-[13px]`} />
                    </button>
                  )}
                  {puedeEditar && (
                    <button onClick={() => { setEditing(true); setEditVal(d.nombre) }} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-soft" title="Renombrar">
                      <i className="ti ti-edit text-[13px]" />
                    </button>
                  )}
                  {puedeEditar && (
                    <button onClick={() => onDelete(d.id)} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger" title="Eliminar">
                      <i className="ti ti-trash text-[13px]" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Fila 2: meta + carpeta + visibilidad */}
          {!editing && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-mute2">{new Date(d.created_at).toLocaleDateString('es-EC')}</span>
              {badge && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${badge.cls}`} title={d.error_lectura ?? undefined}>{badge.label}</span>
              )}
              {(d.estado_lectura === 'pendiente' || d.estado_lectura === 'error') && (
                <button onClick={() => onLeerAhora(d.id)} disabled={leyendoId === d.id} className="text-[10px] text-accent underline-offset-2 hover:underline disabled:opacity-60">
                  {leyendoId === d.id ? 'Leyendo…' : 'Leer ahora'}
                </button>
              )}
              <div className="flex-1" />
              {puedeEditar && carpetas.length > 0 && (
                <FolderPicker carpetas={carpetas} value={d.carpeta_id} onChange={(id) => onMover(d.id, id)} />
              )}
              {puedeEditar ? (
                <button
                  onClick={() => onToggleVisibilidad(d)}
                  className={`rounded-full px-2 py-0.5 text-[10px] transition ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted hover:bg-soft'}`}
                >
                  {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                </button>
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted'}`}>
                  {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CarpetaSection({
  carpeta, allDocumentos, subcarpetas, allCarpetas, siblings, puedeEditar, onToggleVisibilidad, onRename, onDelete, onLeerAhora, leyendoId, onMover, onRenameCarpeta, onDeleteCarpeta, onMoverCarpeta, depth, casoId, workspaceId,
}: {
  carpeta: Carpeta; allDocumentos: Documento[]; subcarpetas: Carpeta[]; allCarpetas: Carpeta[]; siblings: Carpeta[]
  puedeEditar: boolean; leyendoId: string | null; depth: number
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nombre: string) => Promise<void>
  onDelete: (id: string) => void
  onLeerAhora: (id: string) => Promise<void>
  onMover: (docId: string, carpetaId: string | null) => Promise<void>
  onRenameCarpeta: (id: string, nombre: string) => Promise<void>
  onDeleteCarpeta: (id: string) => Promise<void>
  onMoverCarpeta: (a: Carpeta, b: Carpeta, siblings: Carpeta[]) => Promise<void>
  casoId: string
  workspaceId: string
}) {
  const [open, setOpen] = useState(true)
  const [editingCarpeta, setEditingCarpeta] = useState(false)
  const [carpetaName, setCarpetaName] = useState(carpeta.nombre)
  const { children } = buildTree(allCarpetas)
  const docs = allDocumentos.filter(d => d.carpeta_id === carpeta.id)

  const idx = siblings.findIndex(s => s.id === carpeta.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div className="mb-1.5 flex items-center gap-2">
        {depth > 0 && (
          <div className="flex flex-shrink-0 items-center self-start pt-[6px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-border">
              <path d="M2 0 L2 7 L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
        )}
        {editingCarpeta ? (
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <i className={`ti ${open ? 'ti-folder-open' : 'ti-folder'} text-[15px] text-muted flex-shrink-0`} />
            <input
              autoFocus value={carpetaName}
              onChange={(e) => setCarpetaName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') { await onRenameCarpeta(carpeta.id, carpetaName); setEditingCarpeta(false) }
                if (e.key === 'Escape') { setCarpetaName(carpeta.nombre); setEditingCarpeta(false) }
              }}
              onBlur={async () => { await onRenameCarpeta(carpeta.id, carpetaName); setEditingCarpeta(false) }}
              className="flex-1 min-w-0 rounded-[4px] border border-accent bg-bg px-1.5 py-0.5 text-[12px] text-ink outline-none"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => { await onRenameCarpeta(carpeta.id, carpetaName); setEditingCarpeta(false) }}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent text-white"
            >
              <i className="ti ti-check text-[12px]" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setCarpetaName(carpeta.nombre); setEditingCarpeta(false) }}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] border border-border text-muted hover:bg-soft"
            >
              <i className="ti ti-x text-[12px]" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setOpen(v => !v)} className="flex flex-1 min-w-0 items-center gap-1.5">
              <i className={`ti ${open ? 'ti-folder-open' : 'ti-folder'} text-[15px] text-muted`} />
              <span className="truncate text-[12px] font-medium text-ink">{carpeta.nombre}</span>
              <span className="text-[10px] text-muted ml-1">{docs.length}</span>
              <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'} ml-auto text-[11px] text-muted`} />
            </button>
            {puedeEditar && (
              <>
                <span className="select-none text-[10px] text-border">|</span>
                <div className="flex gap-0.5">
                  <button onClick={() => prev && onMoverCarpeta(carpeta, prev, siblings)} disabled={!prev}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-soft disabled:opacity-20" title="Subir">
                    <i className="ti ti-chevron-up text-[12px]" />
                  </button>
                  <button onClick={() => next && onMoverCarpeta(carpeta, next, siblings)} disabled={!next}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-soft disabled:opacity-20" title="Bajar">
                    <i className="ti ti-chevron-down text-[12px]" />
                  </button>
                  <button onClick={() => setEditingCarpeta(true)}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-soft" title="Renombrar">
                    <i className="ti ti-edit text-[12px]" />
                  </button>
                  <button onClick={() => onDeleteCarpeta(carpeta.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-danger-soft hover:text-danger" title="Eliminar carpeta">
                    <i className="ti ti-trash text-[12px]" />
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {open && (
        <div className="mb-3 flex flex-col gap-1.5">
          {docs.map(d => (
            <DocRow key={d.id} d={d} carpetas={allCarpetas} puedeEditar={puedeEditar}
              onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
              onDelete={onDelete} onLeerAhora={onLeerAhora} leyendoId={leyendoId} onMover={onMover}
              casoId={casoId} workspaceId={workspaceId}
            />
          ))}
          {subcarpetas.map(sub => (
            <CarpetaSection
              key={sub.id} carpeta={sub}
              allDocumentos={allDocumentos} subcarpetas={children[sub.id] ?? []}
              allCarpetas={allCarpetas} siblings={subcarpetas} puedeEditar={puedeEditar}
              onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
              onDelete={onDelete} onLeerAhora={onLeerAhora} leyendoId={leyendoId}
              onMover={onMover} onRenameCarpeta={onRenameCarpeta}
              onDeleteCarpeta={onDeleteCarpeta} onMoverCarpeta={onMoverCarpeta} depth={depth + 1}
              casoId={casoId} workspaceId={workspaceId}
            />
          ))}
          {docs.length === 0 && subcarpetas.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-border py-3 text-center text-[11px] text-mute2">Carpeta vacía</div>
          )}
        </div>
      )}
    </div>
  )
}

export function DocumentosTab({
  documentos, carpetas: carpetasProp, casoId, workspaceId, puedeEditar, puedeSubir,
  onOpenAdd, onToggleVisibilidad, onRename, onDelete, onLeerAhora, onCarpetasChange,
}: {
  documentos: Documento[]
  carpetas: Carpeta[]
  casoId: string
  workspaceId: string
  puedeEditar: boolean
  puedeSubir: boolean
  onOpenAdd: () => void
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nuevoNombre: string) => Promise<void>
  onDelete: (id: string) => void
  onLeerAhora: (id: string) => Promise<void>
  onCarpetasChange: () => void
}) {
  const [leyendoId, setLeyendoId] = useState<string | null>(null)
  const [nuevaCarpeta, setNuevaCarpeta] = useState(false)
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState('')
  const [nuevaCarpetaParent, setNuevaCarpetaParent] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const { isMobile } = useDevice()

  const { root, children } = buildTree(carpetasProp)

  async function handleLeerAhora(id: string) {
    setLeyendoId(id)
    try {
      await onLeerAhora(id)
      const doc = documentos.find(d => d.id === id)
      registrarAccesoDocumento({ documento_id: id, workspace_id: workspaceId, accion: 'lectura_ia', nombre_doc: doc?.nombre, caso_id: casoId })
    } finally { setLeyendoId(null) }
  }

  async function handleMover(docId: string, carpetaId: string | null) {
    await moverDocumento(docId, carpetaId)
    onCarpetasChange()
  }

  async function handleMoverCarpeta(a: Carpeta, b: Carpeta, siblings: Carpeta[]) {
    const list = [...siblings]
    const idxA = list.findIndex(c => c.id === a.id)
    const idxB = list.findIndex(c => c.id === b.id)
    ;[list[idxA], list[idxB]] = [list[idxB], list[idxA]]
    await reindexCarpetas(list)
    onCarpetasChange()
  }

  async function handleCrearCarpeta() {
    if (!nuevaCarpetaNombre.trim()) return
    setCreando(true)
    try {
      await createCarpeta(casoId, workspaceId, nuevaCarpetaNombre, nuevaCarpetaParent ?? undefined)
      setNuevaCarpeta(false)
      setNuevaCarpetaNombre('')
      setNuevaCarpetaParent(null)
      onCarpetasChange()
    } finally {
      setCreando(false)
    }
  }

  async function handleDeleteCarpeta(id: string) {
    if (!confirm('¿Eliminar carpeta? Los documentos dentro quedarán sin carpeta.')) return
    await deleteCarpeta(id)
    onCarpetasChange()
  }

  async function handleRenameCarpeta(id: string, nombre: string) {
    await renameCarpeta(id, nombre)
    onCarpetasChange()
  }

  const docsSinCarpeta = documentos.filter(d => !d.carpeta_id)

  if (isMobile) {
    const { root: mRoot, children: mChildren } = buildTree(carpetasProp)
    const docsSinCarpetaMobile = documentos.filter(d => !d.carpeta_id)

    function MobileCarpetaSection({ carpeta, depth }: { carpeta: Carpeta; depth: number }) {
      const [open, setOpen] = useState(true)
      const docs = documentos.filter(d => d.carpeta_id === carpeta.id)
      const subs = mChildren[carpeta.id] ?? []
      return (
        <div style={{ marginLeft: depth * 12 }}>
          <button onClick={() => setOpen(v => !v)}
            className="mb-2 flex w-full items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2.5">
            <i className={`ti ${open ? 'ti-folder-open' : 'ti-folder'} text-[18px] text-muted`} />
            <span className="flex-1 truncate text-left text-[14px] font-medium text-ink">{carpeta.nombre}</span>
            <span className="text-[12px] text-muted">{docs.length}</span>
            <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'} text-[14px] text-muted`} />
          </button>
          {open && (
            <div className="mb-3 flex flex-col gap-2 pl-2">
              {docs.map(d => <MobileDocRow key={d.id} d={d} casoId={casoId} workspaceId={workspaceId} />)}
              {subs.map(sub => <MobileCarpetaSection key={sub.id} carpeta={sub} depth={depth + 1} />)}
              {docs.length === 0 && subs.length === 0 && (
                <div className="rounded-[10px] border border-dashed border-border py-4 text-center text-[12px] text-mute2">Carpeta vacía</div>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] text-muted">{documentos.length} documento{documentos.length === 1 ? '' : 's'}</span>
          {puedeSubir && (
            <button onClick={onOpenAdd} className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover">
              <i className="ti ti-upload text-[16px]" /> Subir
            </button>
          )}
        </div>

        {documentos.length === 0 && carpetasProp.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border py-10 text-center text-[13px] text-mute2">
            Sin documentos cargados.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mRoot.map(c => <MobileCarpetaSection key={c.id} carpeta={c} depth={0} />)}
            {docsSinCarpetaMobile.length > 0 && (
              <>
                {carpetasProp.length > 0 && (
                  <div className="mb-1 flex items-center gap-2 px-1">
                    <i className="ti ti-file text-[16px] text-muted" />
                    <span className="text-[13px] font-medium text-muted">Sin carpeta</span>
                  </div>
                )}
                {docsSinCarpetaMobile.map(d => <MobileDocRow key={d.id} d={d} casoId={casoId} workspaceId={workspaceId} />)}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">{documentos.length} documento{documentos.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          {puedeEditar && (
            <button
              onClick={() => setNuevaCarpeta(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-border px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-soft"
            >
              <i className="ti ti-folder-plus" /> Nueva carpeta
            </button>
          )}
          {puedeSubir && (
            <button onClick={onOpenAdd} className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-2.5 py-1.5 text-[11px] text-white transition hover:bg-accent-hover">
              <i className="ti ti-upload" /> Subir
            </button>
          )}
        </div>
      </div>

      {nuevaCarpeta && (
        <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-accent bg-accent-soft p-2.5">
          <i className="ti ti-folder-plus text-[16px] text-accent" />
          <input
            autoFocus placeholder="Nombre de la carpeta"
            value={nuevaCarpetaNombre} onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCrearCarpeta(); if (e.key === 'Escape') setNuevaCarpeta(false) }}
            className="flex-1 rounded-[6px] border border-border bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
          />
          {carpetasProp.length > 0 && (
            <select
              value={nuevaCarpetaParent ?? ''}
              onChange={(e) => setNuevaCarpetaParent(e.target.value || null)}
              className="rounded-[6px] border border-border bg-bg px-1.5 py-1 text-[11px] text-ink outline-none"
            >
              <option value="">Carpeta raíz</option>
              {root.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <button onClick={handleCrearCarpeta} disabled={creando || !nuevaCarpetaNombre.trim()} className="rounded-[6px] bg-accent px-2.5 py-1 text-[11px] text-white disabled:opacity-50">
            {creando ? 'Creando…' : 'Crear'}
          </button>
          <button onClick={() => setNuevaCarpeta(false)} className="text-muted hover:text-ink">
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {root.map(carpeta => (
          <CarpetaSection
            key={carpeta.id} carpeta={carpeta}
            allDocumentos={documentos}
            subcarpetas={children[carpeta.id] ?? []}
            allCarpetas={carpetasProp} siblings={root} puedeEditar={puedeEditar}
            onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
            onDelete={onDelete} onLeerAhora={handleLeerAhora} leyendoId={leyendoId}
            onMover={handleMover} onRenameCarpeta={handleRenameCarpeta}
            onDeleteCarpeta={handleDeleteCarpeta} onMoverCarpeta={handleMoverCarpeta} depth={0}
            casoId={casoId} workspaceId={workspaceId}
          />
        ))}

        {docsSinCarpeta.length > 0 && (
          <div>
            {carpetasProp.length > 0 && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <i className="ti ti-file text-[14px] text-muted" />
                <span className="text-[12px] font-medium text-muted">Sin carpeta</span>
                <span className="text-[10px] text-muted">{docsSinCarpeta.length}</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {docsSinCarpeta.map(d => (
                <DocRow key={d.id} d={d} carpetas={carpetasProp} puedeEditar={puedeEditar}
                  onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
                  onDelete={onDelete} onLeerAhora={handleLeerAhora} leyendoId={leyendoId}
                  onMover={handleMover} casoId={casoId} workspaceId={workspaceId}
                />
              ))}
            </div>
          </div>
        )}

        {documentos.length === 0 && carpetasProp.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
            Sin documentos cargados.
          </div>
        )}
      </div>
    </div>
  )
}
