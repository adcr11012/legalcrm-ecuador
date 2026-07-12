import { useMemo, useState } from 'react'
import { MANUAL } from '@/features/ayuda/manualContent'

export default function Ayuda() {
  const [busqueda, setBusqueda] = useState('')
  const [activa, setActiva] = useState(MANUAL[0].id)

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return MANUAL
    return MANUAL.filter(
      (s) => s.titulo.toLowerCase().includes(q) || s.contenido.some((p) => p.toLowerCase().includes(q)),
    )
  }, [busqueda])

  const seccion = filtradas.find((s) => s.id === activa) ?? filtradas[0]

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="hidden w-[240px] flex-shrink-0 overflow-y-auto border-r border-border bg-surface p-3 md:block">
        <div className="mb-3 text-[13px] font-semibold text-ink">Manual de TSADOQ</div>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en el manual…"
          className="mb-3 w-full rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
        />
        <nav className="flex flex-col gap-0.5">
          {filtradas.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiva(s.id)}
              className={`flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[12px] transition ${
                seccion?.id === s.id ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-soft hover:text-ink'
              }`}
            >
              <i className={`ti ${s.icono} text-[14px]`} />
              <span className="truncate">{s.titulo}</span>
            </button>
          ))}
          {filtradas.length === 0 && <div className="px-2.5 py-2 text-[12px] text-mute2">Sin resultados.</div>}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-2 md:hidden">
            <select
              value={seccion?.id}
              onChange={(e) => setActiva(e.target.value)}
              className="w-full rounded-[6px] border border-border bg-surface px-2.5 py-2 text-[13px] text-ink"
            >
              {filtradas.map((s) => (
                <option key={s.id} value={s.id}>{s.titulo}</option>
              ))}
            </select>
          </div>

          {seccion && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <i className={`ti ${seccion.icono} text-[20px] text-accent`} />
                <h1 className="text-[17px] font-semibold text-ink">{seccion.titulo}</h1>
              </div>
              <div className="flex flex-col gap-3">
                {seccion.contenido.map((p, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-muted">{p}</p>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 rounded-[10px] border border-accent/30 bg-accent-soft p-3.5 text-[12px] text-ink">
            <i className="ti ti-brain mr-1.5 text-accent" />
            ¿No encuentras lo que buscas? Pregúntale directamente a <strong>Temis</strong>, la IA de TSADOQ — conoce todo este manual.
          </div>
        </div>
      </div>
    </div>
  )
}
