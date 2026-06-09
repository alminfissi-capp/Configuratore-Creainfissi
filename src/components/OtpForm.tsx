import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface OtpFormProps {
  onSuccess: () => void
  sendOtp?: (email: string) => Promise<{ error: Error | null }>
  verifyOtp?: (email: string, token: string) => Promise<{ error: Error | null }>
}

export default function OtpForm({ onSuccess, sendOtp: sendOtpProp, verifyOtp: verifyOtpProp }: OtpFormProps) {
  const auth = useAuth()
  const sendOtp = sendOtpProp ?? auth.sendOtp
  const verifyOtp = verifyOtpProp ?? auth.verifyOtp

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await sendOtp(email)
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await verifyOtp(email, token)
    setLoading(false)
    if (error) { setError(error.message); return }
    onSuccess()
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      {error && (
        <div role="alert" className="ci-alert ci-alert--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="ci-input"
            type="email"
            placeholder="La tua email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="ci-btn ci-btn--teal ci-btn--full"
            disabled={loading || !email}
          >
            {loading ? 'Invio...' : 'Invia codice'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--ci-text-muted)', margin: 0 }}>
            Codice inviato a <strong>{email}</strong>
          </p>
          <input
            className="ci-input"
            type="text"
            inputMode="numeric"
            placeholder="Codice a 6 cifre"
            value={token}
            onChange={e => setToken(e.target.value)}
            maxLength={6}
            required
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="ci-btn ci-btn--teal ci-btn--full"
            disabled={loading || token.length < 6}
          >
            {loading ? 'Verifica...' : 'Verifica'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="ci-btn ci-btn--outline ci-btn--full ci-btn--sm"
          >
            Cambia email
          </button>
        </form>
      )}
    </div>
  )
}
