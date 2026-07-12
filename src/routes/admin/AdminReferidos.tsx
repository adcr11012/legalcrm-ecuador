import { useEffect, useState } from 'react'
import { crearCodigosReferidoRaiz, listarCodigosRaiz } from '@/features/admin/adminApi'

type CodigoRaiz = Awaited<ReturnType<typeof listarCodigosRaiz>>[number]

export default function AdminReferidos() {
  const [codigos, setCodigos] = useState<CodigoRaiz[]>([])
  const [loading, setLoading] = useState(true)
  const [cantidad, setCantidad] = useState(1)
  const [semillas, setSemillas] = useState(6)
  const [creando, setCreando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  const load = () => listarCodigosRaiz().then(setCodigos).finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  async function onCrear() {
    setCreando(true)
    try {
      await crearCodigosReferidoRaiz(cantidad, semillas)
      await load()
    } finally {
      setCreando(false)
    }
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 1500)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-ink">Códigos de referido</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Códigos raíz (sin workspace padre) para repartir directamente. Quien se registre con uno obtiene plan Enterprise
          de inmediato y hereda (semillas - 1) códigos propios para seguir la cadena.
        </p>
      </div>

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
    </div>
  )
}
