import { useState } from 'react'
import { buildGoogleConsentUrl, isGoogleDriveConfigured } from '@/features/workspace/driveApi'
import { GroqSettings } from '@/features/workspace/GroqSettings'
import { OpenRouterSettings } from '@/features/workspace/OpenRouterSettings'
import { EtapasSettings } from '@/features/casos/EtapasSettings'

const RESUME_KEY = 'tsadoq_resumir_setup_wizard'

// Antes de mandar al usuario a Google (que saca de la app por completo),
// dejamos una marca para reabrir el asistente automáticamente cuando
// vuelva — de otra forma perdería el hilo en medio del proceso.
export function marcarResumirSetupAlVolver() {
  sessionStorage.setItem(RESUME_KEY, '1')
}
export function debeResumirSetup(): boolean {
  return sessionStorage.getItem(RESUME_KEY) === '1'
}
export function limpiarResumirSetup() {
  sessionStorage.removeItem(RESUME_KEY)
}

const PASOS = [
  { key: 'intro', titulo: '' },
  { key: 'drive', titulo: 'Google Drive' },
  { key: 'groq', titulo: 'Temis IA' },
  { key: 'openrouter', titulo: 'Visión (opcional)' },
  { key: 'etapas', titulo: 'Etapas del Kanban' },
  { key: 'listo', titulo: '' },
] as const

export function SetupInicialWizard({
  driveConectado,
  groqConectado,
  onClose,
}: {
  driveConectado: boolean
  groqConectado: boolean
  onClose: () => void
}) {
  const [paso, setPaso] = useState(debeResumirSetup() ? 2 : 0)

  function irA(i: number) {
    setPaso(Math.max(0, Math.min(PASOS.length - 1, i)))
  }

  function conectarDrive() {
    marcarResumirSetupAlVolver()
    window.location.href = buildGoogleConsentUrl()
  }

  function cerrar() {
    limpiarResumirSetup()
    onClose()
  }

  const pasoActual = PASOS[paso]
  const esUltimo = paso === PASOS.length - 1

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-surface shadow-2xl">
        {paso > 0 && !esUltimo && (
          <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border px-5 pt-4 pb-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < paso ? 'bg-accent' : i === paso ? 'bg-accent/50' : 'bg-soft'
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {pasoActual.key === 'intro' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
                <i className="ti ti-sparkles text-[26px] text-accent" />
              </div>
              <h2 className="text-[18px] font-bold text-ink">Dejemos tu cuenta lista</h2>
              <p className="max-w-[380px] text-[13px] leading-relaxed text-muted">
                Son solo 2 cosas necesarias (conectar Drive y activar la IA) más 2 opcionales — todo se hace acá mismo,
                pegando una clave y tocando un botón. No toma más de 3 minutos.
              </p>
              <button
                onClick={() => irA(1)}
                className="mt-2 rounded-[10px] bg-accent px-6 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover"
              >
                Empezar — es fácil
              </button>
              <button onClick={cerrar} className="text-[12px] text-mute2 hover:text-muted">
                Dejar para después
              </button>
            </div>
          )}

          {pasoActual.key === 'drive' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">1. Conecta Google Drive</h2>
              <p className="text-[12px] text-muted">
                Los documentos de tus casos se guardan en el Drive de tu propio despacho, no en nuestros servidores —
                así el control es siempre tuyo. Con un clic conectás la cuenta de Google del despacho.
              </p>
              {!isGoogleDriveConfigured() ? (
                <div className="rounded-[8px] border border-border bg-soft p-3 text-[12px] text-mute2">
                  Drive no está configurado en este entorno.
                </div>
              ) : driveConectado ? (
                <div className="flex items-center gap-2 rounded-[10px] border border-success/30 bg-success-soft px-3.5 py-3 text-[13px] text-success">
                  <i className="ti ti-circle-check text-[18px]" /> Ya está conectado.
                </div>
              ) : (
                <button
                  onClick={conectarDrive}
                  className="flex items-center justify-center gap-2 rounded-[10px] bg-accent py-3 text-[13px] font-medium text-white transition hover:bg-accent-hover"
                >
                  <i className="ti ti-brand-google-drive" /> Conectar con Google
                </button>
              )}
              <p className="text-[11px] text-mute2">
                Te va a llevar un momento a la pantalla de Google para autorizar el acceso, y volvés acá solo.
              </p>
            </div>
          )}

          {pasoActual.key === 'groq' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">2. Activa Temis, tu asistente de IA</h2>
              <p className="text-[12px] text-muted">
                Es gratis. Sacás una clave en 1 minuto y la pegás abajo — nada más.
              </p>
              <GroqSettings puedeEditar />
            </div>
          )}

          {pasoActual.key === 'openrouter' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">3. Lectura de imágenes (opcional)</h2>
              <p className="text-[12px] text-muted">
                Solo hace falta si vas a subir documentos escaneados como foto o imagen. Los PDF y Word normales ya
                funcionan sin esto — podés saltear este paso sin problema.
              </p>
              <OpenRouterSettings puedeEditar />
            </div>
          )}

          {pasoActual.key === 'etapas' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">4. Revisa las etapas de tus casos</h2>
              <p className="text-[12px] text-muted">
                Ya vienen etapas listas para usar (Nuevo, Activo, Resuelto...) — podés dejarlas así o ajustarlas a como
                trabaja tu despacho. Esto lo podés cambiar cuando quieras, no hace falta decidirlo ahora.
              </p>
              <EtapasSettings />
            </div>
          )}

          {pasoActual.key === 'listo' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
                <i className="ti ti-circle-check text-[26px] text-success" />
              </div>
              <h2 className="text-[18px] font-bold text-ink">
                {driveConectado && groqConectado ? '¡Listo, ya podés arrancar!' : 'Guardado'}
              </h2>
              <p className="max-w-[380px] text-[13px] leading-relaxed text-muted">
                {driveConectado && groqConectado
                  ? 'Drive y Temis ya están conectados. Cuando quieras, creá tu primer caso.'
                  : 'Podés terminar de conectar lo que falte más tarde — te vamos a recordar con un aviso hasta que esté todo listo.'}
              </p>
              <button
                onClick={cerrar}
                className="mt-2 rounded-[10px] bg-accent px-6 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover"
              >
                Entendido
              </button>
            </div>
          )}
        </div>

        {paso > 0 && !esUltimo && (
          <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-5 py-3">
            <button onClick={() => irA(paso - 1)} className="text-[12px] text-muted hover:text-ink">
              Atrás
            </button>
            <div className="flex items-center gap-3">
              <button onClick={cerrar} className="text-[12px] text-mute2 hover:text-muted">
                Dejar para después
              </button>
              <button
                onClick={() => irA(paso + 1)}
                className="rounded-[8px] bg-accent px-4 py-2 text-[12px] font-medium text-white transition hover:bg-accent-hover"
              >
                {paso === 4 ? 'Terminar' : 'Siguiente'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
