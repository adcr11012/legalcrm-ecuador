import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDriveEstado, type DriveEstado } from '@/features/workspace/driveApi'
import { MobileBlock } from '@/components/mobile/MobileBlock'

export default function Drive() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<DriveEstado | null>(null)

  useEffect(() => {
    getDriveEstado().then(setEstado).catch(() => setEstado({ conectado: false, email: null }))
  }, [])

  return (
    <MobileBlock feature="Google Drive">
    <div className="flex flex-1 items-center justify-center p-5">
      <div className="max-w-[380px] text-center">
        <i className="ti ti-brand-google-drive mb-4 block text-[52px] text-mute2" />
        <div className="mb-2 text-[16px] font-semibold text-ink">
          {estado?.conectado ? 'Google Drive conectado' : 'Google Drive no conectado'}
        </div>
        <p className="text-[13px] leading-relaxed text-muted">
          {estado?.conectado
            ? `Todos los documentos que se suban desde cualquier caso se guardan automáticamente en la cuenta de Drive conectada (${estado.email}), organizados en una carpeta por caso.`
            : 'Un administrador debe conectar una cuenta de Google Drive desde Configuración. Una vez conectada, todo lo que se suba en cualquier caso se guardará ahí automáticamente.'}
        </p>
        <button
          onClick={() => navigate('/configuracion')}
          className="mt-5 inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover"
        >
          <i className="ti ti-settings" /> Ir a Configuración
        </button>
      </div>
    </div>
    </MobileBlock>
  )
}
