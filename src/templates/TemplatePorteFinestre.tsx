import { useState } from 'react'
import type { ProductMapping, ConfigurationData } from '../types'
import { usePriceCalculator } from '../hooks/usePriceCalculator'
import StepWizard from '../components/StepWizard'
import PriceDisplay from '../components/PriceDisplay'

interface TemplatePorteFinestreProps {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

export default function TemplatePorteFinestre({ mapping, onSave }: TemplatePorteFinestreProps) {
  const opts = mapping.allowed_options_json
  const colori = opts.opzioni.find(g => g.key === 'colore')?.values ?? []
  const maniglie = opts.opzioni.find(g => g.key === 'maniglia')?.values ?? []
  const vetri = opts.opzioni.find(g => g.key === 'vetro')?.values ?? []
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState<ConfigurationData>({
    larghezza: opts.larghezza_min,
    altezza: opts.altezza_min,
    colore: colori[0] ?? '',
    maniglia: maniglie[0] ?? '',
    vetro: vetri[0] ?? '',
  })

  const { price, loading: priceLoading } = usePriceCalculator(mapping, config)

  function set(key: keyof ConfigurationData, value: string | number) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const steps = [
    {
      label: 'Misure',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 className="ci-section-title">Inserisci le misure</h2>
          <div>
            <label className="ci-label">Larghezza: {config.larghezza} cm</label>
            <input
              type="range"
              className="ci-slider"
              min={opts.larghezza_min}
              max={opts.larghezza_max}
              value={config.larghezza as number}
              onChange={e => set('larghezza', Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ci-text-muted)', marginTop: '0.25rem' }}>
              <span>{opts.larghezza_min} cm</span>
              <span>{opts.larghezza_max} cm</span>
            </div>
          </div>
          <div>
            <label className="ci-label">Altezza: {config.altezza} cm</label>
            <input
              type="range"
              className="ci-slider"
              min={opts.altezza_min}
              max={opts.altezza_max}
              value={config.altezza as number}
              onChange={e => set('altezza', Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ci-text-muted)', marginTop: '0.25rem' }}>
              <span>{opts.altezza_min} cm</span>
              <span>{opts.altezza_max} cm</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Colore',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="ci-section-title">Scegli il colore</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {colori.map(c => (
              <button
                key={c}
                onClick={() => set('colore', c)}
                className={`ci-option-card${config.colore === c ? ' ci-option-card--selected' : ''}`}
              >
                {c.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: 'Accessori',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 className="ci-section-title">Maniglia e vetro</h2>
          <div>
            <label className="ci-label">Maniglia</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {maniglie.map(m => (
                <button
                  key={m}
                  onClick={() => set('maniglia', m)}
                  className={`ci-option-card${config.maniglia === m ? ' ci-option-card--selected' : ''}`}
                >
                  {m.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="ci-label">Tipo di vetro</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {vetri.map(v => (
                <button
                  key={v}
                  onClick={() => set('vetro', v)}
                  className={`ci-option-card${config.vetro === v ? ' ci-option-card--selected' : ''}`}
                >
                  {v.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Riepilogo',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 className="ci-section-title">Riepilogo configurazione</h2>
          <div className="ci-card" style={{ padding: '1.25rem' }}>
            {Object.entries(config).map(([k, v], i, arr) => (
              <div key={k} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.6rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--ci-border-light)' : 'none',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ci-text-muted)', textTransform: 'capitalize' }}>
                  {k}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Open Sans, sans-serif', color: 'var(--ci-graphite)' }}>
                  {v}{typeof v === 'number' ? ' cm' : ''}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onSave(config, price)}
            disabled={priceLoading}
            className="ci-btn ci-btn--green ci-btn--full"
            style={{ fontSize: '1rem', padding: '1rem 2rem' }}
          >
            Salva preventivo — €{price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
      {/* Sticky price display */}
      <div style={{
        position: 'sticky',
        top: 'var(--topbar-h)',
        background: 'var(--ci-bg)',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        marginBottom: '2rem',
        zIndex: 10,
        borderBottom: '1px solid var(--ci-border-light)',
      }}>
        <PriceDisplay price={price} loading={priceLoading} />
      </div>
      <StepWizard
        steps={steps}
        currentStep={step}
        onNext={() => setStep(s => Math.min(s + 1, steps.length - 1))}
        onPrev={() => setStep(s => Math.max(s - 1, 0))}
        canProceed={true}
      />
    </div>
  )
}
