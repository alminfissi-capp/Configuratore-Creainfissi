import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import OtpForm from '../components/OtpForm'

export default function LoginPage() {
  const { session } = useAuth()

  if (session) {
    return <Navigate to="/preventivi" replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ci-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="ci-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ci-graphite)', marginBottom: '0.5rem', textAlign: 'center' }}>
          Accedi al tuo account
        </h1>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
          Riceverai un codice via email per accedere senza password
        </p>
        <OtpForm onSuccess={() => window.location.href = '/preventivi'} />
      </div>
    </div>
  )
}
