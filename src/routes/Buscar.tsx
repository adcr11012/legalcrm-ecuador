import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { listCasos } from '@/features/casos/api'
import { listClientes } from '@/features/clientes/api'
import { listWorkspaceUsers } from '@/features/users/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { listDocumentosWorkspace, type DocumentoBusqueda } from '@/features/casos/documentosApi'
import { MATERIA_LABEL } from '@/features/casos/materias'
import type { Caso, Cliente, Usuario, Etapa } from '@/types/database'

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase()
}

// Búsqueda con varios términos separados por espacio, en modo Y: cada
// término debe aparecer en algún lugar del texto combinado del ítem — así
// "activo laboral" encuentra un caso en etapa "Activo" y materia "Laboral",
// aunque estén en campos distintos.
function coincideTerminos(haystack: string, terminos: string[]): boolean {
  return terminos.every((t) => haystack.includes(t))
}

export default function Buscar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [casos, setCasos] = useState<Caso[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [documentos, setDocumentos] = useState<DocumentoBusqueda[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // Master/administrador ven todo el workspace; limitado solo sus casos
  // asignados (ya filtrado así por RLS en casos/documentos). Clientes y
  // usuarios no están acotados por caso, así que se ocultan para limitado.
  const accesoCompleto = profile?.rol === 'administrador' || profile?.rol === 'master'

  useEffect(() => {
    if (!profile) return
    const peticiones: [Promise<Caso[]>, Promise<Cliente[]> | Promise<[]>, Promise<Usuario[]> | Promise<[]>, Promise<DocumentoBusqueda[]>, Promise<Etapa[]>] = [
      listCasos(),
      accesoCompleto ? listClientes() : Promise.resolve([]),
      accesoCompleto ? listWorkspaceUsers() : Promise.resolve([]),
      listDocumentosWorkspace(),
      listEtapas(),
    ]
    Promise.all(peticiones)
      .then(([c, cl, u, d, e]) => {
        setCasos(c)
        setClientes(cl)
        setUsuarios(u)
        setDocumentos(d)
        setEtapas(e)
      })
      .finally(() => setLoading(false))
  }, [profile, accesoCompleto])

  const query = norm(q).trim()
  const terminos = query.split(/\s+/).filter(Boolean)
  const etapasById = useMemo(() => new Map(etapas.map((e) => [e.id, e])), [etapas])

  const casosFiltrados = useMemo(() => {
    if (terminos.length === 0) return []
    return casos
      .filter((c) => {
        const etapaNombre = c.etapa_id ? etapasById.get(c.etapa_id)?.nombre : ''
        const haystack = [c.titulo, c.numero_causa, c.juzgado, c.materia ? MATERIA_LABEL[c.materia] : '', etapaNombre]
          .map(norm)
          .join(' ')
        return coincideTerminos(haystack, terminos)
      })
      .slice(0, 25)
  }, [casos, terminos, etapasById])

  const clientesFiltrados = useMemo(() => {
    if (terminos.length === 0) return []
    return clientes
      .filter((c) => coincideTerminos([c.nombre, c.email, c.telefono, c.tipo, c.estado].map(norm).join(' '), terminos))
      .slice(0, 25)
  }, [clientes, terminos])

  const usuariosFiltrados = useMemo(() => {
    if (terminos.length === 0) return []
    return usuarios
      .filter((u) => coincideTerminos([u.nombre, u.email, u.rol].map(norm).join(' '), terminos))
      .slice(0, 25)
  }, [usuarios, terminos])

  const documentosFiltrados = useMemo(() => {
    if (terminos.length === 0) return []
    return documentos
      .filter((d) => {
        const etapaNombre = d.caso_etapa_id ? etapasById.get(d.caso_etapa_id)?.nombre : ''
        const materiaLabel = d.caso_materia ? MATERIA_LABEL[d.caso_materia as keyof typeof MATERIA_LABEL] : ''
        const haystack = [d.nombre, d.caso_titulo, materiaLabel, etapaNombre].map(norm).join(' ')
        return coincideTerminos(haystack, terminos)
      })
      .slice(0, 25)
  }, [documentos, terminos, etapasById])

  const sinResultados =
    query.length > 0 &&
    casosFiltrados.length === 0 &&
    clientesFiltrados.length === 0 &&
    usuariosFiltrados.length === 0 &&
    documentosFiltrados.length === 0

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[720px]">
        <div className="relative mb-5">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-mute2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={accesoCompleto ? 'Buscar casos, clientes, usuarios o documentos…' : 'Buscar en tus casos asignados…'}
            className="w-full rounded-[10px] border border-border bg-surface py-2.5 pl-10 pr-3 text-[14px] text-ink outline-none focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="text-center text-[13px] text-muted">Cargando…</div>
        ) : !query ? (
          <div className="text-center text-[13px] text-mute2">Escribe para buscar en todo el workspace.</div>
        ) : sinResultados ? (
          <div className="text-center text-[13px] text-mute2">Sin resultados para "{q}".</div>
        ) : (
          <div className="flex flex-col gap-5">
            {casosFiltrados.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Casos</div>
                <div className="flex flex-col gap-1">
                  {casosFiltrados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/casos/${c.id}`)}
                      className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface p-2.5 text-left transition hover:bg-soft"
                    >
                      <i className="ti ti-briefcase text-[16px] text-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{c.titulo}</div>
                        <div className="truncate text-[11px] text-mute2">{c.numero_causa || c.juzgado || '—'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {clientesFiltrados.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Clientes</div>
                <div className="flex flex-col gap-1">
                  {clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface p-2.5 text-left transition hover:bg-soft"
                    >
                      <i className="ti ti-user text-[16px] text-success" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{c.nombre}</div>
                        <div className="truncate text-[11px] text-mute2">{c.email || c.telefono || '—'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {usuariosFiltrados.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Usuarios</div>
                <div className="flex flex-col gap-1">
                  {usuariosFiltrados.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigate('/usuarios')}
                      className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface p-2.5 text-left transition hover:bg-soft"
                    >
                      <i className="ti ti-user-shield text-[16px] text-warn" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{u.nombre}</div>
                        <div className="truncate text-[11px] text-mute2">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {documentosFiltrados.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Documentos</div>
                <div className="flex flex-col gap-1">
                  {documentosFiltrados.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/casos/${d.caso_id}`)}
                      className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface p-2.5 text-left transition hover:bg-soft"
                    >
                      <i className="ti ti-file-text text-[16px] text-danger" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{d.nombre}</div>
                        <div className="truncate text-[11px] text-mute2">Caso: {d.caso_titulo}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
