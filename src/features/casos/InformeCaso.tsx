import { useEffect, useRef } from 'react'
import type { Caso, Documento, Plazo, Tarea } from '@/types/database'

type Persona = { nombre: string; rol: string }
type Historial = { accion: string; detalle: string | null; created_at: string }

type Props = {
  caso: Caso
  personas: Persona[]
  plazos: Plazo[]
  tareas: Tarea[]
  documentos: Documento[]
  historial: Historial[]
  onClose: () => void
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTs(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InformeCaso({ caso, personas, plazos, tareas, documentos, historial, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function imprimir() {
    window.print()
  }

  const hoy = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
  const plazosOrdenados = [...plazos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const tareasActivas = tareas.filter(t => t.estado !== 'completada').sort((a, b) =>
    (a.fecha_limite ?? '').localeCompare(b.fecha_limite ?? ''))
  const historialReciente = [...historial].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15)

  return (
    <>
      {/* Overlay de pantalla — se oculta al imprimir */}
      <div className="print:hidden fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
        <div className="w-full max-w-[720px] rounded-[12px] bg-surface shadow-xl">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-[13px] font-semibold text-ink">Informe de estado del caso</span>
            <div className="flex gap-2">
              <button
                onClick={imprimir}
                className="flex items-center gap-1.5 rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover"
              >
                <i className="ti ti-printer text-[14px]" /> Imprimir / Guardar PDF
              </button>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:bg-soft">
                <i className="ti ti-x text-[16px]" />
              </button>
            </div>
          </div>

          {/* Contenido del informe */}
          <div ref={printRef} className="p-6 print:p-0">
            <InformeContenido caso={caso} personas={personas} plazosOrdenados={plazosOrdenados}
              tareasActivas={tareasActivas} documentos={documentos} historialReciente={historialReciente} hoy={hoy} fmtTs={fmtTs} fmt={fmt} />
          </div>
        </div>
      </div>

      {/* Versión para imprimir — visible solo al imprimir */}
      <div className="hidden print:block print:p-8">
        <InformeContenido caso={caso} personas={personas} plazosOrdenados={plazosOrdenados}
          tareasActivas={tareasActivas} documentos={documentos} historialReciente={historialReciente} hoy={hoy} fmtTs={fmtTs} fmt={fmt} />
      </div>

      <style>{`
        @media print {
          body > *:not(.print\\:block) { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}

function InformeContenido({ caso, personas, plazosOrdenados, tareasActivas, documentos, historialReciente, hoy, fmtTs, fmt }: {
  caso: Caso; personas: Persona[]; plazosOrdenados: Plazo[]
  tareasActivas: Tarea[]; documentos: Documento[]; historialReciente: Historial[]
  hoy: string; fmtTs: (d: string) => string; fmt: (d: string) => string
}) {
  const seccion = 'mt-5 border-t border-border pt-4'
  const label = 'text-[10px] font-semibold uppercase tracking-wide text-mute2 mb-2'

  return (
    <div className="font-sans text-[13px] text-ink">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-mute2">TSADOQ — Informe de caso</div>
          <h1 className="mt-0.5 text-[18px] font-bold leading-tight text-ink">{caso.titulo}</h1>
          <div className="mt-1 text-[11px] text-muted">
            {caso.materia ? <span className="capitalize">{caso.materia}</span> : null}
            {caso.instancia_actual ? <span> · {caso.instancia_actual.replace(/_/g, ' ')}</span> : null}
          </div>
        </div>
        <div className="text-right text-[10px] text-mute2">
          <div>Generado el {hoy}</div>
          {caso.numero_causa && <div className="mt-0.5">N° causa: {caso.numero_causa}</div>}
          {caso.juzgado && <div className="mt-0.5">Juzgado: {caso.juzgado}</div>}
        </div>
      </div>

      {/* Datos del caso */}
      <div className={seccion}>
        <div className={label}>Datos del caso</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
          {caso.contraparte_nombre && <div><span className="text-muted">Contraparte:</span> {caso.contraparte_nombre}</div>}
          {caso.tipo_accion && <div><span className="text-muted">Tipo de acción:</span> {caso.tipo_accion}</div>}
          {caso.honorarios_tipo && <div><span className="text-muted">Honorarios:</span> {caso.honorarios_tipo.replace(/_/g, ' ')}
            {caso.honorarios_monto ? ` · $${Number(caso.honorarios_monto).toFixed(2)}` : ''}</div>}
          {caso.es_contencioso !== undefined && <div><span className="text-muted">Contencioso:</span> {caso.es_contencioso ? 'Sí' : 'No'}</div>}
        </div>
      </div>

      {/* Partes */}
      {personas.length > 0 && (
        <div className={seccion}>
          <div className={label}>Partes y equipo</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            {personas.map((p, i) => (
              <div key={i}><span className="text-muted capitalize">{p.rol}:</span> {p.nombre}</div>
            ))}
          </div>
        </div>
      )}

      {/* Plazos */}
      {plazosOrdenados.length > 0 && (
        <div className={seccion}>
          <div className={label}>Plazos ({plazosOrdenados.length})</div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-mute2">
                <th className="pb-1 font-medium">Descripción</th>
                <th className="pb-1 font-medium">Tipo</th>
                <th className="pb-1 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {plazosOrdenados.map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-1">{p.titulo}</td>
                  <td className="py-1 capitalize text-muted">{p.tipo}</td>
                  <td className="py-1 text-muted">{fmt(p.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tareas activas */}
      {tareasActivas.length > 0 && (
        <div className={seccion}>
          <div className={label}>Tareas pendientes ({tareasActivas.length})</div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-mute2">
                <th className="pb-1 font-medium">Tarea</th>
                <th className="pb-1 font-medium">Estado</th>
                <th className="pb-1 font-medium">Límite</th>
              </tr>
            </thead>
            <tbody>
              {tareasActivas.map(t => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-1">{t.titulo}</td>
                  <td className="py-1 capitalize text-muted">{t.estado.replace(/_/g, ' ')}</td>
                  <td className="py-1 text-muted">{t.fecha_limite ? fmt(t.fecha_limite) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Documentos */}
      {documentos.length > 0 && (
        <div className={seccion}>
          <div className={label}>Documentos ({documentos.length})</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
            {documentos.map(d => (
              <div key={d.id} className="flex items-center gap-1.5 py-0.5">
                <span className="truncate text-ink">{d.nombre}</span>
                <span className="flex-shrink-0 text-mute2">{fmtTs(d.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {historialReciente.length > 0 && (
        <div className={seccion}>
          <div className={label}>Historial reciente</div>
          <div className="space-y-1 text-[11px]">
            {historialReciente.map((h, i) => (
              <div key={i} className="flex gap-2">
                <span className="flex-shrink-0 text-mute2">{fmtTs(h.created_at)}</span>
                <span className="text-muted">{h.accion}</span>
                {h.detalle && <span className="truncate text-ink">{h.detalle}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-[9px] text-mute2">TSADOQ · Gestión de casos legales · {hoy}</div>
    </div>
  )
}
