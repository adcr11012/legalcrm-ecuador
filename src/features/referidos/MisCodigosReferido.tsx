import { useEffect, useState } from 'react'
import { listMisCodigosReferido, listMisReferidosArbol, type NodoReferido } from '@/features/referidos/api'
import type { CodigoReferido } from '@/types/database'

export function MisCodigosReferido({ workspaceId }: { workspaceId: string }) {
  const [codigos, setCodigos] = useState<CodigoReferido[]>([])
  const [arbol, setArbol] = useState<NodoReferido[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    listMisCodigosReferido(workspaceId).then(setCodigos).catch(() => {}).finally(() => setLoading(false))
    listMisReferidosArbol().then(setArbol).catch(() => {})
  }, [workspaceId])

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 1500)
  }

  if (loading) return null
  if (codigos.length === 0 && arbol.length === 0) return null

  const disponibles = codigos.filter((c) => !c.usado)
  const usadosEnArbol = arbol.filter((n) => n.usado)

  return (
    <div className="mb-2.5 rounded-[10px] border border-border bg-surface p-3">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
        Mis códigos de referido
      </label>
      {disponibles.length === 0 ? (
        <div className="text-[12px] text-mute2">Ya usaste todos tus códigos disponibles.</div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {disponibles.map((c) => (
            <button
              key={c.id}
              onClick={() => copiar(c.codigo)}
              title="Copiar código"
              className="flex items-center justify-between gap-1.5 rounded-[6px] border border-border bg-bg px-2 py-1.5 font-mono text-[12px] font-semibold tracking-wide text-ink transition hover:border-accent"
            >
              {c.codigo}
              <i className={`ti ${copiado === c.codigo ? 'ti-check text-success' : 'ti-copy text-mute2'} text-[13px]`} />
            </button>
          ))}
        </div>
      )}

      {usadosEnArbol.length > 0 && (
        <>
          <div className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-mute2">
            Quién se registró con tus códigos ({usadosEnArbol.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {usadosEnArbol.map((n) => (
              <div
                key={n.id}
                className="rounded-[6px] border border-border bg-bg px-2.5 py-1.5"
                style={{ marginLeft: (n.nivel - 1) * 16 }}
              >
                <div className="flex items-center gap-1.5">
                  {n.nivel > 1 && <i className="ti ti-corner-down-right text-[11px] text-mute2" />}
                  <span className="text-[12px] font-medium text-ink">{n.usado_por_nombre ?? 'Sin nombre'}</span>
                  <span className="font-mono text-[10px] text-mute2">· {n.codigo}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-mute2">
                  {n.usado_por_email ?? 'Sin correo'}
                  {n.usado_at && ` · ${new Date(n.usado_at).toLocaleDateString('es-EC')}`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
