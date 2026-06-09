import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CiHeader from './components/CiHeader'
import CiFooter from './components/CiFooter'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './routes/LoginPage'
import PreventiviPage from './routes/PreventiviPage'
import { useAuth } from './hooks/useAuth'

function AppContent() {
  const { session, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ci-bg)', display: 'flex', flexDirection: 'column' }}>
      <CiHeader isLoggedIn={!!session} onLogout={signOut} />
      <main style={{ flex: 1, paddingTop: 'var(--topbar-h)' }}>
        <Routes>
          <Route path="/" element={
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--ci-text-muted)' }}>
              CreaInfissi Configuratore — in costruzione
            </div>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/preventivi"
            element={
              <ProtectedRoute>
                <PreventiviPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div className="p-8 text-2xl">Admin Panel — Fase 6</div>
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      <CiFooter />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
