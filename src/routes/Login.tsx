import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { VideoLogoModal } from '@/components/VideoLogoModal'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (message.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.'
  return 'Ocurrió un error al iniciar sesión. Intenta de nuevo.'
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoAbierto, setVideoAbierto] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(mapAuthError(error.message))
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-y-auto bg-bg px-4 py-8">
      <div className="w-full max-w-[380px] rounded-[14px] border border-border bg-surface p-8 shadow-sm">
        <div className="mb-7 text-center">
          <button onClick={() => setVideoAbierto(true)} title="Ver video de TSADOQ" className="mx-auto block">
            <img src="/LOGO_1.png" alt="TSADOQ" className="logo-claro mx-auto h-16 w-auto object-contain" />
            <img src="/LOGO_2.png" alt="TSADOQ" className="logo-oscuro mx-auto h-16 w-auto object-contain" />
          </button>
          <div className="texto-marca mt-2 text-[22px] font-bold uppercase tracking-wide">TSADOQ</div>
          <h1 className="mt-3 text-[19px] font-bold text-ink">Iniciar sesión</h1>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[8px] border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-accent"
              placeholder="••••••••"
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
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-accent">
            Crea tu workspace
          </Link>
        </p>
      </div>
      <VideoLogoModal open={videoAbierto} onClose={() => setVideoAbierto(false)} src="/v_tsadoq_2.mp4" />
    </div>
  )
}
