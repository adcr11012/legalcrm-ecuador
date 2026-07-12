import { useEffect, useState } from 'react'
import { crearCodigosReferidoRaiz, listarCodigosRaiz, listarArbolReferidos, type NodoArbolReferido } from '@/features/admin/adminApi'

type CodigoRaiz = Awaited<ReturnType<typeof listarCodigosRaiz>>[number]

export default function AdminReferidos() {
  const [tab, setTab] = useState<'raiz' | 'cadena'>('raiz')
  const [codigos, setCodigos] = useState<CodigoRaiz[]>([])
  const [arbol, setArbol] = useState<NodoArbolReferido[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingArbol, setLoadingArbol] = useState(true)
  const [cantidad, setCantidad] = useState(1)
  const [semillas, setSemillas] = useState(6)
  const [creando, setCreando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const load = () => listarCodigosRaiz().then(setCodigos).finally(() => setLoading(false))
  const loadArbol = () => listarArbolReferidos().then(setArbol).finally(() => setLoadingArbol(false))

  useEffect(() => {
    load()
    loadArbol()
  }, [])

  async function onCrear() {
    setCreando(true)
    try {
      await crearCodigosReferidoRaiz(cantidad, semillas)
      await Promise.all([load(), loadArbol()])
    } finally {
      setCreando(false)
    }
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 1500)
  }

  const q = busqueda.trim().toLowerCase()
  const arbolFiltrado = q
    ? arbol.filter((n) =>
        n.codigo.toLowerCase().includes(q) ||
        (n.generado_por_workspace ?? '').toLowerCase().includes(q) ||
        (n.generado_por_email ?? '').toLowerCase().includes(q) ||
        (n.usado_por_workspace ?? '').toLowerCase().includes(q) ||
        (n.usado_por_email ?? '').toLowerCase().includes(q),
      )
    : arbol

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-[18px] font-bold text-ink">Códigos de referido</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Sistema de semillas decrecientes tipo invite-only. Quien se registra con un código obtiene plan Enterprise de
          inmediato y hereda (semillas - 1) códigos propios para seguir la cadena.
        </p>
      </div>

      <div className="mb-5 flex gap-1 rounded-[8px] bg-soft p-1 w-fit">
        <button
          onClick={() => setTab('raiz')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition ${tab === 'raiz' ? 'bg-surface text-ink shadow-sm font-medium' : 'text-muted'}`}
        >
          Generar códigos raíz
        </button>
        <button
          onClick={() => setTab('cadena')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition ${tab === 'cadena' ? 'bg-surface text-ink shadow-sm font-medium' : 'text-muted'}`}
        >
          Cadena completa ({arbol.length})
        </button>
      </div>

      {tab === 'raiz' && (
      <>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[10px] border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">Cantidad</label>
          <input
            type="number"
            min={1}
            max={20}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-[90px] rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">Semillas (códigos que heredará el que lo use)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={semillas}
            onChange={(e) => setSemillas(Number(e.target.value))}
            className="w-[90px] rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={onCrear}
          disabled={creando}
          className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {creando ? 'Generando…' : 'Generar código(s)'}
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-muted">Cargando…</div>
      ) : codigos.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">
          Aún no has generado códigos raíz.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-soft">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Código</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Semillas</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Estado</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Expira</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {codigos.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => copiar(c.codigo)}
                      className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold tracking-wide text-ink hover:text-accent"
                    >
                      {c.codigo}
                      <i className={`ti ${copiado === c.codigo ? 'ti-check text-success' : 'ti-copy text-mute2'} text-[13px]`} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] text-ink">{c.semillas}</td>
                  <td className="px-4 py-2.5">
                    {c.usado ? (
                      <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-mute2">Usado</span>
                    ) : (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Disponible</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">
                    {c.expira_at ? new Date(c.expira_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">
                    {new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {tab === 'cadena' && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2 focus-within:border-accent">
            <i className="ti ti-search text-[15px] text-mute2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, workspace o email…"
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-mute2"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="text-mute2 hover:text-ink">
                <i className="ti ti-x text-[13px]" />
              </button>
            )}
          </div>

          {loadingArbol ? (
            <div className="py-8 text-center text-[13px] text-muted">Cargando…</div>
          ) : arbolFiltrado.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">Sin resultados.</div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-soft">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Código</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-mute2">Semillas</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Generado por</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Usado por</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Estado</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mute2">Usado el</th>
                  </tr>
                </thead>
                <tbody>
                  {arbolFiltrado.map((n) => (
                    <tr key={n.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold tracking-wide text-ink">{n.codigo}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-ink">{n.semillas}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {n.generado_por_workspace ? (
                          <>
                            <div className="text-ink">{n.generado_por_workspace}</div>
                            <div className="text-mute2">{n.generado_por_email}</div>
                          </>
                        ) : (
                          <span className="italic text-mute2">Raíz (superadmin)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {n.usado_por_workspace ? (
                          <>
                            <div className="text-ink">{n.usado_por_workspace}</div>
                            <div className="text-mute2">{n.usado_por_email}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {n.usado ? (
                          <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-mute2">Usado</span>
                        ) : (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Disponible</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {n.usado_at ? new Date(n.usado_at).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
