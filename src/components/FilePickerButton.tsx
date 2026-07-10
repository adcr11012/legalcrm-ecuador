import { useRef } from 'react'

export function FilePickerButton({ file, onChange, accept = 'image/*', label = 'Adjuntar captura' }: {
  file: File | null
  onChange: (file: File | null) => void
  accept?: string
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-[6px] border border-border px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-soft"
      >
        <i className="ti ti-paperclip text-[13px]" /> {label}
      </button>
      {file && (
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted">
          <span className="truncate max-w-[140px]">{file.name}</span>
          <button type="button" onClick={() => onChange(null)} className="flex-shrink-0 text-mute2 hover:text-danger">
            <i className="ti ti-x text-[12px]" />
          </button>
        </span>
      )}
    </div>
  )
}
