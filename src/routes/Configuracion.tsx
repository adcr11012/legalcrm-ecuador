import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { getWorkspace, updateWorkspace } from '@/features/workspace/api'
import { isGoogleDriveConfigured, buildGoogleConsentUrl, getDriveEstado, desconectarDrive, reconciliarDrive, prepararReconexionDrive, type DriveEstado } from '@/features/workspace/driveApi'
import { EtapasSettings } from '@/features/casos/EtapasSettings'
import { GroqSettings } from '@/features/workspace/GroqSettings'
import { OpenRouterSettings } from '@/features/workspace/OpenRouterSettings'
import { AuditoriaDocumentos } from '@/features/workspace/AuditoriaDocumentos'
import { getTema, setTema, type Tema } from '@/lib/theme'
import type { Workspace } from '@/types/database'
import { MobileBlock } from '@/components/mobile/MobileBlock'

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

  async function onPrepararReconexion() {
    if (!confirm('¿Preparar esta conexión para una futura reconexión?\n\nEtiqueta la carpeta raíz y las carpetas de cada caso (sin desconectar nada). Recomendado antes de desconectar una cuenta con documentos importantes.')) return
    setDriveBusy(true)
    setError(null)
    try {
      const r = await prepararReconexionDrive()
      alert(`Listo.\n${r.carpetasEtiquetadas} carpeta(s) de caso etiquetada(s).\n${r.txtCreados} caso.txt creado(s).\n\nYa puedes desconectar y reconectar esta misma cuenta con seguridad.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar la reconexión.')
    } finally {
      setDriveBusy(false)
    }
  }

  async function onReconciliarDrive() {
    if (!confirm('¿Reconciliar Drive?\n\nEsto revisa las carpetas dentro de la carpeta raíz de Drive y vuelve a vincularlas con sus casos (o crea el caso si no existe). Útil después de copiar carpetas manualmente a otra cuenta de Google.')) return
    setDriveBusy(true)
    setError(null)
    try {
      const resumen = await reconciliarDrive()
      const partes = [`${resumen.relinked} carpeta(s) vinculada(s)`, `${resumen.creados} caso(s) creado(s)`, `${resumen.sinCambios} sin cambios`]
      if (resumen.sinMatch.length > 0) partes.push(`sin coincidencia: ${resumen.sinMatch.join(', ')}`)
      alert(partes.join('\n'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reconciliar Drive.')
    } finally {
      setDriveBusy(false)
    }
  }

  return (
    <MobileBlock feature="Configuración">
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
          <label className={labelClass}>Google Drive + Calendar</label>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${driveEstado.conectado ? 'bg-success' : 'bg-mute2'}`} />
              {driveEstado.conectado ? `Conectado · ${driveEstado.email}` : 'No conectado'}
            </div>
            {puedeEditar && isGoogleDriveConfigured() && (
              <div className="flex gap-2">
                {driveEstado.conectado && (
                  <button
                    onClick={onPrepararReconexion}
                    disabled={driveBusy}
                    className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft disabled:opacity-60"
                  >
                    Preparar reconexión
                  </button>
                )}
                {driveEstado.conectado && (
                  <button
                    onClick={onReconciliarDrive}
                    disabled={driveBusy}
                    className="rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft disabled:opacity-60"
                  >
                    Reconciliar
                  </button>
                )}
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
          <p className="mt-2 text-[11px] text-mute2">
            Esta misma cuenta se usa para agendar automáticamente en Google Calendar todo lo que se registre en la Agenda de cada caso.
            {driveEstado.conectado && ' Si la conectaste antes de esta actualización, dale a "Reconectar" para habilitar el permiso de Calendar.'}
          </p>
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

        <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Notificaciones dentro de la app (campanita)</div>
        <p className="mb-2.5 text-[11px] text-mute2">
          Esto NO envía correos. Solo controla lo que aparece en la campanita 🔔 de notificaciones dentro de la app.
        </p>

        <div className="mb-2.5 flex items-center justify-between rounded-[10px] border border-border bg-surface p-3">
          <div>
            <div className="text-[13px] font-medium text-ink">Mostrar agenda próxima en la campanita</div>
            <div className="text-[11px] text-muted">
              Incluye todo lo agendado en la Agenda de cada caso — plazos, audiencias, tareas y otros —
              que esté por vencer, en las notificaciones dentro de la app.
            </div>
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
          <label className={labelClass}>Con cuántos días de anticipación</label>
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
          <p className="mt-1.5 text-[11px] text-mute2">
            Define desde cuántos días antes un ítem de la Agenda empieza a aparecer en la campanita.
            Ej. con "3 días antes", una tarea del 10 de julio aparece en la campanita a partir del 7 de julio.
          </p>
        </div>

        <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Alertas de inactividad</div>

        <div className="mb-2.5 flex items-center justify-between rounded-[10px] border border-border bg-surface p-3">
          <div>
            <div className="text-[13px] font-medium text-ink">Activar alertas de inactividad</div>
            <div className="text-[11px] text-muted">Avisa a los administradores sobre usuarios sin conectarse y casos sin movimiento.</div>
          </div>
          <button
            disabled={!puedeEditar}
            onClick={() => guardar({ alertas_inactividad_activas: !workspace.alertas_inactividad_activas })}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-60 ${
              workspace.alertas_inactividad_activas ? 'bg-accent' : 'bg-soft'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                workspace.alertas_inactividad_activas ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <label className={labelClass}>Usuario sin conectarse</label>
            {puedeEditar ? (
              <select
                value={workspace.dias_inactividad_usuario}
                onChange={(e) => guardar({ dias_inactividad_usuario: Number(e.target.value) })}
                className={inputClass}
              >
                {[15, 30, 45, 60, 90].map((n) => (
                  <option key={n} value={n}>{n} días</option>
                ))}
              </select>
            ) : (
              <div className="text-[13px] font-medium text-ink">{workspace.dias_inactividad_usuario} días</div>
            )}
          </div>
          <div className="rounded-[10px] border border-border bg-surface p-3">
            <label className={labelClass}>Caso sin movimiento</label>
            {puedeEditar ? (
              <select
                value={workspace.dias_inactividad_caso}
                onChange={(e) => guardar({ dias_inactividad_caso: Number(e.target.value) })}
                className={inputClass}
              >
                {[7, 15, 30, 45, 60].map((n) => (
                  <option key={n} value={n}>{n} días</option>
                ))}
              </select>
            ) : (
              <div className="text-[13px] font-medium text-ink">{workspace.dias_inactividad_caso} días</div>
            )}
          </div>
        </div>

        <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Consulta de causas judiciales (SATJE)</div>

        <div className="flex items-center justify-between rounded-[10px] border border-border bg-surface p-3">
          <div>
            <div className="text-[13px] font-medium text-ink">Activar sincronización con SATJE</div>
            <div className="text-[11px] text-muted">
              El proceso se realiza automáticamente y se carga a la plataforma cada 24 horas: revisa si hay
              movimientos nuevos en los casos activos con número de causa registrado, y los agrega al historial
              de cada caso. Si algún número de causa tiene un formato inválido, te avisamos en las notificaciones.
            </div>
          </div>
          <button
            disabled={!puedeEditar}
            onClick={() => guardar({ satje_sincronizacion_activa: !workspace.satje_sincronizacion_activa })}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-60 ${
              workspace.satje_sincronizacion_activa ? 'bg-accent' : 'bg-soft'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                workspace.satje_sincronizacion_activa ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {puedeEditar && (
          <>
            <div className="mt-6 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute2">Auditoría LOPDP</div>
            <AuditoriaDocumentos workspaceId={workspace.id} />
          </>
        )}

        {!puedeEditar && (
          <p className="mt-3 text-[11px] text-mute2">Solo un administrador puede modificar esta configuración.</p>
        )}
        {saved && <p className="mt-3 text-[11px] text-success">{saved}</p>}
        {error && <p className="mt-3 text-[11px] text-danger">{error}</p>}
      </div>
    </div>
    </MobileBlock>
  )
}
