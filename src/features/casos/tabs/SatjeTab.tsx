import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMovimientosPorCaso } from '@/features/esatje/api'
import type { SatjeMovimiento } from '@/types/database'

export function SatjeTab({ casoId, activo, esAdmin }: { casoId: string; activo: boolean; esAdmin: boolean }) {
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState<SatjeMovimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activo) { setLoading(false); return }
    listMovimientosPorCaso(casoId).then(setMovimientos).finally(() => setLoading(false))
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
        Movimientos judiciales detectados automáticamente en SATJE para este caso. Solo texto descriptivo — el
        expediente completo se consulta directamente en el sistema de la Función Judicial.
      </p>
      {movimientos.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin movimientos importados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {movimientos.map((m) => (
            <div key={m.id} className="rounded-[10px] border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-medium text-ink">{m.tipo}</div>
                <div className="flex-shrink-0 text-[11px] text-mute2">
                  {new Date(m.fecha_movimiento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              {m.descripcion && <div className="mt-1 text-[12px] text-muted">{m.descripcion}</div>}
              <div className="mt-1.5 text-[10px] text-mute2">Causa {m.numero_causa}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
