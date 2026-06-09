import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminLoginPage() {
  const { session, profile, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null

  if (session && profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenziali non valide. Riprova.')
      setSubmitting(false)
      return
    }

    window.location.href = '/admin'
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="ci-card" style={{ width: '100%', maxWidth: '380px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--ci-teal-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ci-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ci-graphite)', marginBottom: '0.25rem' }}>
            Pannello Admin
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'var(--ci-text-muted)' }}>
            Accesso riservato agli amministratori
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', fontWeight: 500, color: 'var(--ci-text-muted)', marginBottom: '0.3rem' }}>
              Email
            </label>
            <input
              type="email"
              className="ci-input"
              placeholder="admin@creainfissi.it"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', fontWeight: 500, color: 'var(--ci-text-muted)', marginBottom: '0.3rem' }}>
              Password
            </label>
            <input
              type="password"
              className="ci-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="ci-alert ci-alert--error" role="alert" style={{ fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="ci-btn ci-btn--teal ci-btn--full"
            style={{ marginTop: '0.5rem', padding: '0.875rem' }}
          >
            {submitting ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
