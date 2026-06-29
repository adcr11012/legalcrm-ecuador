import { useState } from 'react'
import type { Documento } from '@/types/database'

function iconFor(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: 'ti-file-type-pdf', bg: 'bg-danger-soft', fg: 'text-danger' }
  if (ext === 'doc' || ext === 'docx') return { icon: 'ti-file-type-doc', bg: 'bg-accent-soft', fg: 'text-accent' }
  if (ext === 'xls' || ext === 'xlsx') return { icon: 'ti-file-spreadsheet', bg: 'bg-success-soft', fg: 'text-success' }
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return { icon: 'ti-photo', bg: 'bg-soft', fg: 'text-muted' }
  return { icon: 'ti-file', bg: 'bg-soft', fg: 'text-muted' }
}

export function DocumentosTab({
  documentos,
  puedeEditar,
  puedeSubir,
  onOpenAdd,
  onToggleVisibilidad,
  onRename,
  onDelete,
}: {
  documentos: Documento[]
  puedeEditar: boolean
  puedeSubir: boolean
  onOpenAdd: () => void
  onToggleVisibilidad: (doc: Documento) => void
  onRename: (id: string, nuevoNombre: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(d: Documento) {
    setEditingId(d.id)
    setEditingValue(d.nombre)
  }

  async function confirmEdit() {
    if (!editingId || !editingValue.trim()) return
    setSaving(true)
    try {
      await onRename(editingId, editingValue.trim())
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">{documentos.length} documento{documentos.length === 1 ? '' : 's'}</span>
        {puedeSubir && (
          <button
            onClick={onOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-2.5 py-1.5 text-[11px] text-white transition hover:bg-accent-hover"
          >
            <i className="ti ti-upload" /> Subir
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {documentos.map((d) => {
          const { icon, bg, fg } = iconFor(d.nombre)
          const editing = editingId === d.id
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] ${bg} ${fg}`}>
                <i className={`ti ${icon} text-[18px]`} />
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    disabled={saving}
                    className="w-full rounded-[6px] border border-accent bg-bg px-2 py-1 text-[13px] text-ink outline-none"
                  />
                ) : (
                  <div className="truncate text-[13px] font-medium text-ink">{d.nombre}</div>
                )}
                <div className="mt-0.5 text-[11px] text-muted">{new Date(d.created_at).toLocaleDateString('es-EC')}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={confirmEdit}
                      disabled={saving}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-accent text-accent transition hover:bg-accent-soft disabled:opacity-60"
                    >
                      <i className="ti ti-check text-[14px]" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={saving}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft"
                    >
                      <i className="ti ti-x text-[14px]" />
                    </button>
                  </>
                ) : (
                  <>
                    {puedeEditar ? (
                      <button
                        onClick={() => onToggleVisibilidad(d)}
                        className={`rounded-full px-2 py-0.5 text-[10px] ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted'}`}
                      >
                        {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                      </button>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${d.visibilidad === 'compartido' ? 'bg-success-soft text-success' : 'border border-border bg-soft text-muted'}`}>
                        {d.visibilidad === 'compartido' ? 'Compartido' : 'Privado'}
                      </span>
                    )}
                    {d.drive_url && (
                      <a
                        href={d.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft"
                      >
                        <i className="ti ti-eye text-[14px]" />
                      </a>
                    )}
                    {puedeEditar && (
                      <button
                        onClick={() => startEdit(d)}
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-soft"
                      >
                        <i className="ti ti-edit text-[14px]" />
                      </button>
                    )}
                    {puedeEditar && (
                      <button
                        onClick={() => onDelete(d.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger"
                      >
                        <i className="ti ti-trash text-[14px]" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {documentos.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
            Sin documentos cargados.
          </div>
        )}
      </div>
    </div>
  )
}
