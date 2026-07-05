import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Registro = {
  id: string
  accion: string
  nombre_doc: string | null
  created_at: string
  usuario_id: string | null
  users: { nombre: string } | null
  casos: { titulo: string } | null
}

const ACCION_LABEL: Record<string, { label: string; icon: string; cls: string }> = {
  apertura:   { label: 'Apertura',   icon: 'ti-eye',          cls: 'text-accent bg-accent-soft' },
  lectura_ia: { label: 'Lectura IA', icon: 'ti-brain',        cls: 'text-purple-600 bg-purple-50' },
  subida:     { label: 'Subida',     icon: 'ti-upload',       cls: 'text-success bg-success-soft' },
  eliminacion:{ label: 'Eliminación',icon: 'ti-trash',        cls: 'text-danger bg-danger-soft' },
  renombrado: { label: 'Renombrado', icon: 'ti-pencil',       cls: 'text-muted bg-soft' },
  descarga:   { label: 'Descarga',   icon: 'ti-download',     cls: 'text-ink bg-soft' },
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AuditoriaDocumentos({ workspaceId }: { workspaceId: string }) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAccion, setFiltroAccion] = useState('')
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 25

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const desde = new Date()
      desde.setDate(desde.getDate() - 20)

      let q = supabase
        .from('auditoria_documentos')
        .select('id, accion, nombre_doc, created_at, usuario_id, users(nombre), casos(titulo)')
        .eq('workspace_id', workspaceId)
        .gte('created_at', desde.toISOString())
        .order('created_at', { ascending: false })
        .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

      if (filtroAccion) q = q.eq('accion', filtroAccion)

      const { data } = await q
      setRegistros((data as unknown as Registro[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [workspaceId, filtroAccion, pagina])

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div>
          <span className="text-[12px] font-semibold text-ink">Auditoría de documentos</span>
          <span className="ml-2 text-[10px] text-mute2">Últimos 20 días</span>
        </div>
        <select
          value={filtroAccion}
          onChange={(e) => { setFiltroAccion(e.target.value); setPagina(0) }}
          className="rounded-[6px] border border-border bg-bg px-2 py-1 text-[11px] text-ink outline-none focus:border-accent"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACCION_LABEL).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="px-3 py-4 text-[12px] text-muted">Cargando…</div>
      ) : registros.length === 0 ? (
        <div className="px-3 py-4 text-[12px] text-mute2">Sin registros en los últimos 20 días.</div>
      ) : (
        <div className="divide-y divide-border">
          {registros.map((r) => {
            const a = ACCION_LABEL[r.accion] ?? { label: r.accion, icon: 'ti-activity', cls: 'text-muted bg-soft' }
            return (
              <div key={r.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-2.5">
                <span className={`w-fit flex-shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium ${a.cls}`}>
                  <i className={`ti ${a.icon} mr-1`} />{a.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-ink">
                    {r.nombre_doc ?? '—'}
                  </div>
                  <div className="text-[10px] text-mute2">
                    {r.users?.nombre ?? 'Usuario desconocido'}
                    {r.casos?.titulo ? ` · ${r.casos.titulo}` : ''}
                  </div>
                </div>
                <div className="flex-shrink-0 text-[10px] text-mute2">{fmt(r.created_at)}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <button
          onClick={() => setPagina(p => Math.max(0, p - 1))}
          disabled={pagina === 0}
          className="text-[11px] text-accent disabled:opacity-40 hover:underline"
        >
          ← Anterior
        </button>
        <span className="text-[11px] text-mute2">Página {pagina + 1}</span>
        <button
          onClick={() => setPagina(p => p + 1)}
          disabled={registros.length < POR_PAGINA}
          className="text-[11px] text-accent disabled:opacity-40 hover:underline"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
