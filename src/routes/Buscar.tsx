import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { listCasos } from '@/features/casos/api'
import { listClientes } from '@/features/clientes/api'
import { listWorkspaceUsers } from '@/features/users/api'
import type { Caso, Cliente, Usuario } from '@/types/database'

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase()
}

export default function Buscar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [casos, setCasos] = useState<Caso[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (profile?.rol !== 'administrador') return
    Promise.all([listCasos(), listClientes(), listWorkspaceUsers()])
      .then(([c, cl, u]) => {
        setCasos(c)
        setClientes(cl)
        setUsuarios(u)
      })
      .finally(() => setLoading(false))
  }, [profile])

  const query = norm(q).trim()

  const casosFiltrados = useMemo(() => {
    if (!query) return []
    return casos.filter((c) => norm(c.titulo).includes(query) || norm(c.numero_causa).includes(query) || norm(c.juzgado).includes(query)).slice(0, 25)
  }, [casos, query])

  const clientesFiltrados = useMemo(() => {
    if (!query) return []
    return clientes.filter((c) => norm(c.nombre).includes(query) || norm(c.email).includes(query) || norm(c.telefono).includes(query)).slice(0, 25)
  }, [clientes, query])

  const usuariosFiltrados = useMemo(() => {
    if (!query) return []
    return usuarios.filter((u) => norm(u.nombre).includes(query) || norm(u.email).includes(query)).slice(0, 25)
  }, [usuarios, query])

  const sinResultados = query.length > 0 && casosFiltrados.length === 0 && clientesFiltrados.length === 0 && usuariosFiltrados.length === 0

  if (profile && profile.rol !== 'administrador') return <Navigate to="/dashboard" replace />

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[720px]">
        <div className="relative mb-5">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-mute2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar casos, clientes o usuarios…"
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
          </div>
        )}
      </div>
    </div>
  )
}
