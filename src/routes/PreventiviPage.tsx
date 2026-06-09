import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Quote } from '../types'

export default function PreventiviPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes((data ?? []) as Quote[])
        setLoading(false)
      })
  }, [profile])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const statusLabel: Record<Quote['status'], string> = {
    ACTIVE: 'Attivo',
    EXPIRED: 'Scaduto',
    ORDERED: 'Ordinato',
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ci-graphite)', margin: 0 }}>
            I miei preventivi
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)', marginTop: '0.25rem' }}>
            {profile?.email}
          </p>
        </div>
        <button onClick={handleSignOut} className="ci-btn ci-btn--outline ci-btn--sm">
          Esci
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="ci-skeleton" style={{ height: '100px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="ci-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--ci-text-muted)' }}>
            Nessun preventivo salvato ancora.
          </p>
          <button onClick={() => navigate('/')} className="ci-btn ci-btn--teal" style={{ marginTop: '1rem' }}>
            Configura il tuo primo prodotto
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {quotes.map(q => (
            <div key={q.id} className="ci-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className={`ci-badge ci-badge--${q.status.toLowerCase() as 'active' | 'expired' | 'ordered'}`}>
                    {statusLabel[q.status]}
                  </span>
                  <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '1.5rem', fontWeight: 300, color: 'var(--ci-graphite)', margin: '0.5rem 0 0' }}>
                    €{q.total_price.toFixed(2)}
                  </p>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', color: 'var(--ci-text-muted)', margin: '0.25rem 0 0' }}>
                    {q.quote_items?.length ?? 0} articol{(q.quote_items?.length ?? 0) === 1 ? 'o' : 'i'}
                    {' · '}
                    Creato il {new Date(q.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  {q.status === 'ACTIVE' && (
                    <button className="ci-btn ci-btn--green ci-btn--sm">
                      Procedi all'acquisto
                    </button>
                  )}
                  {q.shopify_invoice_url && (
                    <a href={q.shopify_invoice_url} className="ci-btn ci-btn--teal ci-btn--sm">
                      Completa il pagamento
                    </a>
                  )}
                  {q.status === 'EXPIRED' && (
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', color: 'var(--ci-text-muted)' }}>
                      Scaduto il {new Date(q.expires_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
