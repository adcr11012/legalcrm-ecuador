import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getConfiguracionLaboral, actualizarSbu } from '@/features/laboral/api'
import type { ConfiguracionLaboral } from '@/types/database'

export default function AdminLaboral() {
  const [config, setConfig] = useState<ConfiguracionLaboral | null>(null)
  const [sbuInput, setSbuInput] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    getConfiguracionLaboral().then((c) => { setConfig(c); setSbuInput(String(c.sbu)) })
  }

  useEffect(() => { load() }, [])

  async function onGuardar() {
    setError(null)
    setMensaje(null)
    const valor = Number(sbuInput)
    if (!valor || valor <= 0) { setError('Ingresa un valor de SBU válido.'); return }
    setGuardando(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) throw new Error('No autenticado')
      await actualizarSbu(valor, data.user.id)
      setMensaje('SBU actualizado correctamente.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setGuardando(false)
    }
  }

  const diasDesdeActualizacion = config
    ? Math.floor((Date.now() - new Date(config.actualizado_en).getTime()) / 86_400_000)
    : null

  return (
    <div className="p-5">
      <div className="max-w-[480px] rounded-[10px] border border-border bg-surface p-4">
        <div className="mb-1 text-[13px] font-semibold text-ink">Salario Básico Unificado (SBU)</div>
        <p className="mb-3 text-[11px] text-mute2">
          Valor compartido por todos los workspaces, usado en la calculadora de liquidación laboral. El gobierno lo actualiza cada enero — revísalo apenas se publique el nuevo valor oficial.
        </p>

        {config && (
          <div className={`mb-3 rounded-[8px] px-3 py-2 text-[11px] ${diasDesdeActualizacion !== null && diasDesdeActualizacion > 400 ? 'bg-warn-soft text-warn' : 'bg-soft text-muted'}`}>
            Última actualización: {new Date(config.actualizado_en).toLocaleDateString('es-EC')} ({diasDesdeActualizacion} día(s) atrás)
            {diasDesdeActualizacion !== null && diasDesdeActualizacion > 400 && ' — revisa si ya salió el valor del nuevo año.'}
          </div>
        )}

        <label className="mb-1 block text-[11px] font-medium text-muted">Valor del SBU ($)</label>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="0.01"
            value={sbuInput}
            onChange={(e) => setSbuInput(e.target.value)}
            className="flex-1 rounded-[8px] border border-border bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
          <button
            onClick={onGuardar}
            disabled={guardando}
            className="flex-shrink-0 rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {mensaje && <div className="mt-3 rounded-[8px] bg-success-soft px-3 py-2 text-[12px] text-success">{mensaje}</div>}
        {error && <div className="mt-3 rounded-[8px] bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>}
      </div>
    </div>
  )
}
