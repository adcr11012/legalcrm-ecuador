import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { obtenerInvitacion, aceptarInvitacion, type InvitacionInfo } from '@/features/usuarios/invitacionesApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { FullPageSpinner } from '@/components/FullPageSpinner'

const inputClass =
  'w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent disabled:opacity-60'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2'

export default function Invite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { session, refreshProfile } = useAuth()

  const [info, setInfo] = useState<InvitacionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info2, setInfo2] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setLoadError(null)
    try {
      const inv = await obtenerInvitacion(token)
      if (!inv) {
        setLoadError('Esta invitación no existe o el link es inválido.')
      } else if (inv.usado) {
        setLoadError('Esta invitación ya fue utilizada.')
      } else if (new Date(inv.expires_at) < new Date()) {
        setLoadError('Esta invitación expiró. Pide al administrador que genere una nueva.')
      } else {
        setInfo(inv)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la invitación.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function finalizar() {
    if (!token) return
    await aceptarInvitacion(token, nombre)
    await refreshProfile()
    navigate('/dashboard', { replace: true })
  }

  // Caso: ya hay sesión activa (login previo) — solo falta unirse al workspace.
  async function onSubmitConSesion(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await finalizar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.')
    } finally {
      setSubmitting(false)
    }
  }

  // Caso: sin sesión — crear cuenta con el correo de la invitación.
  async function onSubmitNuevaCuenta(e: FormEvent) {
    e.preventDefault()
    if (!info) return
    setError(null)
    setInfo2(null)
    setSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: info.email, password })
      if (signUpError) throw signUpError

      if (!data.session) {
        setInfo2('Te enviamos un correo de confirmación. Confírmalo y luego abre este mismo link para terminar de unirte.')
        return
      }
      await finalizar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px] rounded-[14px] border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-[13px] font-bold text-accent">LegalCRM Ecuador</div>
        </div>

        {loadError ? (
          <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{loadError}</div>
        ) : info ? (
          <>
            <h1 className="mb-1 text-center text-[17px] font-bold text-ink">Te invitaron a {info.workspace_nombre}</h1>
            <p className="mb-6 text-center text-[12px] text-muted">
              Como {info.es_admin ? 'administrador' : 'miembro'} · {info.email}
            </p>

            {info2 ? (
              <div className="rounded-[6px] border border-accent/20 bg-accent-soft px-3 py-2.5 text-[12px] text-accent">{info2}</div>
            ) : session ? (
              <form onSubmit={onSubmitConSesion} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Tu nombre</label>
                  <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} placeholder="Tu nombre completo" />
                </div>
                {error && (
                  <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? 'Uniéndome…' : 'Unirme al workspace'}
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmitNuevaCuenta} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Correo</label>
                  <input disabled value={info.email} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tu nombre</label>
                  <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                {error && (
                  <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? 'Creando…' : 'Crear cuenta y unirme'}
                </button>
              </form>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
