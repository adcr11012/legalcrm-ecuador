import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import type { Caso } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function DatosJudicialesModal({
  open,
  onClose,
  caso,
  onSave,
}: {
  open: boolean
  onClose: () => void
  caso: Caso
  onSave: (patch: Partial<Caso>) => Promise<void>
}) {
  const [presentada, setPresentada] = useState<'si' | 'no' | 'preparacion'>(
    caso.demanda_presentada ? 'si' : 'no',
  )
  const [numeroCausa, setNumeroCausa] = useState(caso.numero_causa ?? '')
  const [juzgado, setJuzgado] = useState(caso.juzgado ?? '')
  const [fechaPresentacion, setFechaPresentacion] = useState(caso.fecha_inicio ?? '')
  const [fechaCitacion, setFechaCitacion] = useState(caso.fecha_citacion ?? '')
  const [cuantia, setCuantia] = useState(caso.cuantia != null ? String(caso.cuantia) : '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPresentada(caso.demanda_presentada ? 'si' : 'no')
    setNumeroCausa(caso.numero_causa ?? '')
    setJuzgado(caso.juzgado ?? '')
    setFechaPresentacion(caso.fecha_inicio ?? '')
    setFechaCitacion(caso.fecha_citacion ?? '')
    setCuantia(caso.cuantia != null ? String(caso.cuantia) : '')
  }, [open, caso])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        demanda_presentada: presentada === 'si',
        numero_causa: presentada === 'si' ? numeroCausa || null : caso.numero_causa,
        juzgado: presentada === 'si' ? juzgado || null : caso.juzgado,
        fecha_inicio: presentada === 'si' ? fechaPresentacion || null : caso.fecha_inicio,
        fecha_citacion: presentada === 'si' ? fechaCitacion || null : null,
        cuantia: presentada === 'si' && cuantia ? Number(cuantia) : null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Datos judiciales">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>¿Ya fue presentada la demanda?</label>
          <select value={presentada} onChange={(e) => setPresentada(e.target.value as typeof presentada)} className={inputClass}>
            <option value="no">No</option>
            <option value="preparacion">En preparación</option>
            <option value="si">Sí</option>
          </select>
        </div>

        {presentada === 'si' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>N° de causa</label>
                <input value={numeroCausa} onChange={(e) => setNumeroCausa(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Juzgado / Tribunal</label>
                <input value={juzgado} onChange={(e) => setJuzgado(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Fecha de presentación</label>
                <input type="date" value={fechaPresentacion} onChange={(e) => setFechaPresentacion(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fecha de citación (opcional)</label>
                <input type="date" value={fechaCitacion} onChange={(e) => setFechaCitacion(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Cuantía (opcional)</label>
              <input type="number" step="0.01" value={cuantia} onChange={(e) => setCuantia(e.target.value)} className={inputClass} placeholder="USD" />
            </div>
          </>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60">
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
