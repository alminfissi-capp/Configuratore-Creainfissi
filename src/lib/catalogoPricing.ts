import type { CatalogoConfig } from '../types'
import { type PriceResult, type PriceLine, round2 } from './pricingTypes'

export interface CatalogoInput {
  /** label delle varianti selezionate */
  variantiSelezionate: string[]
}

/** Prezzo catalogo: prezzo fisso + delta delle varianti selezionate. */
export function calcolaCatalogo(cfg: CatalogoConfig, input: CatalogoInput): PriceResult {
  const base = cfg.prezzo
  const lines: PriceLine[] = [{ label: 'Prezzo', delta: base }]
  let total = base

  for (const label of input.variantiSelezionate) {
    const v = cfg.varianti.find(x => x.label === label)
    if (!v) continue
    total += v.delta
    lines.push({ label: `Variante: ${v.label}`, delta: v.delta })
  }

  return { base, lines, total: round2(total), fuoriListino: false }
}
