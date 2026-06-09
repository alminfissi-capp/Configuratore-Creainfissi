import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useProductMapping } from '../hooks/useProductMapping'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TemplateRegistry from '../templates/TemplateRegistry'
import OtpForm from '../components/OtpForm'
import type { ConfigurationData } from '../types'

export default function ConfiguratorPage() {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product_id')
  const navigate = useNavigate()
  const { mapping, loading, error } = useProductMapping(productId)
  const { session, profile } = useAuth()
  const [showOtp, setShowOtp] = useState(false)
  const [pendingConfig, setPendingConfig] = useState<{ config: ConfigurationData; price: number } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!productId) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--ci-text-muted)', marginBottom: '1rem' }}>
          Nessun prodotto selezionato.
        </p>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)' }}>
          Torna su <a href="https://creainfissi.it" style={{ color: 'var(--ci-teal)' }}>creainfissi.it</a> e seleziona un prodotto.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
        <div className="ci-skeleton" style={{ height: '80px', borderRadius: '8px' }} />
        <div className="ci-skeleton" style={{ height: '200px', borderRadius: '8px' }} />
      </div>
    )
  }

  if (error || !mapping) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="ci-alert ci-alert--error" style={{ maxWidth: '500px', margin: '0 auto' }}>
          {error ?? 'Prodotto non trovato. Controlla il link e riprova.'}
        </div>
      </div>
    )
  }

  async function saveQuote(config: ConfigurationData, price: number) {
    if (!session || !profile) {
      setPendingConfig({ config, price })
      setShowOtp(true)
      return
    }
    await persistQuote(config, price, profile.id)
  }

  async function persistQuote(config: ConfigurationData, price: number, userId: string) {
    if (!mapping) return
    setSaving(true)

    // Check for existing ACTIVE quote
    const { data: activeQuotes } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)

    let quoteId: string

    if (activeQuotes && activeQuotes.length > 0) {
      const addToExisting = window.confirm(
        `Hai già un preventivo aperto. Vuoi aggiungere questo infisso al preventivo esistente?`
      )
      if (addToExisting) {
        quoteId = activeQuotes[0].id as string
      } else {
        quoteId = await createNewQuote(userId, price)
      }
    } else {
      quoteId = await createNewQuote(userId, price)
    }

    await supabase.from('quote_items').insert({
      quote_id: quoteId,
      shopify_product_id: mapping.shopify_product_id,
      category_template: mapping.category_template,
      configuration_json: config,
      item_price: price,
    })

    // Recalculate quote total from all items
    const { data: items } = await supabase
      .from('quote_items')
      .select('item_price')
      .eq('quote_id', quoteId)

    const newTotal = (items ?? []).reduce((sum: number, i: { item_price: number }) => sum + i.item_price, 0)
    await supabase.from('quotes').update({ total_price: newTotal }).eq('id', quoteId)

    setSaving(false)
    navigate('/preventivi')
  }

  async function createNewQuote(userId: string, price: number): Promise<string> {
    const { data } = await supabase
      .from('quotes')
      .insert({ user_id: userId, total_price: price })
      .select('id')
      .single()
    return (data as { id: string }).id
  }

  if (saving) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="ci-skeleton" style={{ width: '200px', height: '24px', margin: '0 auto' }} />
        <p style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--ci-text-muted)', marginTop: '1rem' }}>
          Salvataggio preventivo in corso...
        </p>
      </div>
    )
  }

  if (showOtp) {
    return (
      <div style={{ padding: '2rem 1.5rem', maxWidth: '480px', margin: '0 auto' }}>
        <div className="ci-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.125rem', fontWeight: 700, color: 'var(--ci-graphite)', marginBottom: '0.5rem' }}>
            Accedi per salvare il preventivo
          </h2>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)', marginBottom: '1.5rem' }}>
            Inserisci la tua email per ricevere il codice di accesso.
          </p>
          <OtpForm
            onSuccess={() => {
              setShowOtp(false)
              if (pendingConfig && profile) {
                persistQuote(pendingConfig.config, pendingConfig.price, profile.id)
              }
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--ci-bg)', minHeight: '100vh' }}>
      <div style={{ borderBottom: '1px solid var(--ci-border)', background: 'var(--ci-white)', padding: '1.25rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ci-graphite)', margin: 0 }}>
          {mapping.display_name}
        </h1>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)', margin: '0.25rem 0 0' }}>
          Configura il tuo serramento
        </p>
      </div>
      <TemplateRegistry mapping={mapping} onSave={saveQuote} />
    </div>
  )
}
