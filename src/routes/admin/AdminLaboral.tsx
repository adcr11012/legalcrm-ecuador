import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getConfiguracionLaboral, actualizarSbu } from '@/features/laboral/api'
import { listFeriados, upsertFeriado, eliminarFeriado } from '@/features/plazos/api'
import { PROVINCIAS_ECUADOR } from '@/features/plazos/provincias'
import type { ConfiguracionLaboral, FeriadoEcuador } from '@/types/database'

export default function AdminLaboral() {
  const [config, setConfig] = useState<ConfiguracionLaboral | null>(null)
  const [sbuInput, setSbuInput] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [feriados, setFeriados] = useState<FeriadoEcuador[]>([])
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaProvincia, setNuevaProvincia] = useState('')

  function load() {
    getConfiguracionLaboral().then((c) => { setConfig(c); setSbuInput(String(c.sbu)) })
    loadFeriados()
  }

  function loadFeriados() {
    listFeriados().then(setFeriados)
  }

  useEffect(() => { load() }, [])

  async function onAgregarFeriado(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaFecha || !nuevoNombre.trim()) return
    await upsertFeriado(nuevaFecha, nuevoNombre.trim(), true, nuevaProvincia || null)
    setNuevaFecha('')
    setNuevoNombre('')
    setNuevaProvincia('')
    loadFeriados()
  }

  async function onVerificar(f: FeriadoEcuador) {
    await upsertFeriado(f.fecha, f.nombre, true, f.provincia)
    loadFeriados()
  }

  async function onEliminarFeriado(id: string) {
    if (!confirm('¿Eliminar este feriado?')) return
    await eliminarFeriado(id)
    loadFeriados()
  }

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

      <div className="mt-5 max-w-[640px] rounded-[10px] border border-border bg-surface p-4">
        <div className="mb-1 text-[13px] font-semibold text-ink">Feriados nacionales (Ecuador)</div>
        <p className="mb-3 text-[11px] text-mute2">
          Usados por la Calculadora de Plazos Procesales para excluir días no hábiles. Los feriados se trasladan por
          decreto cada año (Ley de recuperación de feriados) — revisa y verifica esta lista al inicio de cada año.
          También podés agregar acá cualquier feriado extraordinario que el Ejecutivo declare de un momento a otro
          (ej. un puente adicional por decreto, o un día no laborable declarado por una celebración puntual) — se
          aplica de inmediato en la calculadora, sin necesidad de deploy.
        </p>

        <form onSubmit={onAgregarFeriado} className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted">Fecha</label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-[10px] font-medium text-muted">Nombre / motivo</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej. Día no laborable declarado por decreto (celebración especial)"
              className="w-full rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted">Provincia (vacío = nacional)</label>
            <select
              value={nuevaProvincia}
              onChange={(e) => setNuevaProvincia(e.target.value)}
              className="rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
            >
              <option value="">Nacional (todas)</option>
              {PROVINCIAS_ECUADOR.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover">
            Agregar
          </button>
        </form>

        <div className="flex flex-col gap-1">
          {feriados.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded-[6px] border border-border bg-bg px-2.5 py-1.5">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-medium text-ink">{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span className="text-muted">{f.nombre}</span>
                {f.provincia ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">Local: {f.provincia}</span>
                ) : (
                  <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-mute2">Nacional</span>
                )}
                {!f.verificado && (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">Sin verificar</span>
                )}
              </div>
              <div className="flex gap-2">
                {!f.verificado && (
                  <button onClick={() => onVerificar(f)} className="text-[11px] text-success hover:underline">
                    Verificar
                  </button>
                )}
                <button onClick={() => onEliminarFeriado(f.id)} className="text-[11px] text-mute2 hover:text-danger">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {feriados.length === 0 && <div className="text-[12px] text-mute2">Sin feriados registrados.</div>}
        </div>
      </div>
    </div>
  )
}
