import { INSTANCIAS_POR_MATERIA } from '@/features/casos/materias'
import type { Caso } from '@/types/database'

export function InstanciaStepper({
  caso,
  puedeEditar,
  onChange,
}: {
  caso: Caso
  puedeEditar: boolean
  onChange: (instancia: string) => void
}) {
  const pasos = INSTANCIAS_POR_MATERIA[caso.materia ?? 'otro'] ?? []
  if (pasos.length === 0) return null

  const idxActual = pasos.findIndex((p) => p.value === caso.instancia_actual)

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-mute2">Instancia procesal</div>
      <div className="flex items-center">
        {pasos.map((p, i) => {
          const completada = idxActual >= 0 && i < idxActual
          const actual = i === idxActual
          return (
            <div key={p.value} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!puedeEditar}
                onClick={() => onChange(p.value)}
                className={`flex flex-shrink-0 flex-col items-center gap-1 ${puedeEditar ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                    actual
                      ? 'bg-accent text-white'
                      : completada
                        ? 'bg-accent-soft text-accent'
                        : 'border border-border bg-bg text-mute2'
                  }`}
                >
                  {completada ? <i className="ti ti-check text-[12px]" /> : i + 1}
                </div>
                <span className={`max-w-[90px] text-center text-[10px] ${actual ? 'font-semibold text-ink' : 'text-mute2'}`}>
                  {p.label}
                </span>
              </button>
              {i < pasos.length - 1 && (
                <div className={`mx-1 h-[2px] flex-1 ${completada ? 'bg-accent-soft' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
