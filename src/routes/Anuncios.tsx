import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { listTodosAnuncios, listLecturasIds, crearAnuncio, eliminarAnuncio, marcarAnuncioLeido } from '@/features/anuncios/api'
import { listWorkspaceUsers } from '@/features/users/api'
import { listGrupos, type GrupoConMiembros } from '@/features/users/gruposApi'
import { Modal } from '@/components/Modal'
import type { Anuncio, DestinatarioTipo, Usuario } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

function AnuncioFormModal({
  open, onClose, workspaceId, autorId, users, grupos, onCreated,
}: {
  open: boolean
  onClose: () => void
  workspaceId: string
  autorId: string
  users: Usuario[]
  grupos: GrupoConMiembros[]
  onCreated: (a: Anuncio) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [destinatarioTipo, setDestinatarioTipo] = useState<DestinatarioTipo>('todos')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitulo(''); setContenido(''); setDestinatarioTipo('todos'); setSeleccionados(new Set()); setError(null)
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit() {
    if (!titulo.trim() || !contenido.trim()) return
    if (destinatarioTipo !== 'todos' && seleccionados.size === 0) {
      setError('Selecciona al menos un destinatario.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const creado = await crearAnuncio({
        workspace_id: workspaceId,
        autor_id: autorId,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        destinatario_tipo: destinatarioTipo,
        destinatario_ids: destinatarioTipo === 'todos' ? [] : Array.from(seleccionados),
      })
      onCreated(creado)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el anuncio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nuevo anuncio">
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} placeholder="Ej. Informes mensuales" />
        </div>
        <div>
          <label className={labelClass}>Mensaje</label>
          <textarea rows={4} value={contenido} onChange={(e) => setContenido(e.target.value)} className={`${inputClass} resize-none`}
            placeholder="Ej. Todos los abogados deberán presentar sus informes hasta el 30 de este mes." />
        </div>
        <div>
          <label className={labelClass}>Dirigido a</label>
          <select value={destinatarioTipo} onChange={(e) => { setDestinatarioTipo(e.target.value as DestinatarioTipo); setSeleccionados(new Set()) }} className={inputClass}>
            <option value="todos">Todos los usuarios</option>
            <option value="grupo">Un grupo específico</option>
            <option value="usuarios">Usuarios específicos</option>
          </select>
        </div>

        {destinatarioTipo === 'grupo' && (
          <div className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-bg p-2.5">
            {grupos.length === 0 && <div className="text-[12px] text-mute2">No hay grupos creados.</div>}
            {grupos.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-[12px] text-ink">
                <input type="checkbox" checked={seleccionados.has(g.id)} onChange={() => toggle(g.id)} />
                {g.nombre} ({g.userIds.length} miembros)
              </label>
            ))}
          </div>
        )}

        {destinatarioTipo === 'usuarios' && (
          <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto rounded-[8px] border border-border bg-bg p-2.5">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-[12px] text-ink">
                <input type="checkbox" checked={seleccionados.has(u.id)} onChange={() => toggle(u.id)} />
                {u.nombre}
              </label>
            ))}
          </div>
        )}

        {error && <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <button onClick={() => { reset(); onClose() }} className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft">
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={loading} className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60">
            {loading ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Anuncios() {
  const { profile } = useAuth()
  const esAdmin = profile?.rol === 'administrador'
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [leidos, setLeidos] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<Usuario[]>([])
  const [grupos, setGrupos] = useState<GrupoConMiembros[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const [anunciosData, lecturasData] = await Promise.all([
        listTodosAnuncios(),
        listLecturasIds(profile.id),
      ])
      setAnuncios(anunciosData)
      setLeidos(new Set(lecturasData))
      if (esAdmin) {
        const [u, g] = await Promise.all([listWorkspaceUsers(), listGrupos()])
        setUsers(u)
        setGrupos(g)
      }
    } finally {
      setLoading(false)
    }
  }, [profile, esAdmin])

  useEffect(() => { load() }, [load])

  async function onMarcarLeido(id: string) {
    if (!profile) return
    await marcarAnuncioLeido(id, profile.id)
    setLeidos((prev) => new Set(prev).add(id))
  }

  async function onEliminar(id: string) {
    if (!confirm('¿Eliminar este anuncio?')) return
    await eliminarAnuncio(id)
    setAnuncios((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando anuncios…</div>

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[15px] font-semibold text-ink">Anuncios</div>
        {esAdmin && profile && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover"
          >
            <i className="ti ti-speakerphone" /> Nuevo anuncio
          </button>
        )}
      </div>

      {anuncios.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-muted">
          No hay anuncios.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {anuncios.map((a) => {
            const leido = leidos.has(a.id)
            return (
              <div key={a.id} className={`rounded-[10px] border p-3.5 ${leido ? 'border-border bg-surface' : 'border-accent/30 bg-accent-soft'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <i className="ti ti-speakerphone text-[13px] text-accent" />
                      <div className="text-[13px] font-semibold text-ink">{a.titulo}</div>
                      {!leido && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium text-white">Nuevo</span>}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{a.contenido}</div>
                    <div className="mt-1.5 text-[11px] text-mute2">{new Date(a.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    {!leido && (
                      <button onClick={() => onMarcarLeido(a.id)} className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft">
                        Marcar leído
                      </button>
                    )}
                    {esAdmin && (
                      <button onClick={() => onEliminar(a.id)} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger">
                        <i className="ti ti-trash text-[13px]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {esAdmin && profile && (
        <AnuncioFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          workspaceId={profile.workspace_id}
          autorId={profile.id}
          users={users}
          grupos={grupos}
          onCreated={(a) => setAnuncios((prev) => [a, ...prev])}
        />
      )}
    </div>
  )
}
