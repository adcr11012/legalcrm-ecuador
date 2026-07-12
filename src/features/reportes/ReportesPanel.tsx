import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDatosReporte, type FilaReporte } from '@/features/reportes/api'
import { listEtapas } from '@/features/casos/etapasApi'
import { MATERIA_LABEL } from '@/features/casos/materias'
import type { Etapa } from '@/types/database'

type Estado = '' | 'abierto' | 'cerrado'

function csvEscape(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function descargarCsv(filas: FilaReporte[], etapasById: Map<string, Etapa>) {
  const encabezados = [
    'Caso', 'Materia', 'Etapa', 'Estado', 'Usuario(s)', 'Fecha inicio', 'Fecha cierre',
    'Días para cierre', 'Horas facturadas', 'Monto horas ($)', 'Anticipos ($)', 'Gastos cobrables ($)', 'Gastos no cobrables ($)',
  ]
  const filasCsv = filas.map((f) => [
    f.caso.titulo,
    f.caso.materia ? MATERIA_LABEL[f.caso.materia] : '',
    f.caso.etapa_id ? etapasById.get(f.caso.etapa_id)?.nombre ?? '' : '',
    f.caso.fecha_finalizado ? 'Cerrado' : 'Abierto',
    f.abogados.join('; '),
    f.caso.created_at.slice(0, 10),
    f.caso.fecha_finalizado ?? '',
    f.diasParaCierre ?? '',
    f.horasFacturadas,
    f.montoHoras,
    f.anticipos,
    f.gastosCobrables,
    f.gastosNoCobrables,
  ])
  const contenido = [encabezados, ...filasCsv].map((fila) => fila.map(csvEscape).join(',')).join('\n')
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-casos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportesPanel({ soloMisCasos = false }: { soloMisCasos?: boolean }) {
  const navigate = useNavigate()
  const [filas, setFilas] = useState<FilaReporte[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [materia, setMateria] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [abogado, setAbogado] = useState('')
  const [estado, setEstado] = useState<Estado>('')

  useEffect(() => {
    Promise.all([listDatosReporte(), listEtapas()])
      .then(([f, e]) => { setFilas(f); setEtapas(e) })
      .finally(() => setLoading(false))
  }, [])

  const etapasById = useMemo(() => new Map(etapas.map((e) => [e.id, e])), [etapas])
  const abogadosDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const f of filas) for (const a of f.abogados) set.add(a)
    return [...set].sort()
  }, [filas])

  const filtradas = useMemo(() => {
    return filas.filter((f) => {
      if (desde && f.caso.created_at.slice(0, 10) < desde) return false
      if (hasta && f.caso.created_at.slice(0, 10) > hasta) return false
      if (materia && f.caso.materia !== materia) return false
      if (etapaId && f.caso.etapa_id !== etapaId) return false
      if (abogado && !f.abogados.includes(abogado)) return false
      if (estado === 'abierto' && f.caso.fecha_finalizado) return false
      if (estado === 'cerrado' && !f.caso.fecha_finalizado) return false
      return true
    })
  }, [filas, desde, hasta, materia, etapaId, abogado, estado])

  const totales = useMemo(() => {
    const cerrados = filtradas.filter((f) => f.diasParaCierre != null)
    const promedioDias = cerrados.length > 0 ? Math.round(cerrados.reduce((s, f) => s + (f.diasParaCierre ?? 0), 0) / cerrados.length) : null
    return {
      casos: filtradas.length,
      horas: filtradas.reduce((s, f) => s + f.horasFacturadas, 0),
      montoHoras: filtradas.reduce((s, f) => s + f.montoHoras, 0),
      anticipos: filtradas.reduce((s, f) => s + f.anticipos, 0),
      gastosCobrables: filtradas.reduce((s, f) => s + f.gastosCobrables, 0),
      promedioDias,
    }
  }, [filtradas])

  function limpiarFiltros() {
    setDesde(''); setHasta(''); setMateria(''); setEtapaId(''); setAbogado(''); setEstado('')
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      {soloMisCasos && (
        <div className="mb-3 rounded-[8px] border border-accent/30 bg-accent-soft px-3 py-2 text-[11px] text-ink">
          Este reporte incluye únicamente tus casos asignados.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-[10px] border border-border bg-surface p-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Materia</label>
          <select value={materia} onChange={(e) => setMateria(e.target.value)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none">
            <option value="">Todas</option>
            {Object.entries(MATERIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Etapa</label>
          <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none">
            <option value="">Todas</option>
            {etapas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Usuario</label>
          <select value={abogado} onChange={(e) => setAbogado(e.target.value)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none">
            <option value="">Todos</option>
            {abogadosDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-mute2">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)}
            className="rounded-[6px] border border-border bg-bg px-2 py-1.5 text-[12px] text-ink outline-none">
            <option value="">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </div>
        <button onClick={limpiarFiltros} className="rounded-[6px] border border-border px-2.5 py-1.5 text-[12px] text-muted transition hover:bg-soft">
          Limpiar
        </button>
        <div className="flex-1" />
        <button
          onClick={() => descargarCsv(filtradas, etapasById)}
          disabled={filtradas.length === 0}
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          <i className="ti ti-file-spreadsheet" /> Exportar a Excel (CSV)
        </button>
      </div>

      {loading ? (
        <div className="text-center text-[13px] text-muted">Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-[13px] text-mute2">Sin resultados para estos filtros.</div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-[8px] border border-border bg-surface p-2.5 text-center">
              <div className="text-[16px] font-bold text-ink">{totales.casos}</div>
              <div className="text-[10px] text-mute2">Casos</div>
            </div>
            <div className="rounded-[8px] border border-border bg-surface p-2.5 text-center">
              <div className="text-[16px] font-bold text-ink">{totales.promedioDias ?? '—'}</div>
              <div className="text-[10px] text-mute2">Días prom. cierre</div>
            </div>
            <div className="rounded-[8px] border border-border bg-surface p-2.5 text-center">
              <div className="text-[16px] font-bold text-ink">{totales.horas.toFixed(1)}</div>
              <div className="text-[10px] text-mute2">Horas facturadas</div>
            </div>
            <div className="rounded-[8px] border border-border bg-surface p-2.5 text-center">
              <div className="text-[16px] font-bold text-ink">${totales.montoHoras.toFixed(0)}</div>
              <div className="text-[10px] text-mute2">Monto horas</div>
            </div>
            <div className="rounded-[8px] border border-border bg-surface p-2.5 text-center">
              <div className="text-[16px] font-bold text-ink">${totales.anticipos.toFixed(0)}</div>
              <div className="text-[10px] text-mute2">Anticipos</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-mute2">
                  <th className="px-3 py-2 font-medium">Caso</th>
                  <th className="px-3 py-2 font-medium">Materia</th>
                  <th className="px-3 py-2 font-medium">Etapa</th>
                  <th className="px-3 py-2 font-medium">Usuario(s)</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Días cierre</th>
                  <th className="px-3 py-2 text-right font-medium">Horas</th>
                  <th className="px-3 py-2 text-right font-medium">Anticipos</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f) => (
                  <tr key={f.caso.id} onClick={() => navigate(`/casos/${f.caso.id}`)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-soft">
                    <td className="px-3 py-2 font-medium text-ink">{f.caso.titulo}</td>
                    <td className="px-3 py-2 text-muted">{f.caso.materia ? MATERIA_LABEL[f.caso.materia] : '—'}</td>
                    <td className="px-3 py-2 text-muted">{f.caso.etapa_id ? etapasById.get(f.caso.etapa_id)?.nombre ?? '—' : '—'}</td>
                    <td className="px-3 py-2 text-muted">{f.abogados.join(', ') || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${f.caso.fecha_finalizado ? 'bg-soft text-mute2' : 'bg-success-soft text-success'}`}>
                        {f.caso.fecha_finalizado ? 'Cerrado' : 'Abierto'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{f.diasParaCierre ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-muted">{f.horasFacturadas || '—'}</td>
                    <td className="px-3 py-2 text-right text-muted">{f.anticipos > 0 ? `$${f.anticipos.toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
