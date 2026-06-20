import type { SuMisuraConfig } from '../types'
import { type PriceResult, type PriceLine, round2 } from './pricingTypes'

export interface SuMisuraInput {
  larghezza_cm: number
  altezza_cm: number
  /** scelta per ogni opzione: { [opzione.key]: valore.value } */
  scelte: Record<string, string>
}

/**
 * Prezzo su misura: base = superficie (m²) × €/mq, poi i modificatori delle
 * opzioni scelte (fixed o percentage). Le percentuali sono calcolate sul prezzo
 * base (non a cascata), coerente con la griglia.
 */
export function calcolaSuMisura(cfg: SuMisuraConfig, input: SuMisuraInput): PriceResult {
  const { larghezza_cm, altezza_cm } = input
  const fuori =
    larghezza_cm < cfg.larghezza_min || larghezza_cm > cfg.larghezza_max ||
    altezza_cm < cfg.altezza_min || altezza_cm > cfg.altezza_max

  if (larghezza_cm <= 0 || altezza_cm <= 0 || cfg.base_price_sqm <= 0) {
    return { base: 0, lines: [], total: 0, fuoriListino: true }
  }

  const mq = (larghezza_cm / 100) * (altezza_cm / 100)
  const base = mq * cfg.base_price_sqm
  const lines: PriceLine[] = [{ label: `Prezzo base (${mq.toFixed(3)} mq × €${cfg.base_price_sqm}/mq)`, delta: base }]
  let total = base

  for (const opt of cfg.opzioni) {
    const scelta = input.scelte[opt.key]
    if (!scelta) continue
    const v = opt.valori.find(x => x.value === scelta)
    if (!v) continue
    const delta = v.modifier_type === 'percentage' ? base * (v.price_modifier / 100) : v.price_modifier
    total += delta
    lines.push({ label: `${opt.label}: ${v.value}`, delta })
  }

  return { base: round2(base), lines, total: round2(total), fuoriListino: fuori }
}
