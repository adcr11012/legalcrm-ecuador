import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MANUAL } from '@/features/ayuda/manualContent'
import type { RolUsuario } from '@/types/database'

const PASOS_POR_ROL: Record<RolUsuario, { icono: string; texto: string; ruta?: string }[]> = {
  administrador: [
    { icono: 'ti-settings', texto: 'Conecta Google Drive del despacho para guardar documentos de los casos.', ruta: '/configuracion' },
    { icono: 'ti-list-check', texto: 'Revisa o ajusta las etapas de tu flujo de casos (Kanban).', ruta: '/configuracion' },
    { icono: 'ti-user-shield', texto: 'Invita a tu equipo y asígnale un rol (Master o Limitado).', ruta: '/usuarios' },
    { icono: 'ti-gavel', texto: 'Activa SATJE si quieres novedades judiciales automáticas de tus casos.', ruta: '/configuracion' },
    { icono: 'ti-briefcase', texto: 'Crea tu primer caso y agrega a las personas involucradas.', ruta: '/casos' },
  ],
  master: [
    { icono: 'ti-briefcase', texto: 'Revisa los casos del workspace — como Master los ves todos.', ruta: '/casos' },
    { icono: 'ti-calendar', texto: 'Chequea tu Agenda para ver los plazos y audiencias más próximos.', ruta: '/agenda' },
    { icono: 'ti-brain', texto: 'Pregúntale a Temis sobre cualquier caso o duda de uso de la app.' },
  ],
  limitado: [
    { icono: 'ti-briefcase', texto: 'Revisa los casos donde te asignaron — solo verás esos.', ruta: '/casos' },
    { icono: 'ti-calendar', texto: 'Chequea tu Agenda para ver tus plazos y tareas pendientes.', ruta: '/agenda' },
    { icono: 'ti-brain', texto: 'Pregúntale a Temis sobre cualquier caso o duda de uso de la app.' },
  ],
}

export function OnboardingModal({
  nombre,
  rol,
  onFinish,
}: {
  nombre: string
  rol: RolUsuario
  onFinish: () => void
}) {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const pasosConfig = PASOS_POR_ROL[rol]
  const primerNombre = nombre.split(' ')[0]

  function irA(ruta?: string) {
    onFinish()
    if (ruta) navigate(ruta)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[16px] bg-surface shadow-2xl">
        <div className="flex-1 overflow-y-auto p-6">
          {paso === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
                <i className="ti ti-brain text-[26px] text-accent" />
              </div>
              <h2 className="text-[18px] font-bold text-ink">¡Hola, {primerNombre}! Soy Temis.</h2>
              <p className="max-w-[400px] text-[13px] leading-relaxed text-muted">
                Soy la asistente de inteligencia artificial de TSADOQ. Te voy a mostrar rápidamente cómo dejar tu cuenta lista
                y qué puedes hacer aquí. Toma menos de un minuto — y si en algún momento tienes dudas, siempre puedes
                preguntarme directamente o revisar el manual desde el botón "Ayuda / Manual" del menú.
              </p>
            </div>
          )}

          {paso === 1 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">Configura tu cuenta</h2>
              <p className="text-[12px] text-muted">Estos son los pasos recomendados para empezar. Puedes hacerlos ahora o después, desde el menú lateral.</p>
              <div className="flex flex-col gap-2">
                {pasosConfig.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => irA(p.ruta)}
                    disabled={!p.ruta}
                    className={`flex items-center gap-3 rounded-[10px] border border-border bg-bg px-3 py-2.5 text-left text-[12px] text-ink transition ${
                      p.ruta ? 'hover:border-accent hover:bg-accent-soft' : 'cursor-default opacity-80'
                    }`}
                  >
                    <i className={`ti ${p.icono} flex-shrink-0 text-[18px] text-accent`} />
                    <span className="flex-1">{p.texto}</span>
                    {p.ruta && <i className="ti ti-chevron-right flex-shrink-0 text-muted" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[16px] font-bold text-ink">Un vistazo rápido a todo el sistema</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MANUAL.filter((s) => s.id !== 'primeros-pasos').map((s) => (
                  <div key={s.id} className="rounded-[10px] border border-border bg-bg p-2.5">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                      <i className={`ti ${s.icono} text-[14px] text-accent`} />
                      {s.titulo}
                    </div>
                    <div className="text-[11px] leading-snug text-mute2">{s.contenido[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-6 py-4">
          <button onClick={onFinish} className="text-[12px] text-mute2 transition hover:text-ink">
            Saltar
          </button>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === paso ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {paso > 0 && (
              <button
                onClick={() => setPaso((p) => p - 1)}
                className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-muted transition hover:bg-soft"
              >
                Atrás
              </button>
            )}
            {paso < 2 ? (
              <button
                onClick={() => setPaso((p) => p + 1)}
                className="rounded-[8px] bg-accent px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="rounded-[8px] bg-accent px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-accent-hover"
              >
                Empezar a usar TSADOQ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
