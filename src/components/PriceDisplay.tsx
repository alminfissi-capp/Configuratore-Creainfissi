interface PriceDisplayProps {
  price: number
  loading: boolean
}

export default function PriceDisplay({ price, loading }: PriceDisplayProps) {
  return (
    <div className="ci-price-box">
      <p className="ci-price-label">Prezzo stimato</p>
      {loading ? (
        <div className="ci-skeleton" style={{ height: '2.5rem', margin: '0.25rem 0' }} />
      ) : (
        <p className="ci-price-value">
          €{price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </p>
      )}
      <p className="ci-price-note">IVA esclusa — preventivo indicativo</p>
    </div>
  )
}
