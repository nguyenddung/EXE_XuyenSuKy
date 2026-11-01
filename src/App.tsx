import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { TeacherPage } from './pages/TeacherPage'
import { AdminPage } from './pages/AdminPage'
import { hasAppAccess, readSession, roleHome } from './hooks/useDemoSession'
import type { Role } from './lib/school'

// The learning app needs a member or an explicit guest; everyone else signs in first and comes back here.
function RequireSession({ children }: { children: ReactNode }) {
  const location = useLocation()
  return hasAppAccess(readSession()) ? children : <Navigate to="/dang-nhap" replace state={{ from: location }} />
}

// Staff areas need a signed-in account with one of the roles; anyone else goes to their own area.
// This is a demo guard in the browser only; the real check belongs on the server (docs/ARCHITECTURE.md).
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const location = useLocation()
  const session = readSession()
  if (!session.loggedIn) return <Navigate to="/dang-nhap" replace state={{ from: location }} />
  return session.role && roles.includes(session.role) ? children : <Navigate to={roleHome(session)} replace />
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<HomePage landing />} />
    <Route path="/dang-nhap" element={<LoginPage />} />
    <Route path="/home" element={<RequireSession><HomePage /></RequireSession>} />
    <Route path="/giao-vien" element={<RequireRole roles={['teacher', 'admin']}><TeacherPage /></RequireRole>} />
    <Route path="/admin" element={<RequireRole roles={['admin']}><AdminPage /></RequireRole>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>
}
