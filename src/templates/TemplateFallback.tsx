interface TemplateFallbackProps {
  template: string
}

export default function TemplateFallback({ template }: TemplateFallbackProps) {
  return (
    <div className="ci-card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem auto', maxWidth: '500px' }}>
      <p style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--ci-text-muted)', marginBottom: '0.5rem' }}>
        Template <strong>"{template}"</strong> non ancora disponibile.
      </p>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)' }}>
        Contatta il supporto o seleziona un altro prodotto.
      </p>
    </div>
  )
}
