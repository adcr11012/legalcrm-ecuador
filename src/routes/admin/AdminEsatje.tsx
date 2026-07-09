import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  listCasosParaExportarGlobal,
  importarResultadosSatjeGlobal,
  listMovimientosRecientesGlobal,
  type CasoParaExportar,
  type ResultadoImportacion,
  type ResumenImportacion,
} from '@/features/esatje/api'
import type { SatjeMovimiento } from '@/types/database'

export default function AdminEsatje() {
  const [casos, setCasos] = useState<CasoParaExportar[]>([])
  const [recientes, setRecientes] = useState<SatjeMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [importando, setImportando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, r] = await Promise.all([listCasosParaExportarGlobal(), listMovimientosRecientesGlobal()])
      setCasos(c)
      setRecientes(r)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const workspacesUnicos = new Set(casos.map((c) => c.workspace_id)).size

  function onDescargarTxt() {
    const contenido = casos.map((c) => c.numero_causa).join('\n')
    const blob = new Blob([contenido], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `causas-activas-todos-workspaces-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onSubirResultados(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResumen(null)
    setImportando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado.')
      const texto = await file.text()
      const datos: ResultadoImportacion[] = JSON.parse(texto)
      const res = await importarResultadosSatjeGlobal(datos, casos, user.id)
      setResumen(res)
      setRecientes(await listMovimientosRecientesGlobal())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el archivo. Verifica que sea el formato correcto (JSON).')
    } finally {
      setImportando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando eSATJE…</div>

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-1 text-[15px] font-semibold text-ink">eSATJE — servicio centralizado</div>
      <p className="mb-5 text-[12px] text-mute2">
        Consulta movimientos judiciales para todos los workspaces que activaron esta sincronización en su Configuración.
        Un solo captcha resuelto aquí cubre a todos los clientes — ellos nunca ven este proceso, solo las novedades
        que aparecen en el historial de sus casos. No se guardan documentos ni el expediente completo, solo un
        registro descriptivo de cada movimiento.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[10px] border border-border bg-surface p-4">
          <div className="mb-1 text-[13px] font-semibold text-ink">Paso 1 — Descargar números de causa</div>
          <p className="mb-3 text-[12px] text-muted">
            {casos.length} causa{casos.length === 1 ? '' : 's'} válida{casos.length === 1 ? '' : 's'} de {workspacesUnicos} workspace{workspacesUnicos === 1 ? '' : 's'} con sincronización activada.
          </p>
          <button
            onClick={onDescargarTxt}
            disabled={casos.length === 0}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            <i className="ti ti-download" /> Descargar .txt
          </button>
        </div>

        <div className="rounded-[10px] border border-border bg-surface p-4">
          <div className="mb-1 text-[13px] font-semibold text-ink">Paso 2 — Subir resultados</div>
          <p className="mb-3 text-[12px] text-muted">
            Carga el archivo de resultados (.json) que generó el programa local después de consultar SATJE.
            Se reparte automáticamente a cada workspace según su número de causa.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={onSubirResultados}
            disabled={importando}
            className="text-[12px] text-muted"
          />
          {importando && <p className="mt-2 text-[12px] text-muted">Procesando…</p>}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
      )}

      {resumen && (
        <div className="mt-3 rounded-[10px] border border-success/20 bg-success-soft p-3.5 text-[13px] text-success">
          <div className="font-semibold">Importación completada</div>
          <ul className="mt-1 list-disc pl-4 text-[12px]">
            <li>{resumen.movimientosNuevos} movimiento(s) guardado(s), repartidos a sus workspaces correspondientes</li>
            <li>{resumen.casosConNovedad} caso(s) con novedad real detectada (aviso enviado en la campanita del workspace correspondiente)</li>
            {resumen.causasNoEncontradas.length > 0 && (
              <li className="text-warn">
                {resumen.causasNoEncontradas.length} número(s) de causa no coinciden con ningún caso activo: {resumen.causasNoEncontradas.join(', ')}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Movimientos recientes importados (todos los workspaces)</div>
      {recientes.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-[12px] text-mute2">
          Aún no se ha importado ningún movimiento.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {recientes.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-surface px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-ink">{m.tipo}</div>
                <div className="truncate text-[11px] text-mute2">{m.numero_causa} · {m.descripcion}</div>
              </div>
              <div className="flex-shrink-0 text-[11px] text-mute2">{new Date(m.fecha_movimiento).toLocaleDateString('es-EC')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
