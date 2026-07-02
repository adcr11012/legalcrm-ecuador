import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { getWorkspace, updateWorkspace } from '@/features/workspace/api'
import { isGoogleDriveConfigured, buildGoogleConsentUrl, getDriveEstado, desconectarDrive, type DriveEstado } from '@/features/workspace/driveApi'
import { EtapasSettings } from '@/features/casos/EtapasSettings'
import { GroqSettings } from '@/features/workspace/GroqSettings'
import { OpenRouterSettings } from '@/features/workspace/OpenRouterSettings'
import { getTema, setTema, type Tema } from '@/lib/theme'
import type { Workspace } from '@/types/database'

const TEMAS: { value: Tema; label: string; icon: string }[] = [
  { value: 'claro', label: 'Claro', icon: 'ti-sun' },
  { value: 'oscuro', label: 'Oscuro', icon: 'ti-moon' },
  { value: 'moderno', label: 'Moderno', icon: 'ti-sparkles' },
]

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent disabled:opacity-70'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export default function Configuracion() {
  const { profile } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [driveEstado, setDriveEstado] = useState<DriveEstado>({ conectado: false, email: null })
  const [driveBusy, setDriveBusy] = useState(false)
  const [tema, setTemaState] = useState<Tema>('claro')

  useEffect(() => {
    setTemaState(getTema())
  }, [])

  function onTema(t: Tema) {
    setTema(t)
    setTemaState(t)
  }

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const [ws, estado] = await Promise.all([getWorkspace(profile.workspace_id), getDriveEstado()])
      setWorkspace(ws)
      setNombre(ws?.nombre ?? '')
      setDriveEstado(estado)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  async function guardar(patch: Partial<Workspace>) {
    if (!workspace) return
    setError(null)
    setSaved(null)
    try {
      const updated = await updateWorkspace(workspace.id, patch)
      setWorkspace(updated)
      setSaved('Guardado')
      setTimeout(() => setSaved(null), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.')
    }
  }

  if (loading) return <div className="flex-1 p-5 text-[13px] text-muted">Cargando configuración…</div>
  if (error && !workspace) return <div className="flex-1 p-5 text-[13px] text-danger">{error}</div>
  if (!workspace) return null

  if (profile && profile.rol !== 'administrador') return <Navigate to="/dashboard" replace />

  const puedeEditar = profile?.rol === 'administrador'

  async function onDesconectarDrive() {
    if (!confirm('¿Desconectar Google Drive?\n\nLos documentos ya subidos permanecen en Drive y se podrán ver nuevamente al reconectar la misma cuenta.\n\nMientras esté desconectado no se podrán subir, ver ni leer documentos con IA.')) return
    setDriveBusy(true)
    setError(null)
    try {
      await desconectarDrive()
      setDriveEstado({ conectado: false, email: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desconectar.')
    } finally {
      setDriveBusy(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-[560px]">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Apariencia</div>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.value}
              onClick={() => onTema(t.value)}
              className={`flex flex-col items-center gap-1.5 rounded-[10px] border p-3 transition ${
                tema === t.value ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:bg-soft'
              }`}
            >
              <i className={`ti ${t.icon} text-[20px] ${tema === t.value ? 'text-accent' : 'text-muted'}`} />
              <span className={`text-[12px] font-medium ${tema === t.value ? 'text-accent' : 'text-ink'}`}>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mute2">Workspace</div>

        <div className="mb-2.5 rounded-[10px] border border-border bg-surface p-3">
          <label className={labelClass}>Nombre del workspace</label>
          {puedeEditar ? (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => {
                if (nombre.trim() && nombre !== workspace.nombre) guardar({ nombre: nombre.trim() })
              }}
              className={inputClass}
            />
          ) : (
            <div className="text-[13px] font-medium text-ink">{workspace.nombre}</div>
          )}
        </div>

        <div className="mb-2.5 rounded-[10px] border border-border bg-surface p-3">
          <label className={labelClass}>Plan</label>
          <div className="text-[13px] font-medium capitalize text-ink">{workspace.plan}</div>
        </div>

        <div className="rounded-[10px] border border-border bg-surface p-3">
          <label className={labelClass}>Google Drive</label>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${driveEstado.conectado ? 'bg-success' : 'bg-mute2'}`} />
              {driveEstado.conectado ? `Conectado · ${driveEstado.email}` : 'No conectado'}
            </div>
            {puedeEditar && isGoogleDriveConfigured() && (
              <div className="flex gap-2">
                {driveEstado.conectado && (
                  <button
                    onClick={onDesconectarDrive}
                    disabled={driveBusy}
                    className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                  >
                    Desconectar
                  </button>
                )}
                <a
                  href={buildGoogleConsentUrl()}
                  className="rounded-[6px] bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-accent-hover"
                >
                  {driveEstado.conectado ? 'Reconectar' : 'Conectar'}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2.5">
          <GroqSettings puedeEditar={puedeEditar} />
        </div>

        <div className="mt-2.5">
          <OpenRouterSettings puedeEditar={puedeEditar} />
        </div>

        {puedeEditar && (
          <>
            <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Etapas del Kanban</div>
            <EtapasSettings />
          </>
        )}

        <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Notificaciones</div>

        <div className="mb-2.5 flex items-center justify-between rounded-[10px] border border-border bg-surface p-3">
          <div>
            <div className="text-[13px] font-medium text-ink">Alertas de plazos por correo</div>
            <div className="text-[11px] text-muted">Avisa a abogados asignados y al admin antes de un vencimiento.</div>
          </div>
          <button
            disabled={!puedeEditar}
            onClick={() => guardar({ notif_email: !workspace.notif_email })}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-60 ${
              workspace.notif_email ? 'bg-accent' : 'bg-soft'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                workspace.notif_email ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="rounded-[10px] border border-border bg-surface p-3">
          <label className={labelClass}>Días de anticipación</label>
          {puedeEditar ? (
            <select
              value={workspace.dias_anticipacion}
              onChange={(e) => guardar({ dias_anticipacion: Number(e.target.value) })}
              className={inputClass}
            >
              {[1, 2, 3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n} día{n === 1 ? '' : 's'} antes
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[13px] font-medium text-ink">{workspace.dias_anticipacion} días antes</div>
          )}
        </div>

        {!puedeEditar && (
          <p className="mt-3 text-[11px] text-mute2">Solo un administrador puede modificar esta configuración.</p>
        )}
        {saved && <p className="mt-3 text-[11px] text-success">{saved}</p>}
        {error && <p className="mt-3 text-[11px] text-danger">{error}</p>}
      </div>
    </div>
  )
}
