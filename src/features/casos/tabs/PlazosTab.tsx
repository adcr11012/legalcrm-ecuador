import type { Plazo } from '@/types/database'
import { diasRestantes, clasificarUrgencia, labelDias, URGENCIA_CLASS, URGENCIA_BORDER } from '@/features/casos/plazoUrgencia'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function PlazosTab({
  plazos,
  puedeEditar,
  onOpenAdd,
  onDelete,
}: {
  plazos: Plazo[]
  puedeEditar: boolean
  onOpenAdd: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {plazos.map((p) => {
        const dias = diasRestantes(p.fecha)
        const urgencia = clasificarUrgencia(dias)
        const fecha = new Date(p.fecha + 'T00:00:00')
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 rounded-[10px] border border-border bg-surface px-4 py-3 ${URGENCIA_BORDER[urgencia]}`}
          >
            <div className="min-w-[42px] text-center">
              <div className="text-[22px] font-bold leading-none text-ink">{fecha.getDate()}</div>
              <div className="text-[10px] uppercase text-mute2">{MESES[fecha.getMonth()]}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{p.titulo}</div>
              <div className="mt-0.5 text-[11px] text-muted">{p.descripcion || ' '}</div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCIA_CLASS[urgencia]}`}>
                {labelDias(dias)}
              </span>
              {puedeEditar && (
                <button
                  onClick={() => onDelete(p.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <i className="ti ti-trash text-[14px]" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {plazos.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-border p-7 text-center text-[12px] text-mute2">
          Sin plazos registrados.
        </div>
      )}

      {puedeEditar && (
        <button
          onClick={onOpenAdd}
          className="mt-1 inline-flex items-center gap-1.5 self-start rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-[#f2f1ee]"
        >
          <i className="ti ti-plus" /> Agregar plazo
        </button>
      )}
    </div>
  )
}
