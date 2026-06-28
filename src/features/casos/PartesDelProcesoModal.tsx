import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { ROL_CLIENTE_OPCIONES, ROL_SOLICITANTE } from '@/features/casos/materias'
import type { Caso } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export function PartesDelProcesoModal({
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
  const [esContencioso, setEsContencioso] = useState(caso.es_contencioso)
  const [rolCliente, setRolCliente] = useState(caso.rol_cliente ?? '')
  const [contraparteNombre, setContraparteNombre] = useState(caso.contraparte_nombre ?? '')
  const [contraparteCedula, setContraparteCedula] = useState(caso.contraparte_cedula ?? '')
  const [contraparteAbogado, setContraparteAbogado] = useState(caso.contraparte_abogado ?? '')
  const [loading, setLoading] = useState(false)

  const opcionesRol = ROL_CLIENTE_OPCIONES[caso.materia ?? 'otro'] ?? []
  const esPenal = caso.materia === 'penal'

  useEffect(() => {
    if (!open) return
    setEsContencioso(caso.es_contencioso)
    setRolCliente(caso.rol_cliente ?? '')
    setContraparteNombre(caso.contraparte_nombre ?? '')
    setContraparteCedula(caso.contraparte_cedula ?? '')
    setContraparteAbogado(caso.contraparte_abogado ?? '')
  }, [open, caso])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        es_contencioso: esContencioso,
        rol_cliente: esContencioso ? rolCliente || null : ROL_SOLICITANTE.value,
        contraparte_nombre: esContencioso ? contraparteNombre || null : null,
        contraparte_cedula: esContencioso ? contraparteCedula || null : null,
        contraparte_abogado: esContencioso ? contraparteAbogado || null : null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Partes del proceso">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>¿Es proceso contencioso?</label>
          <select value={esContencioso ? 'si' : 'no'} onChange={(e) => setEsContencioso(e.target.value === 'si')} className={inputClass}>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>

        {esContencioso && (
          <>
            <div>
              <label className={labelClass}>{esPenal ? 'Contraparte procesal' : 'Nombre contraparte'}</label>
              <input value={contraparteNombre} onChange={(e) => setContraparteNombre(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cédula / RUC (opcional)</label>
                <input value={contraparteCedula} onChange={(e) => setContraparteCedula(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Abogado contraparte (opcional)</label>
                <input value={contraparteAbogado} onChange={(e) => setContraparteAbogado(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Rol del cliente</label>
              <select value={rolCliente} onChange={(e) => setRolCliente(e.target.value)} className={inputClass}>
                <option value="" disabled>
                  Selecciona…
                </option>
                {opcionesRol.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

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
