import { useState } from 'react'
import {
  createGrupo,
  deleteGrupo,
  renameGrupo,
  addUsuarioAGrupo,
  removeUsuarioDeGrupo,
  type GrupoConMiembros,
} from '@/features/users/gruposApi'
import type { Usuario } from '@/types/database'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export function GruposSection({
  workspaceId,
  grupos,
  setGrupos,
  usuarios,
}: {
  workspaceId: string
  grupos: GrupoConMiembros[]
  setGrupos: React.Dispatch<React.SetStateAction<GrupoConMiembros[]>>
  usuarios: Usuario[]
}) {
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [agregarUserEnGrupo, setAgregarUserEnGrupo] = useState<string | null>(null)

  async function onCrear() {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    try {
      const g = await createGrupo(workspaceId, nuevoNombre.trim())
      setGrupos((prev) => [...prev, { ...g, userIds: [] }].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoNombre('')
    } finally {
      setCreando(false)
    }
  }

  async function onRename(id: string) {
    if (!editNombre.trim()) return
    const updated = await renameGrupo(id, editNombre.trim())
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, nombre: updated.nombre } : g)))
    setEditandoId(null)
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este grupo? Los usuarios no se verán afectados.')) return
    await deleteGrupo(id)
    setGrupos((prev) => prev.filter((g) => g.id !== id))
  }

  async function onAddMember(grupoId: string, userId: string) {
    await addUsuarioAGrupo(grupoId, userId)
    setGrupos((prev) => prev.map((g) => (g.id === grupoId ? { ...g, userIds: [...g.userIds, userId] } : g)))
    setAgregarUserEnGrupo(null)
  }

  async function onRemoveMember(grupoId: string, userId: string) {
    await removeUsuarioDeGrupo(grupoId, userId)
    setGrupos((prev) => prev.map((g) => (g.id === grupoId ? { ...g, userIds: g.userIds.filter((id) => id !== userId) } : g)))
  }

  const usuariosById = new Map(usuarios.map((u) => [u.id, u]))

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-mute2">Grupos de usuarios (equipos)</div>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onCrear() }}
          placeholder="Ej. Equipo laboral"
          className="flex-1 rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
        <button
          onClick={onCrear}
          disabled={creando || !nuevoNombre.trim()}
          className="rounded-[8px] bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          Crear grupo
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-5 text-center text-[12px] text-mute2">
          Sin grupos creados. Crea uno para asignar equipos completos a casos.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {grupos.map((g) => (
            <div key={g.id} className="rounded-[10px] border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                {editandoId === g.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onRename(g.id); if (e.key === 'Escape') setEditandoId(null) }}
                      className="flex-1 rounded-[6px] border border-border bg-bg px-2 py-1 text-[13px] text-ink outline-none focus:border-accent"
                    />
                    <button onClick={() => onRename(g.id)} className="text-[11px] text-accent hover:underline">Guardar</button>
                  </div>
                ) : (
                  <div className="text-[13px] font-semibold text-ink">{g.nombre}</div>
                )}
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    onClick={() => { setEditandoId(g.id); setEditNombre(g.nombre) }}
                    className="flex h-6 w-6 items-center justify-center rounded-[5px] text-mute2 hover:bg-soft"
                    title="Renombrar"
                  >
                    <i className="ti ti-edit text-[12px]" />
                  </button>
                  <button
                    onClick={() => onDelete(g.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-[5px] text-mute2 hover:bg-danger-soft hover:text-danger"
                    title="Eliminar grupo"
                  >
                    <i className="ti ti-trash text-[12px]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {g.userIds.map((uid) => {
                  const u = usuariosById.get(uid)
                  if (!u) return null
                  return (
                    <span key={uid} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-1 text-[11px] text-accent">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-semibold text-white">
                        {initials(u.nombre)}
                      </span>
                      {u.nombre}
                      <button onClick={() => onRemoveMember(g.id, uid)} className="text-accent/70 hover:text-danger">
                        <i className="ti ti-x text-[10px]" />
                      </button>
                    </span>
                  )
                })}

                {agregarUserEnGrupo === g.id ? (
                  <select
                    autoFocus
                    onChange={(e) => e.target.value && onAddMember(g.id, e.target.value)}
                    onBlur={() => setAgregarUserEnGrupo(null)}
                    className="rounded-full border border-border bg-bg px-2 py-1 text-[11px] text-ink outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Selecciona…</option>
                    {usuarios.filter((u) => !g.userIds.includes(u.id)).map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setAgregarUserEnGrupo(g.id)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-[11px] text-muted transition hover:bg-soft"
                  >
                    <i className="ti ti-plus text-[10px]" /> Añadir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
