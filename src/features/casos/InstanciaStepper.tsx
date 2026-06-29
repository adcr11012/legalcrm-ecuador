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

  function circulo(i: number, completada: boolean, actual: boolean) {
    return (
      <div
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition ${
          actual ? 'bg-accent text-white' : completada ? 'bg-accent-soft text-accent' : 'border border-border bg-bg text-mute2'
        }`}
      >
        {completada ? <i className="ti ti-check text-[12px]" /> : i + 1}
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-mute2">Instancia procesal</div>

      {/* Apilado verticalmente en móvil, para no depender de scroll horizontal. */}
      <div className="flex flex-col gap-0 sm:hidden">
        {pasos.map((p, i) => {
          const completada = idxActual >= 0 && i < idxActual
          const actual = i === idxActual
          return (
            <div key={p.value} className="flex gap-2">
              <div className="flex flex-col items-center">
                <button type="button" disabled={!puedeEditar} onClick={() => onChange(p.value)} className={puedeEditar ? 'cursor-pointer' : 'cursor-default'}>
                  {circulo(i, completada, actual)}
                </button>
                {i < pasos.length - 1 && <div className={`my-0.5 h-4 w-[2px] flex-1 ${completada ? 'bg-accent-soft' : 'bg-border'}`} />}
              </div>
              <span className={`pb-2 pt-0.5 text-[12px] ${actual ? 'font-semibold text-ink' : 'text-muted'}`}>{p.label}</span>
            </div>
          )
        })}
      </div>

      {/* En fila a partir de sm. */}
      <div className="hidden items-start sm:flex">
        {pasos.map((p, i) => {
          const completada = idxActual >= 0 && i < idxActual
          const actual = i === idxActual
          return (
            <div key={p.value} className="flex flex-1 flex-col items-center last:flex-none">
              <div className="flex w-full items-center">
                {i > 0 && <div className={`h-[2px] flex-1 ${idxActual >= i ? 'bg-accent-soft' : 'bg-border'}`} />}
                <button
                  type="button"
                  disabled={!puedeEditar}
                  onClick={() => onChange(p.value)}
                  className={`flex-shrink-0 ${puedeEditar ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {circulo(i, completada, actual)}
                </button>
                {i < pasos.length - 1 && <div className={`h-[2px] flex-1 ${completada ? 'bg-accent-soft' : 'bg-border'}`} />}
              </div>
              <span className={`mt-1 max-w-[90px] text-center text-[10px] leading-tight ${actual ? 'font-semibold text-ink' : 'text-mute2'}`}>
                {p.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
