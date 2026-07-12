import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { uploadToDrive, getDriveEstado } from '@/features/workspace/driveApi'
import type { Documento, Visibilidad } from '@/types/database'

const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'
const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'

export function AddDocumentoModal({
  open,
  onClose,
  casoId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  casoId: string
  onAdded: (d: Documento) => void
}) {
  const [conectado, setConectado] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [visibilidad, setVisibilidad] = useState<Visibilidad>('privado')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    getDriveEstado()
      .then((e) => setConectado(e.conectado))
      .catch(() => setConectado(false))
  }, [open])

  function reset() {
    setFile(null)
    setVisibilidad('privado')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const documento = await uploadToDrive(casoId, file, visibilidad)
      onAdded(documento)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Subir documento"
    >
      {conectado === false ? (
        <div className="rounded-[6px] border border-warn/20 bg-warn-soft px-3 py-2.5 text-[12px] text-warn">
          Google Drive no está conectado en este workspace. Pide a un administrador que lo conecte desde Configuración antes
          de subir documentos.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Archivo</label>
            <input
              ref={fileInputRef}
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-mute2">Se subirá directamente a la carpeta de este caso en Google Drive.</p>
          </div>

          <div>
            <label className={labelClass}>Visibilidad</label>
            <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value as Visibilidad)} className={inputClass}>
              <option value="privado">Privado (solo usuarios)</option>
              <option value="compartido">Compartido (también el cliente)</option>
            </select>
          </div>

          {error && (
            <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                reset()
                onClose()
              }}
              className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-muted transition hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Subiendo…' : 'Subir a Drive'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
