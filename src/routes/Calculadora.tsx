import { useSearchParams } from 'react-router-dom'
import CalculadoraLaboral from '@/routes/CalculadoraLaboral'
import CalculadoraPlazos from '@/routes/CalculadoraPlazos'

export default function Calculadora() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modo: 'liquidacion' | 'plazos' = searchParams.get('modo') === 'plazos' ? 'plazos' : 'liquidacion'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto mt-4 flex w-full max-w-[720px] justify-center px-5">
        <div className="flex gap-0.5 rounded-[8px] bg-soft p-0.5">
          <button
            onClick={() => setSearchParams((prev) => { prev.delete('modo'); return prev })}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] transition ${modo === 'liquidacion' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            <i className="ti ti-briefcase" /> Liquidación laboral
          </button>
          <button
            onClick={() => setSearchParams((prev) => { prev.set('modo', 'plazos'); return prev })}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] transition ${modo === 'plazos' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            <i className="ti ti-calendar-time" /> Plazos procesales
          </button>
        </div>
      </div>

      {modo === 'liquidacion' ? <CalculadoraLaboral /> : <CalculadoraPlazos />}
    </div>
  )
}
