import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

const Login           = lazy(() => import('@/routes/Login'))
const Register        = lazy(() => import('@/routes/Register'))
const Dashboard       = lazy(() => import('@/routes/Dashboard'))
const Casos           = lazy(() => import('@/routes/Casos'))
const Clientes        = lazy(() => import('@/routes/Clientes'))
const Agenda          = lazy(() => import('@/routes/Agenda'))
const Usuarios        = lazy(() => import('@/routes/Usuarios'))
const Invite          = lazy(() => import('@/routes/Invite'))
const Configuracion   = lazy(() => import('@/routes/Configuracion'))
const Drive           = lazy(() => import('@/routes/Drive'))
const DriveOAuthCallback = lazy(() => import('@/routes/DriveOAuthCallback'))

function PageLoader() {
  return <div className="flex h-full flex-1 items-center justify-center text-[13px] text-muted">Cargando…</div>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route path="/invite/:token" element={<Invite />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/drive/oauth-callback" element={<DriveOAuthCallback />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/casos" element={<Casos />} />
                <Route path="/casos/:id" element={<Casos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<Clientes />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/drive" element={<Drive />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
