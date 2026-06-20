/** Dettaglio condiviso restituito da tutti i calcolatori di prezzo. */
export interface PriceLine {
  label: string
  delta: number   // contributo in € (può essere il base o una maggiorazione)
}

export interface PriceResult {
  base: number
  lines: PriceLine[]   // include la riga base + ogni maggiorazione
  total: number
  fuoriListino: boolean
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
