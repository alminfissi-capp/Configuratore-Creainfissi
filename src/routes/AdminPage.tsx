import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductMapping, PricingRule, Quote } from '../types'

type Tab = 'mappings' | 'pricing' | 'quotes'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('mappings')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mappings', label: 'Prodotti & Template' },
    { key: 'pricing', label: 'Regole Prezzo' },
    { key: 'quotes', label: 'Preventivi' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ci-graphite)', marginBottom: '1.5rem' }}>
        Pannello Amministrativo
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--ci-border)', marginBottom: '2rem', gap: '0' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: tab === t.key ? 600 : 400,
              fontSize: '0.875rem',
              color: tab === t.key ? 'var(--ci-teal)' : 'var(--ci-text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--ci-teal)' : '2px solid transparent',
              marginBottom: '-2px',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mappings' && <ProductMappingsTab />}
      {tab === 'pricing' && <PricingRulesTab />}
      {tab === 'quotes' && <QuotesTab />}
    </div>
  )
}

/* ── Product Mappings Tab ── */

function ProductMappingsTab() {
  const [mappings, setMappings] = useState<ProductMapping[]>([])
  const [loading, setLoading] = useState(true)
  const emptyForm = (): Partial<ProductMapping> => ({
    allowed_options_json: {
      colori: [], maniglie: [], vetri: [],
      larghezza_min: 60, larghezza_max: 350,
      altezza_min: 60, altezza_max: 280,
    },
  })
  const [form, setForm] = useState<Partial<ProductMapping>>(emptyForm())

  useEffect(() => {
    loadMappings()
  }, [])

  async function loadMappings() {
    const { data } = await supabase.from('product_mappings').select('*').order('display_name')
    setMappings((data ?? []) as ProductMapping[])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.shopify_product_id || !form.category_template || !form.display_name || !form.base_price_sqm) {
      alert('Compila tutti i campi obbligatori')
      return
    }
    const { error } = await supabase.from('product_mappings').upsert(form as ProductMapping)
    if (error) { alert('Errore: ' + error.message); return }
    setForm(emptyForm())
    loadMappings()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa mappatura?')) return
    await supabase.from('product_mappings').delete().eq('shopify_product_id', id)
    setMappings(m => m.filter(x => x.shopify_product_id !== id))
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="ci-card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ci-graphite)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Aggiungi / Modifica Mappatura
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <input className="ci-input" placeholder="ID Shopify (es. shopify-prod-003)" value={form.shopify_product_id ?? ''} onChange={e => setForm(f => ({ ...f, shopify_product_id: e.target.value }))} />
          <input className="ci-input" placeholder="Nome prodotto" value={form.display_name ?? ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          <input className="ci-input" placeholder="Template (es. porte-finestre)" value={form.category_template ?? ''} onChange={e => setForm(f => ({ ...f, category_template: e.target.value }))} />
          <input className="ci-input" type="number" placeholder="Prezzo base €/mq" value={form.base_price_sqm ?? ''} onChange={e => setForm(f => ({ ...f, base_price_sqm: Number(e.target.value) }))} />
        </div>
        <button onClick={handleSave} className="ci-btn ci-btn--teal" style={{ marginTop: '1rem' }}>
          Salva mappatura
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'var(--ci-bg)' }}>
            <Th>ID Shopify</Th>
            <Th>Nome</Th>
            <Th>Template</Th>
            <Th>€/mq</Th>
            <Th>Azioni</Th>
          </tr>
        </thead>
        <tbody>
          {mappings.map(m => (
            <tr key={m.shopify_product_id}>
              <Td><code style={{ fontSize: '0.75rem' }}>{m.shopify_product_id}</code></Td>
              <Td>{m.display_name}</Td>
              <Td>{m.category_template}</Td>
              <Td>€{m.base_price_sqm}</Td>
              <Td>
                <button onClick={() => handleDelete(m.shopify_product_id)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Elimina
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Pricing Rules Tab ── */

function PricingRulesTab() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const emptyForm = (): Partial<PricingRule> => ({ modifier_type: 'fixed' })
  const [form, setForm] = useState<Partial<PricingRule>>(emptyForm())

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    const { data } = await supabase.from('pricing_rules').select('*').order('category_template')
    setRules((data ?? []) as PricingRule[])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.category_template || !form.attribute_key || form.price_modifier === undefined) {
      alert('Compila tutti i campi')
      return
    }
    const { error } = await supabase.from('pricing_rules').upsert(form as PricingRule)
    if (error) { alert('Errore: ' + error.message); return }
    setForm(emptyForm())
    loadRules()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return
    await supabase.from('pricing_rules').delete().eq('id', id)
    setRules(r => r.filter(x => x.id !== id))
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="ci-card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ci-graphite)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Aggiungi / Modifica Regola
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <input className="ci-input" placeholder="Template (es. porte-finestre)" value={form.category_template ?? ''} onChange={e => setForm(f => ({ ...f, category_template: e.target.value }))} />
          <input className="ci-input" placeholder="Chiave (es. colore_grigio-antracite)" value={form.attribute_key ?? ''} onChange={e => setForm(f => ({ ...f, attribute_key: e.target.value }))} />
          <input className="ci-input" type="number" placeholder="Valore (€ o %)" value={form.price_modifier ?? ''} onChange={e => setForm(f => ({ ...f, price_modifier: Number(e.target.value) }))} />
          <select className="ci-input" value={form.modifier_type} onChange={e => setForm(f => ({ ...f, modifier_type: e.target.value as 'fixed' | 'percentage' }))}>
            <option value="fixed">Fisso (€)</option>
            <option value="percentage">Percentuale (%)</option>
          </select>
        </div>
        <button onClick={handleSave} className="ci-btn ci-btn--teal" style={{ marginTop: '1rem' }}>
          Salva regola
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'var(--ci-bg)' }}>
            <Th>Template</Th>
            <Th>Chiave Attributo</Th>
            <Th>Valore</Th>
            <Th>Tipo</Th>
            <Th>Azioni</Th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id}>
              <Td>{r.category_template}</Td>
              <Td><code style={{ fontSize: '0.75rem' }}>{r.attribute_key}</code></Td>
              <Td style={{ fontFamily: 'Open Sans, sans-serif' }}>{r.price_modifier}{r.modifier_type === 'percentage' ? '%' : '€'}</Td>
              <Td>{r.modifier_type}</Td>
              <Td>
                <button onClick={() => handleDelete(r.id)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Elimina
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Quotes Tab ── */

type QuoteWithProfile = Quote & { profiles: { email: string } | null }

function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*, profiles(email), quote_items(id)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setQuotes((data as QuoteWithProfile[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSkeleton />

  const statusClass: Record<Quote['status'], string> = {
    ACTIVE: 'ci-badge--active',
    EXPIRED: 'ci-badge--expired',
    ORDERED: 'ci-badge--ordered',
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead>
        <tr style={{ background: 'var(--ci-bg)' }}>
          <Th>ID</Th>
          <Th>Email</Th>
          <Th>Totale</Th>
          <Th>Status</Th>
          <Th>Scadenza</Th>
          <Th>Articoli</Th>
        </tr>
      </thead>
      <tbody>
        {quotes.map(q => (
          <tr key={q.id}>
            <Td><code style={{ fontSize: '0.7rem' }}>{q.id.slice(0, 8)}</code></Td>
            <Td>{q.profiles?.email ?? '—'}</Td>
            <Td style={{ fontFamily: 'Open Sans, sans-serif' }}>€{q.total_price.toFixed(2)}</Td>
            <Td>
              <span className={`ci-badge ${statusClass[q.status]}`}>{q.status}</span>
            </Td>
            <Td style={{ fontSize: '0.75rem' }}>{new Date(q.expires_at).toLocaleDateString('it-IT')}</Td>
            <Td style={{ textAlign: 'center' }}>{(q.quote_items as unknown as { id: string }[])?.length ?? 0}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Shared table helpers ── */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ci-text-muted)', textAlign: 'left', padding: '0.625rem 0.75rem', borderBottom: '2px solid var(--ci-border)' }}>
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid var(--ci-border-light)', color: 'var(--ci-text)', ...style }}>
      {children}
    </td>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3].map(i => <div key={i} className="ci-skeleton" style={{ height: '44px', borderRadius: '4px' }} />)}
    </div>
  )
}
