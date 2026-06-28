import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { FullPageSpinner } from '@/components/FullPageSpinner'

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/register" replace />

  return <Outlet />
}

export function GuestRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (session && profile) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
