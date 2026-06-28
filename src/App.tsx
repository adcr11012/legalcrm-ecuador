import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/routes/Login'
import Register from '@/routes/Register'
import Dashboard from '@/routes/Dashboard'
import Casos from '@/routes/Casos'
import Clientes from '@/routes/Clientes'
import ClienteDetalle from '@/routes/ClienteDetalle'
import Agenda from '@/routes/Agenda'
import Usuarios from '@/routes/Usuarios'
import Invite from '@/routes/Invite'
import Configuracion from '@/routes/Configuracion'
import Drive from '@/routes/Drive'
import DriveOAuthCallback from '@/routes/DriveOAuthCallback'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
              <Route path="/clientes/:id" element={<ClienteDetalle />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/drive" element={<Drive />} />
              <Route path="/configuracion" element={<Configuracion />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
