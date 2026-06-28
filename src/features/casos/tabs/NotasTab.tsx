import { useState } from 'react'

export function NotasTab({ nota, onSave }: { nota: string | null; onSave: (nota: string) => Promise<void> }) {
  const [value, setValue] = useState(nota ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onSave(value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <textarea
        rows={9}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nota interna sobre este caso..."
        className="w-full resize-none rounded-[10px] border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink outline-none transition focus:border-accent"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar nota'}
        </button>
      </div>
    </div>
  )
}
