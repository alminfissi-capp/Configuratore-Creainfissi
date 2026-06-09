import React from 'react'

interface Step {
  label: string
  content: React.ReactNode
}

interface StepWizardProps {
  steps: Step[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  canProceed: boolean
}

export default function StepWizard({ steps, currentStep, onNext, onPrev, canProceed }: StepWizardProps) {
  const isLast = currentStep === steps.length - 1

  return (
    <div>
      {/* Step progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span className={`ci-step-dot ${
                i < currentStep ? 'ci-step-dot--done' :
                i === currentStep ? 'ci-step-dot--active' :
                'ci-step-dot--inactive'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </span>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '0.8rem',
                fontWeight: i === currentStep ? 600 : 400,
                color: i === currentStep ? 'var(--ci-graphite)' : 'var(--ci-text-muted)',
                display: 'none',
              }}
              className="sm-show"
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ci-step-line ${i < currentStep ? 'ci-step-line--done' : ''}`}
                style={{ flex: 1, margin: '0 0.5rem' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ marginBottom: '2rem' }}>{steps[currentStep].content}</div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="ci-btn ci-btn--outline"
          style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
        >
          ← Indietro
        </button>
        {!isLast && (
          <button
            onClick={onNext}
            disabled={!canProceed}
            className="ci-btn ci-btn--teal"
          >
            Avanti →
          </button>
        )}
      </div>
    </div>
  )
}
