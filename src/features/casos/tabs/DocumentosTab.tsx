import { useState } from 'react'
import type { Carpeta, Documento } from '@/types/database'
import { getDocumentoProxyUrl } from '@/features/casos/documentosApi'
import { moverDocumento, createCarpeta, deleteCarpeta, renameCarpeta } from '@/features/casos/carpetasApi'

function iconFor(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: 'ti-file-type-pdf', bg: 'bg-danger-soft', fg: 'text-danger' }
  if (ext === 'doc' || ext === 'docx') return { icon: 'ti-file-type-doc', bg: 'bg-accent-soft', fg: 'text-accent' }
  if (ext === 'xls' || ext === 'xlsx') return { icon: 'ti-file-spreadsheet', bg: 'bg-success-soft', fg: 'text-success' }
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return { icon: 'ti-photo', bg: 'bg-soft', fg: 'text-muted' }
  return { icon: 'ti-file', bg: 'bg-soft', fg: 'text-muted' }
}

function estadoLecturaBadge(d: Documento) {
  if (d.estado_lectura === 'listo') return { label: 'Listo para IA', cls: 'bg-success-soft text-success' }
  if (d.estado_lectura === 'pendiente') return { label: 'En cola para IA', cls: 'bg-soft text-muted' }
  if (d.estado_lectura === 'procesando') return { label: 'Leyendo…', cls: 'bg-accent-soft text-accent' }
  if (d.estado_lectura === 'error') return { label: 'No se pudo leer', cls: 'bg-danger-soft text-danger' }
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

function CarpetaSelector({ carpetas, value, onChange }: { carpetas: Carpeta[]; value: string | null; onChange: (id: string | null) => void }) {
  const { root, children } = buildTree(carpetas)
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-[6px] border border-border bg-bg px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-accent"
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Sin carpeta</option>
      {root.flatMap((c) => [
        <option key={c.id} value={c.id}>{c.nombre}</option>,
        ...(children[c.id] ?? []).map((sub) => (
          <option key={sub.id} value={sub.id}>{'  → ' + sub.nombre}</option>
        )),
      ])}
    </select>
  )
}

