import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMovimientosPorCaso, listDatosGeneralesPorCaso } from '@/features/esatje/api'
import type { SatjeMovimiento, SatjeDatosGenerales } from '@/types/database'

type Jurisdiccion = {
  nombre: string
  ciudad: string | null
  datosGenerales: SatjeDatosGenerales | null
  movimientos: SatjeMovimiento[]
}

function agruparPorJurisdiccion(movimientos: SatjeMovimiento[], datosGenerales: SatjeDatosGenerales[]): Jurisdiccion[] {
  const dgPorJurisdiccion = new Map(datosGenerales.map((dg) => [dg.jurisdiccion, dg]))
  const grupos = new Map<string, Jurisdiccion>()

  for (const m of movimientos) {
    const nombre = m.jurisdiccion ?? 'Sin jurisdicción registrada'
    if (!grupos.has(nombre)) {
      grupos.set(nombre, { nombre, ciudad: m.ciudad, datosGenerales: dgPorJurisdiccion.get(nombre) ?? null, movimientos: [] })
    }
    grupos.get(nombre)!.movimientos.push(m)
  }

  return [...grupos.values()]
}

const CAMPOS_DATOS_GENERALES: { key: keyof SatjeDatosGenerales; label: string }[] = [
  { key: 'numero_proceso', label: 'Número de proceso' },
  { key: 'materia', label: 'Materia' },
  { key: 'tipo_accion', label: 'Tipo de acción' },
  { key: 'delito_asunto', label: 'Delito/Asunto' },
  { key: 'judicatura_actual', label: 'Judicatura' },
  { key: 'actor', label: 'Actor/Ofendido' },
  { key: 'demandado', label: 'Demandado/Procesado' },
]

function BloqueJurisdiccion({ jurisdiccion }: { jurisdiccion: Jurisdiccion }) {
  const [abierto, setAbierto] = useState(false)
  const [datosAbiertos, setDatosAbiertos] = useState(false)
  const [procesoAbierto, setProcesoAbierto] = useState(true)

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        <i className={`ti ${abierto ? 'ti-chevron-down' : 'ti-chevron-right'} text-[14px] text-mute2`} />
        <span className="text-[12px] text-mute2">●</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">{jurisdiccion.nombre}</div>
          {jurisdiccion.ciudad && <div className="text-[11px] text-mute2">{jurisdiccion.ciudad}</div>}
        </div>
        <span className="flex-shrink-0 rounded-full bg-bg px-2 py-0.5 text-[11px] text-mute2">
          {jurisdiccion.movimientos.length} evento{jurisdiccion.movimientos.length === 1 ? '' : 's'}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-border px-3.5 pb-3.5 pt-3">
          {jurisdiccion.datosGenerales && (
            <div className="mb-3">
              <button
                onClick={() => setDatosAbiertos((v) => !v)}
                className="mb-1.5 flex items-center gap-1.5 pl-4 text-[11px] font-medium text-mute2"
              >
                <span className="text-mute2">└</span>
                <i className={`ti ${datosAbiertos ? 'ti-chevron-down' : 'ti-chevron-right'} text-[12px]`} />
                Datos generales
              </button>
              {datosAbiertos && (
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 pl-8 sm:grid-cols-2">
                  {CAMPOS_DATOS_GENERALES.map(({ key, label }) => {
                    const valor = jurisdiccion.datosGenerales![key]
                    if (!valor) return null
                    return (
                      <div key={key} className="text-[12px]">
                        <span className="text-mute2">{label}: </span>
                        <span className="text-muted">{String(valor)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <button
              onClick={() => setProcesoAbierto((v) => !v)}
              className="mb-1.5 flex items-center gap-1.5 pl-4 text-[11px] font-medium text-mute2"
            >
              <span className="text-mute2">└</span>
              <i className={`ti ${procesoAbierto ? 'ti-chevron-down' : 'ti-chevron-right'} text-[12px]`} />
              Información del proceso
              <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px]">{jurisdiccion.movimientos.length}</span>
            </button>
            {procesoAbierto && (
            <div className="flex flex-col gap-1.5 pl-8">
              {jurisdiccion.movimientos.map((m) => (
                <div key={m.id} className="rounded-[8px] border border-border bg-bg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-medium text-ink">{m.tipo}</div>
                    <div className="flex-shrink-0 text-[11px] text-mute2">
                      {new Date(m.fecha_movimiento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {m.descripcion && <div className="mt-1 text-[11px] text-muted">{m.descripcion}</div>}
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SatjeTab({ casoId, activo, esAdmin }: { casoId: string; activo: boolean; esAdmin: boolean }) {
  const navigate = useNavigate()
  const [jurisdicciones, setJurisdicciones] = useState<Jurisdiccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activo) { setLoading(false); return }
    Promise.all([listMovimientosPorCaso(casoId), listDatosGeneralesPorCaso(casoId)])
      .then(([movimientos, datosGenerales]) => setJurisdicciones(agruparPorJurisdiccion(movimientos, datosGenerales)))
      .finally(() => setLoading(false))
  }, [casoId, activo])

  if (!activo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border p-8 text-center">
        <i className="ti ti-lock text-[28px] text-mute2" />
        <div className="text-[13px] font-medium text-ink">Sincronización con SATJE no activada</div>
        <p className="max-w-[380px] text-[12px] text-muted">
          Este workspace no tiene activada la consulta automática de movimientos judiciales.
          {esAdmin ? ' Puedes activarla desde Configuración.' : ' Pídele a un administrador que la active desde Configuración.'}
        </p>
        {esAdmin && (
          <button
            onClick={() => navigate('/configuracion')}
            className="rounded-[8px] bg-accent px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover"
          >
            Ir a Configuración
          </button>
        )}
      </div>
    )
  }

  if (loading) return <div className="p-5 text-center text-[12px] text-muted">Cargando movimientos…</div>

  return (
    <div>
      <p className="mb-3 text-[12px] text-mute2">
        Movimientos judiciales detectados automáticamente en SATJE para este caso, agrupados por jurisdicción. Solo
        texto descriptivo — el expediente completo se consulta directamente en el sistema de la Función Judicial.
      </p>
      {jurisdicciones.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin movimientos importados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jurisdicciones.map((j) => (
            <BloqueJurisdiccion key={j.nombre} jurisdiccion={j} />
          ))}
        </div>
      )}
    </div>
  )
}
