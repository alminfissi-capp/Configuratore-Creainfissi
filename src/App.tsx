import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CiHeader from './components/CiHeader'
import CiFooter from './components/CiFooter'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './routes/LoginPage'
import PreventiviPage from './routes/PreventiviPage'
import ConfiguratorPage from './routes/ConfiguratorPage'
import AdminPage from './routes/AdminPage'
import { useAuth } from './hooks/useAuth'

function AppContent() {
  const { session, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ci-bg)', display: 'flex', flexDirection: 'column' }}>
      <CiHeader isLoggedIn={!!session} onLogout={signOut} />
      <main style={{ flex: 1, paddingTop: 'var(--topbar-h)' }}>
        <Routes>
          <Route path="/" element={<ConfiguratorPage />} />
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
                <AdminPage />
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
