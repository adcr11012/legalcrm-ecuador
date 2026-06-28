import type { HistorialEntry } from '@/types/database'
import { ACCION_COLOR, ACCION_LABEL } from '@/features/casos/historialLabels'

export function HistorialTab({ historial }: { historial: HistorialEntry[] }) {
  return (
    <div className="flex flex-col">
      {historial.map((h, i) => (
        <div key={h.id} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
          <div className="flex flex-col items-center pt-1">
            <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ACCION_COLOR[h.accion] ?? '#9e9d98' }} />
            {i < historial.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div>
            <div className="text-[13px] leading-snug text-ink">
              {ACCION_LABEL[h.accion] ?? h.accion}
              {h.detalle ? ` — ${h.detalle}` : ''}
            </div>
            <div className="mt-0.5 text-[11px] text-mute2">
              {new Date(h.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        </div>
      ))}

      {historial.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin actividad registrada.
        </div>
      )}
    </div>
  )
}
