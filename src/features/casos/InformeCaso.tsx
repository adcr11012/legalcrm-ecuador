import { useEffect } from 'react'
import type { Caso, Documento, Etapa, Plazo, Tarea } from '@/types/database'
import { MATERIA_LABEL } from '@/features/casos/materias'

type Persona = { nombre: string; rol: string }

type Props = {
  caso: Caso
  etapas: Etapa[]
  personas: Persona[]
  plazos: Plazo[]
  tareas: Tarea[]
  documentos: Documento[]
  onClose: () => void
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTs(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

const INSTANCIA_LABEL: Record<string, string> = {
  primera_instancia: 'Primera instancia',
  segunda_instancia: 'Segunda instancia',
  casacion: 'Casación',
  ejecucion: 'Ejecución de sentencia',
  mediacion: 'Mediación / Arbitraje',
  administrativa: 'Vía administrativa',
}

const TIPO_PLAZO_LABEL: Record<string, string> = {
  audiencia: 'Audiencia',
  plazo: 'Plazo',
  otro: 'Otro',
}

const ESTADO_TAREA_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
}

export function InformeCaso({ caso, etapas, personas, plazos, tareas, documentos, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const hoy = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
  const todayStr = new Date().toISOString().slice(0, 10)
  const etapaActual = etapas.find(e => e.id === caso.etapa_id)

  const plazosOrdenados = [...plazos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const plazosPendientes = plazosOrdenados.filter(p => p.fecha >= todayStr)
  const plazosRealizados = plazosOrdenados.filter(p => p.fecha < todayStr).reverse()

  const tareasPendientes = tareas
    .filter(t => t.estado !== 'completada')
    .sort((a, b) => (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999'))
  const tareasCompletadas = tareas
    .filter(t => t.estado === 'completada')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const personasEquipo = personas.filter(p => p.rol === 'abogado' || p.rol === 'otro')
  const personasClientes = personas.filter(p => p.rol === 'cliente')

  const props = {
    caso, etapaActual, personasEquipo, personasClientes,
    plazosPendientes, plazosRealizados,
    tareasPendientes, tareasCompletadas,
    documentos,
    hoy, todayStr, fmtShort, fmt, fmtTs,
  }

  return (
    <>
      {/* Overlay — oculto al imprimir */}
      <div className="print:hidden fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
        <div className="w-full max-w-[760px] rounded-[12px] bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-[13px] font-semibold text-ink">Informe de estado del caso</span>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover"
              >
                <i className="ti ti-printer text-[14px]" /> Imprimir / Guardar PDF
              </button>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:bg-soft">
                <i className="ti ti-x text-[16px]" />
              </button>
            </div>
          </div>
          <div className="p-6"><InformeContenido {...props} /></div>
        </div>
      </div>

      {/* Versión para imprimir */}
      <div className="hidden print:block print:p-8"><InformeContenido {...props} /></div>

      <style>{`
        @media print {
          body > *:not(.print\\:block) { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <span className="text-muted">{label}:</span>{' '}
      <span className="text-ink">{value}</span>
    </div>
  )
}

function InformeContenido({
  caso, etapaActual, personasEquipo, personasClientes,
  plazosPendientes, plazosRealizados,
  tareasPendientes, tareasCompletadas,
  documentos,
  hoy, todayStr, fmtShort, fmtTs,
}: {
  caso: Caso
  etapaActual: Etapa | undefined
  personasEquipo: Persona[]
  personasClientes: Persona[]
  plazosPendientes: Plazo[]
  plazosRealizados: Plazo[]
  tareasPendientes: Tarea[]
  tareasCompletadas: Tarea[]
  documentos: Documento[]
  hoy: string
  todayStr: string
  fmtShort: (d: string) => string
  fmt: (d: string) => string
  fmtTs: (d: string) => string
}) {
  const tblHead = 'text-left text-[10px] font-semibold uppercase tracking-wide text-mute2 pb-1'
  const tblRow = 'border-t border-border/60'
  const tblCell = 'py-1.5 text-[11px] align-top'
  const seccion = 'mt-5 border-t border-border pt-4'
  const secLabel = 'mb-2 text-[10px] font-semibold uppercase tracking-widest text-mute2'

  return (
    <div className="font-sans text-[12px] text-ink">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-mute2">TSADOQ — Informe de caso</div>
          <h1 className="mt-0.5 text-[18px] font-bold leading-tight text-ink">{caso.titulo}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            {caso.materia && <span className="capitalize">{MATERIA_LABEL[caso.materia] ?? caso.materia}</span>}
            {caso.instancia_actual && (
              <span>· {INSTANCIA_LABEL[caso.instancia_actual] ?? caso.instancia_actual.replace(/_/g, ' ')}</span>
            )}
            {etapaActual && (
              <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-medium text-ink">
                Etapa: {etapaActual.nombre}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right text-[10px] text-mute2">
          <div>Generado el {hoy}</div>
          {caso.numero_causa && <div className="mt-0.5 font-medium text-ink">N° causa: {caso.numero_causa}</div>}
          {caso.juzgado && <div className="mt-0.5">Juzgado: {caso.juzgado}</div>}
          {caso.fecha_inicio && <div className="mt-0.5">Inicio: {fmtShort(caso.fecha_inicio)}</div>}
        </div>
      </div>

      {/* ── Datos del proceso ── */}
      <div className={seccion}>
        <div className={secLabel}>Datos del proceso</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <Campo label="Tipo de acción" value={caso.tipo_accion} />
          <Campo label="Contencioso" value={caso.es_contencioso ? 'Sí' : 'No'} />
          {caso.cuantia != null && (
            <Campo label="Cuantía" value={`$${Number(caso.cuantia).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`} />
          )}
          <Campo label="Demanda presentada" value={caso.demanda_presentada ? 'Sí' : 'No'} />
          {caso.fecha_citacion && <Campo label="Fecha de citación" value={fmtShort(caso.fecha_citacion)} />}
        </div>
      </div>

      {/* ── Partes ── */}
      {(personasEquipo.length > 0 || personasClientes.length > 0 || caso.contraparte_nombre) && (
        <div className={seccion}>
          <div className={secLabel}>Partes y equipo</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            {personasEquipo.map((p, i) => (
              <div key={i}><span className="text-muted">{p.rol === 'abogado' ? 'Usuario' : 'Parte'}:</span> {p.nombre}</div>
            ))}
            {personasClientes.map((p, i) => (
              <div key={i}><span className="text-muted">Cliente:</span> {p.nombre}</div>
            ))}
            {caso.contraparte_nombre && (
              <div><span className="text-muted">Contraparte:</span> {caso.contraparte_nombre}</div>
            )}
            {caso.contraparte_cedula && (
              <div><span className="text-muted">C.I. / RUC contraparte:</span> {caso.contraparte_cedula}</div>
            )}
            {caso.contraparte_abogado && (
              <div><span className="text-muted">Abogado contraparte:</span> {caso.contraparte_abogado}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Cronograma: pendientes ── */}
      <div className={seccion}>
        <div className={secLabel}>
          Cronograma — pendientes ({plazosPendientes.length})
        </div>
        {plazosPendientes.length === 0 ? (
          <div className="text-[11px] italic text-mute2">Sin plazos pendientes.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${tblHead} w-[110px]`}>Fecha</th>
                <th className={tblHead}>Descripción</th>
                <th className={`${tblHead} w-[76px]`}>Tipo</th>
                <th className={`${tblHead} w-[52px] text-right`}>Días</th>
              </tr>
            </thead>
            <tbody>
              {plazosPendientes.map(p => {
                const dias = Math.round(
                  (new Date(p.fecha + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
                )
                return (
                  <tr key={p.id} className={tblRow}>
                    <td className={`${tblCell} font-medium`}>{fmtShort(p.fecha)}</td>
                    <td className={tblCell}>
                      {p.titulo}
                      {p.descripcion && <div className="text-[10px] text-mute2">{p.descripcion}</div>}
                    </td>
                    <td className={`${tblCell} capitalize text-muted`}>{TIPO_PLAZO_LABEL[p.tipo] ?? p.tipo}</td>
                    <td className={`${tblCell} text-right font-semibold ${dias === 0 ? 'text-danger' : dias <= 3 ? 'text-danger' : dias <= 7 ? 'text-warn' : 'text-muted'}`}>
                      {dias === 0 ? 'Hoy' : `${dias}d`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Cronograma: realizados ── */}
      {plazosRealizados.length > 0 && (
        <div className={seccion}>
          <div className={secLabel}>Cronograma — realizados ({plazosRealizados.length})</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${tblHead} w-[110px]`}>Fecha</th>
                <th className={tblHead}>Descripción</th>
                <th className={`${tblHead} w-[76px]`}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {plazosRealizados.map(p => (
                <tr key={p.id} className={tblRow}>
                  <td className={`${tblCell} text-mute2`}>{fmtShort(p.fecha)}</td>
                  <td className={`${tblCell} text-muted line-through`}>{p.titulo}</td>
                  <td className={`${tblCell} capitalize text-mute2`}>{TIPO_PLAZO_LABEL[p.tipo] ?? p.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tareas pendientes ── */}
      <div className={seccion}>
        <div className={secLabel}>Tareas pendientes ({tareasPendientes.length})</div>
        {tareasPendientes.length === 0 ? (
          <div className="text-[11px] italic text-mute2">Sin tareas pendientes.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={tblHead}>Tarea</th>
                <th className={`${tblHead} w-[90px]`}>Estado</th>
                <th className={`${tblHead} w-[110px]`}>Límite</th>
              </tr>
            </thead>
            <tbody>
              {tareasPendientes.map(t => {
                const vencida = t.fecha_limite && t.fecha_limite < todayStr
                return (
                  <tr key={t.id} className={tblRow}>
                    <td className={tblCell}>
                      {t.titulo}
                      {t.descripcion && <div className="text-[10px] text-mute2">{t.descripcion}</div>}
                    </td>
                    <td className={`${tblCell} capitalize text-muted`}>{ESTADO_TAREA_LABEL[t.estado] ?? t.estado}</td>
                    <td className={`${tblCell} ${vencida ? 'font-semibold text-danger' : 'text-muted'}`}>
                      {t.fecha_limite ? fmtShort(t.fecha_limite) : '—'}
                      {vencida && <div className="text-[9px]">VENCIDA</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Tareas completadas ── */}
      {tareasCompletadas.length > 0 && (
        <div className={seccion}>
          <div className={secLabel}>Tareas completadas ({tareasCompletadas.length})</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {tareasCompletadas.map(t => (
              <div key={t.id} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                <i className="ti ti-circle-check mt-0.5 flex-shrink-0 text-[12px] text-success" />
                <span className="text-muted">{t.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Documentos ── */}
      {documentos.length > 0 && (
        <div className={seccion}>
          <div className={secLabel}>Documentos ({documentos.length})</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {documentos.map(d => (
              <div key={d.id} className="flex items-center gap-1.5 py-0.5 text-[11px]">
                <i className="ti ti-file flex-shrink-0 text-[12px] text-mute2" />
                <span className="min-w-0 flex-1 truncate text-ink">{d.nombre}</span>
                <span className="flex-shrink-0 text-[10px] text-mute2">{fmtTs(d.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Nota interna ── */}
      {caso.nota_interna && (
        <div className={seccion}>
          <div className={secLabel}>Nota interna</div>
          <div className="whitespace-pre-wrap rounded-[6px] bg-soft px-3 py-2 text-[11px] leading-relaxed text-ink">
            {caso.nota_interna}
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-[9px] text-mute2">TSADOQ · Gestión de casos legales · {hoy}</div>
    </div>
  )
}
