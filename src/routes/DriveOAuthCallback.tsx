import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completarConexionDrive } from '@/features/workspace/driveApi'
import { FullPageSpinner } from '@/components/FullPageSpinner'

export default function DriveOAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError('Autorización cancelada o rechazada.')
      return
    }
    if (!code) {
      setError('Falta el código de autorización en la URL.')
      return
    }

    completarConexionDrive(code)
      .then(() => navigate('/configuracion', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo conectar Google Drive.'))
  }, [params, navigate])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center overflow-y-auto bg-bg px-4 py-8">
        <div className="w-full max-w-[380px] rounded-[14px] border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mb-3 text-[14px] font-semibold text-danger">No se pudo conectar Google Drive</div>
          <p className="mb-5 text-[13px] text-muted">{error}</p>
          <button
            onClick={() => navigate('/configuracion', { replace: true })}
            className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover"
          >
            Volver a Configuración
          </button>
        </div>
      </div>
    )
  }

  return <FullPageSpinner />
}
