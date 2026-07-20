import { useCallback, useEffect, useState } from 'react'
import { getDriveEstado } from '@/features/workspace/driveApi'
import { getGroqEstado } from '@/features/workspace/groqApi'

// Drive y Groq son los únicos requisitos que bloquean el aviso — sin Drive
// no hay dónde guardar documentos, sin Groq no funciona Temis. OpenRouter
// (visión) y las etapas del Kanban se muestran en el mismo asistente pero
// son opcionales/ya vienen con default, así que no bloquean nada.
export function useSetupInicial(activo: boolean) {
  const [driveConectado, setDriveConectado] = useState(false)
  const [groqConectado, setGroqConectado] = useState(false)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    if (!activo) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getDriveEstado().then((e) => e.conectado).catch(() => false),
      getGroqEstado().then((e) => e.conectado).catch(() => false),
    ]).then(([drive, groq]) => {
      setDriveConectado(drive)
      setGroqConectado(groq)
      setLoading(false)
    })
  }, [activo])

  useEffect(() => {
    refetch()
  }, [refetch])

  const pendiente = activo && !loading && (!driveConectado || !groqConectado)

  return { driveConectado, groqConectado, loading, pendiente, refetch }
}
