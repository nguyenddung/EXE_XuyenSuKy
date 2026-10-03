import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { hasAppAccess, readSession } from './hooks/useDemoSession'

// The learning app needs a member or an explicit guest; everyone else signs in first and comes back here.
function RequireSession({ children }: { children: ReactNode }) {
  const location = useLocation()
  return hasAppAccess(readSession()) ? children : <Navigate to="/dang-nhap" replace state={{ from: location }} />
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<HomePage landing />} />
    <Route path="/dang-nhap" element={<LoginPage />} />
    <Route path="/home" element={<RequireSession><HomePage /></RequireSession>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>
}
