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
const Buscar          = lazy(() => import('@/routes/Buscar'))
const Ayuda           = lazy(() => import('@/routes/Ayuda'))
const Soporte         = lazy(() => import('@/routes/Soporte'))
const CalculadoraLaboral = lazy(() => import('@/routes/CalculadoraLaboral'))
const Anuncios        = lazy(() => import('@/routes/Anuncios'))
const Usuarios        = lazy(() => import('@/routes/Usuarios'))
const Invite          = lazy(() => import('@/routes/Invite'))
const Configuracion   = lazy(() => import('@/routes/Configuracion'))
const Drive           = lazy(() => import('@/routes/Drive'))
const DriveOAuthCallback = lazy(() => import('@/routes/DriveOAuthCallback'))
const AdminLayout        = lazy(() => import('@/routes/admin/AdminLayout'))
const AdminDashboard     = lazy(() => import('@/routes/admin/AdminDashboard'))
const AdminWorkspaces    = lazy(() => import('@/routes/admin/AdminWorkspaces'))
const AdminWorkspaceDetail = lazy(() => import('@/routes/admin/AdminWorkspaceDetail'))
const AdminBilling         = lazy(() => import('@/routes/admin/AdminBilling'))
const AdminEsatje          = lazy(() => import('@/routes/admin/AdminEsatje'))
const AdminSoporte         = lazy(() => import('@/routes/admin/AdminSoporte'))
const AdminLaboral         = lazy(() => import('@/routes/admin/AdminLaboral'))

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
                <Route path="/buscar" element={<Buscar />} />
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="/soporte" element={<Soporte />} />
                <Route path="/calculadora-laboral" element={<CalculadoraLaboral />} />
                <Route path="/anuncios" element={<Anuncios />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/drive" element={<Drive />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Route>
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="workspaces" element={<AdminWorkspaces />} />
              <Route path="workspaces/:id" element={<AdminWorkspaceDetail />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="esatje" element={<AdminEsatje />} />
              <Route path="soporte" element={<AdminSoporte />} />
              <Route path="laboral" element={<AdminLaboral />} />
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
