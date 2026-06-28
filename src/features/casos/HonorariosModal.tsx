import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import type { Caso, HonorariosFormaPago, HonorariosTipo } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

const TIPO_LABEL: Record<HonorariosTipo, string> = {
  fijo: 'Fijo',
  por_hora: 'Por hora',
  por_exito: 'Por éxito',
  mixto: 'Mixto',
}
const FORMA_PAGO_LABEL: Record<HonorariosFormaPago, string> = {
  inicio: 'Al inicio',
  cuotas: 'Por cuotas',
  al_finalizar: 'Al finalizar',
}

export function HonorariosModal({
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
  const [tipo, setTipo] = useState<HonorariosTipo>(caso.honorarios_tipo ?? 'fijo')
  const [monto, setMonto] = useState(caso.honorarios_monto != null ? String(caso.honorarios_monto) : '')
  const [formaPago, setFormaPago] = useState<HonorariosFormaPago>(caso.honorarios_forma_pago ?? 'inicio')
  const [notas, setNotas] = useState(caso.honorarios_notas ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setTipo(caso.honorarios_tipo ?? 'fijo')
    setMonto(caso.honorarios_monto != null ? String(caso.honorarios_monto) : '')
    setFormaPago(caso.honorarios_forma_pago ?? 'inicio')
    setNotas(caso.honorarios_notas ?? '')
  }, [open, caso])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        honorarios_tipo: tipo,
        honorarios_monto: monto ? Number(monto) : null,
        honorarios_forma_pago: formaPago,
        honorarios_notas: notas || null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Honorarios">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as HonorariosTipo)} className={inputClass}>
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Monto pactado (USD)</label>
            <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Forma de pago</label>
          <select value={formaPago} onChange={(e) => setFormaPago(e.target.value as HonorariosFormaPago)} className={inputClass}>
            {Object.entries(FORMA_PAGO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Notas de honorarios</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={inputClass} />
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-[#f2f1ee]">
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
