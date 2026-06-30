import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

function mapSignUpError(message: string): string {
  if (message.includes('already registered') || message.includes('User already registered')) {
    return 'Ya existe una cuenta con este correo. Inicia sesión.'
  }
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return 'No se pudo crear la cuenta. Intenta de nuevo.'
}

export default function Register() {
  const navigate = useNavigate()
  const { session, refreshProfile } = useAuth()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreWorkspace, setNombreWorkspace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function crearWorkspace() {
    const { error: rpcError } = await supabase.rpc('registrar_workspace', {
      p_nombre_workspace: nombreWorkspace,
      p_nombre_usuario: nombre,
    })
    if (rpcError) {
      setError('No se pudo crear el workspace: ' + rpcError.message)
      return false
    }
    await refreshProfile()
    return true
  }

  // Caso 1: ya hay sesión (confirmó el correo) pero todavía no tiene workspace/perfil.
  async function onSubmitCompletar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const ok = await crearWorkspace()
    setLoading(false)
    if (ok) navigate('/dashboard', { replace: true })
  }

  // Caso 2: registro desde cero.
  async function onSubmitNuevo(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setLoading(false)
      setError(mapSignUpError(signUpError.message))
      return
    }

    if (!data.session) {
      // El proyecto requiere confirmación de correo: no hay sesión todavía.
      setLoading(false)
      setInfo('Te enviamos un correo de confirmación. Confírmalo y luego inicia sesión para terminar de crear tu workspace.')
      return
    }

    const ok = await crearWorkspace()
    setLoading(false)
    if (ok) navigate('/dashboard', { replace: true })
  }

  if (session) {
    // Sesión activa sin perfil: solo falta crear el workspace.
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-[380px] rounded-[14px] border border-border bg-surface p-8 shadow-sm">
          <div className="mb-7 text-center">
            <img src="/LOGO.png" alt="TSADOQ" className="mx-auto h-16 w-auto" />
            <h1 className="mt-3 text-[19px] font-bold text-ink">Crea tu workspace</h1>
            <p className="mt-1 text-[12px] text-muted">Un último paso para empezar.</p>
          </div>

          <form onSubmit={onSubmitCompletar} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Tu nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="Andrés Vera"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Nombre del estudio / workspace
              </label>
              <input
                required
                value={nombreWorkspace}
                onChange={(e) => setNombreWorkspace(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="Estudio MJC"
              />
            </div>

            {error && (
              <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-[8px] bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Crear workspace'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px] rounded-[14px] border border-border bg-surface p-8 shadow-sm">
        <div className="mb-7 text-center">
          <img src="/LOGO.png" alt="TSADOQ" className="mx-auto h-16 w-auto" />
          <h1 className="mt-3 text-[19px] font-bold text-ink">Crea tu cuenta</h1>
        </div>

        {info ? (
          <div className="rounded-[6px] border border-accent/20 bg-accent-soft px-3 py-2.5 text-[12px] text-accent">
            {info}
          </div>
        ) : (
          <form onSubmit={onSubmitNuevo} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Tu nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="Andrés Vera"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Nombre del estudio / workspace
              </label>
              <input
                required
                value={nombreWorkspace}
                onChange={(e) => setNombreWorkspace(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="Estudio MJC"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="tu@estudio.ec"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-mute2">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && (
              <div className="rounded-[6px] border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-[8px] bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[12px] text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-accent">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
