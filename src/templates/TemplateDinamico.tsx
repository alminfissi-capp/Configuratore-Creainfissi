import { useState } from 'react'
import type { ProductMapping, ConfigurationData } from '../types'
import { usePriceCalculator } from '../hooks/usePriceCalculator'
import StepWizard from '../components/StepWizard'
import PriceDisplay from '../components/PriceDisplay'

interface Props {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

export default function TemplateDinamico({ mapping, onSave }: Props) {
  const opts = mapping.allowed_options_json

  const initialConfig: ConfigurationData = {
    larghezza: opts.larghezza_min,
    altezza: opts.altezza_min,
    ...Object.fromEntries((opts.opzioni ?? []).map(g => [g.key, g.values[0] ?? ''])),
  }

  const [step, setStep] = useState(0)
  const [config, setConfig] = useState<ConfigurationData>(initialConfig)
  const { price, loading: priceLoading } = usePriceCalculator(mapping, config)

  function set(key: string, value: string | number) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const misureStep = {
    label: 'Misure',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 className="ci-section-title">Inserisci le misure</h2>
        {(['larghezza', 'altezza'] as const).map(dim => {
          const min = opts[`${dim}_min`]
          const max = opts[`${dim}_max`]
          return (
            <div key={dim}>
              <label className="ci-label" style={{ textTransform: 'capitalize' }}>
                {dim}: {config[dim]} cm
              </label>
              <input
                type="range"
                className="ci-slider"
                min={min}
                max={max}
                value={config[dim] as number}
                onChange={e => set(dim, Number(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ci-text-muted)', marginTop: '0.25rem' }}>
                <span>{min} cm</span>
                <span>{max} cm</span>
              </div>
            </div>
          )
        })}
      </div>
    ),
  }

  const opzioniSteps = (opts.opzioni ?? []).map(gruppo => ({
    label: gruppo.label,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 className="ci-section-title">{gruppo.label}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {gruppo.values.map(v => (
            <button
              key={v}
              onClick={() => set(gruppo.key, v)}
              className={`ci-option-card${config[gruppo.key] === v ? ' ci-option-card--selected' : ''}`}
            >
              {v.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    ),
  }))

  const riepilogoStep = {
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
  }

  const steps = [misureStep, ...opzioniSteps, riepilogoStep]

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
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