function DocRow({
  d, carpetas, puedeEditar, onToggleVisibilidad, onRename, onDelete, onLeerAhora, leyendoId, onMover,
}: {
  d: Documento; carpetas: Carpeta[]; puedeEditar: boolean
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nombre: string) => Promise<void>
  onDelete: (id: string) => void
  onLeerAhora: (id: string) => Promise<void>
  leyendoId: string | null
  onMover: (docId: string, carpetaId: string | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(d.nombre)
  const [saving, setSaving] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
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
    } catch (err) {
      if (w) w.close()
      setErrorDoc(err instanceof Error ? err.message : String(err))
    } finally {
      setAbriendo(false)
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
      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] ${bg} ${fg}`}>
          <i className={`ti ${icon} text-[18px]`} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false) }}
              disabled={saving}
              className="w-full rounded-[6px] border border-accent bg-bg px-2 py-1 text-[13px] text-ink outline-none"
            />
          ) : (
            <div className="truncate text-[13px] font-medium text-ink">{d.nombre}</div>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span>{new Date(d.created_at).toLocaleDateString('es-EC')}</span>
            {badge && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${badge.cls}`} title={d.error_lectura ?? undefined}>{badge.label}</span>}
            {(d.estado_lectura === 'pendiente' || d.estado_lectura === 'error') && (
              <button onClick={() => onLeerAhora(d.id)} disabled={leyendoId === d.id} className="text-[10px] text-accent underline-offset-2 hover:underline disabled:opacity-60">
                {leyendoId === d.id ? 'Leyendo…' : 'Leer ahora'}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {editing ? (
            <>
              <button onClick={confirmEdit} disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-accent text-accent transition hover:bg-accent-soft disabled:opacity-60">
                <i className="ti ti-check text-[14px]" />
              </button>
              <button onClick={() => setEditing(false)} disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft">
                <i className="ti ti-x text-[14px]" />
              </button>
            </>
          ) : (
            <>
              {puedeEditar && carpetas.length > 0 && (
                <CarpetaSelector carpetas={carpetas} value={d.carpeta_id} onChange={(id) => onMover(d.id, id)} />
              )}
              {puedeEditar ? (
                <button onClick={() => onToggleVisibilidad(d)} className={`rounded-full px-2 py-0.5 text-[10px] ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted'}`}>
                  {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                </button>
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted'}`}>
                  {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                </span>
              )}
              {d.drive_file_id && (
                <button disabled={abriendo} onClick={abrirDoc} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft disabled:opacity-50" title="Ver archivo">
                  <i className={`ti ${abriendo ? 'ti-loader-2 animate-spin' : 'ti-eye'} text-[14px]`} />
                </button>
              )}
              {puedeEditar && (
                <button onClick={() => { setEditing(true); setEditVal(d.nombre) }} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft">
                  <i className="ti ti-edit text-[14px]" />
                </button>
              )}
              {puedeEditar && (
                <button onClick={() => onDelete(d.id)} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger">
                  <i className="ti ti-trash text-[14px]" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CarpetaSection({
  carpeta, docs, subcarpetas, allCarpetas, puedeEditar, onToggleVisibilidad, onRename, onDelete, onLeerAhora, leyendoId, onMover, onRenameCarpeta, onDeleteCarpeta, depth,
}: {
  carpeta: Carpeta; docs: Documento[]; subcarpetas: Carpeta[]; allCarpetas: Carpeta[]
  puedeEditar: boolean; leyendoId: string | null; depth: number
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nombre: string) => Promise<void>
  onDelete: (id: string) => void
  onLeerAhora: (id: string) => Promise<void>
  onMover: (docId: string, carpetaId: string | null) => Promise<void>
  onRenameCarpeta: (id: string, nombre: string) => Promise<void>
  onDeleteCarpeta: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const [editingCarpeta, setEditingCarpeta] = useState(false)
  const [carpetaName, setCarpetaName] = useState(carpeta.nombre)
  const { children } = buildTree(allCarpetas)

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div className="mb-1.5 flex items-center gap-2">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 flex-1 min-w-0">
          <i className={`ti ${open ? 'ti-folder-open' : 'ti-folder'} text-[15px] text-muted`} />
          {editingCarpeta ? (
            <input
              autoFocus value={carpetaName}
              onChange={(e) => setCarpetaName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') { await onRenameCarpeta(carpeta.id, carpetaName); setEditingCarpeta(false) }
                if (e.key === 'Escape') { setCarpetaName(carpeta.nombre); setEditingCarpeta(false) }
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-[4px] border border-accent bg-bg px-1.5 py-0.5 text-[12px] text-ink outline-none"
            />
          ) : (
            <span className="text-[12px] font-medium text-ink truncate">{carpeta.nombre}</span>
          )}
          <span className="text-[10px] text-muted ml-1">{docs.length + subcarpetas.length > 0 ? `${docs.length}` : '0'}</span>
          <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'} text-[11px] text-muted ml-auto`} />
        </button>
        {puedeEditar && !editingCarpeta && (
          <div className="flex gap-1">
            <button onClick={() => setEditingCarpeta(true)} className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-soft" title="Renombrar">
              <i className="ti ti-edit text-[12px]" />
            </button>
            <button onClick={() => onDeleteCarpeta(carpeta.id)} className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:bg-danger-soft hover:text-danger" title="Eliminar carpeta">
              <i className="ti ti-trash text-[12px]" />
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-1.5 mb-3">
          {subcarpetas.map(sub => (
            <CarpetaSection
              key={sub.id} carpeta={sub}
              docs={[]} subcarpetas={children[sub.id] ?? []}
              allCarpetas={allCarpetas} puedeEditar={puedeEditar}
              onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
              onDelete={onDelete} onLeerAhora={onLeerAhora} leyendoId={leyendoId}
              onMover={onMover} onRenameCarpeta={onRenameCarpeta}
              onDeleteCarpeta={onDeleteCarpeta} depth={depth + 1}
            />
          ))}
          {docs.map(d => (
            <DocRow key={d.id} d={d} carpetas={allCarpetas} puedeEditar={puedeEditar}
              onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
              onDelete={onDelete} onLeerAhora={onLeerAhora} leyendoId={leyendoId} onMover={onMover}
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

  const { root, children } = buildTree(carpetasProp)

  async function handleLeerAhora(id: string) {
    setLeyendoId(id)
    try { await onLeerAhora(id) } finally { setLeyendoId(null) }
  }

  async function handleMover(docId: string, carpetaId: string | null) {
    await moverDocumento(docId, carpetaId)
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

  const docsPorCarpeta: Record<string, Documento[]> = {}
  const docsSinCarpeta: Documento[] = []
  for (const d of documentos) {
    if (d.carpeta_id) {
      if (!docsPorCarpeta[d.carpeta_id]) docsPorCarpeta[d.carpeta_id] = []
      docsPorCarpeta[d.carpeta_id].push(d)
    } else {
      docsSinCarpeta.push(d)
    }
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
          <i className="ti ti-folder-plus text-accent text-[16px]" />
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
            docs={docsPorCarpeta[carpeta.id] ?? []}
            subcarpetas={children[carpeta.id] ?? []}
            allCarpetas={carpetasProp} puedeEditar={puedeEditar}
            onToggleVisibilidad={onToggleVisibilidad} onRename={onRename}
            onDelete={onDelete} onLeerAhora={handleLeerAhora} leyendoId={leyendoId}
            onMover={handleMover} onRenameCarpeta={handleRenameCarpeta}
            onDeleteCarpeta={handleDeleteCarpeta} depth={0}
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
                  onMover={handleMover}
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
