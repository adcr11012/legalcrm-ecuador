import { useEffect, useRef, useState } from 'react'
import { listClientes, createCliente } from '@/features/clientes/api'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Cliente } from '@/types/database'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent'

export function ClienteCombobox({
  value,
  onChange,
}: {
  value: { id: string; nombre: string } | null
  onChange: (cliente: { id: string; nombre: string } | null) => void
}) {
  const { profile } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [query, setQuery] = useState(value?.nombre ?? '')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listClientes().then(setClientes).catch(() => {})
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase()))
  const coincidenciaExacta = clientes.some((c) => c.nombre.toLowerCase() === query.trim().toLowerCase())

  function select(c: Cliente) {
    onChange({ id: c.id, nombre: c.nombre })
    setQuery(c.nombre)
    setOpen(false)
  }

  async function crearNuevo() {
    if (!profile || !query.trim()) return
    setCreating(true)
    try {
      const nuevo = await createCliente({ workspace_id: profile.workspace_id, nombre: query.trim(), tipo: 'persona_natural' })
      setClientes((prev) => [...prev, nuevo])
      select(nuevo)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar o crear cliente…"
        className={inputClass}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-[8px] border border-border bg-surface shadow-lg">
          <div className="max-h-[160px] overflow-y-auto">
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c)}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition hover:bg-bg"
              >
                {c.nombre}
              </button>
            ))}
            {filtrados.length === 0 && !query.trim() && (
              <div className="px-3 py-2 text-[12px] text-mute2">Escribe para buscar o crear un cliente.</div>
            )}
          </div>
          {query.trim() && !coincidenciaExacta && (
            <button
              type="button"
              onClick={crearNuevo}
              disabled={creating}
              className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-[13px] text-accent transition hover:bg-accent-soft disabled:opacity-60"
            >
              <i className="ti ti-plus" /> {creating ? 'Creando…' : `Crear cliente "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
