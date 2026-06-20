import type { GrigliaConfig, Maggiorazione } from '../types'
import { type PriceResult, type PriceLine, round2 } from './pricingTypes'

export interface GrigliaInput {
  larghezza_mm: number
  altezza_mm: number
  /** scelta per ogni gruppo a scelta singola: { [gruppo.key]: maggiorazione.key } */
  scelteGruppi: Record<string, string>
  /** accessori extra selezionati: { [maggiorazione.key]: quantità } */
  accessoriQta: Record<string, number>
}

/** Lunghezza di riferimento (in metri) per le maggiorazioni a metro lineare. */
function lunghezzaRif(m: Maggiorazione, larghezza_mm: number, altezza_mm: number): number {
  const L = larghezza_mm / 1000
  const H = altezza_mm / 1000
  switch (m.ml_rif) {
    case 'altezza': return H
    case 'perimetro': return 2 * (L + H)
    case 'larghezza':
    default: return L
  }
}

/** Calcola il delta di una singola maggiorazione, dato il prezzo base e le misure. */
function deltaMaggiorazione(
  m: Maggiorazione,
  base: number,
  larghezza_mm: number,
  altezza_mm: number,
  qta: number,
): number {
  switch (m.tipo) {
    case 'fisso': return m.importo
    case 'percentuale': return base * (m.importo / 100)
    case 'mq': return m.importo * (larghezza_mm / 1000) * (altezza_mm / 1000)
    case 'pezzo': return m.importo * qta
    case 'ml': return m.importo * lunghezzaRif(m, larghezza_mm, altezza_mm)
    default: return 0
  }
}

/**
 * Prezzo base da matrice: trova la più piccola soglia >= misura su entrambe le
 * dimensioni. Misure ≤ soglia minima usano la cella minima. Oltre la soglia
 * massima → fuori listino (ritorna null).
 */
function prezzoBaseGriglia(cfg: GrigliaConfig, larghezza_mm: number, altezza_mm: number): number | null {
  const { larghezze, altezze, prezzi } = cfg.griglia
  if (larghezze.length === 0 || altezze.length === 0) return null
  const i = larghezze.findIndex(s => larghezza_mm <= s)
  const j = altezze.findIndex(s => altezza_mm <= s)
  if (i < 0 || j < 0) return null   // oltre la soglia massima → fuori listino
  const riga = prezzi[i]
  if (!riga || riga[j] == null) return null
  return riga[j]
}

export function calcolaGriglia(cfg: GrigliaConfig, input: GrigliaInput): PriceResult {
  const { larghezza_mm, altezza_mm } = input
  const base = prezzoBaseGriglia(cfg, larghezza_mm, altezza_mm)

  if (base == null || larghezza_mm <= 0 || altezza_mm <= 0) {
    return { base: 0, lines: [], total: 0, fuoriListino: true }
  }

  const lines: PriceLine[] = [{ label: 'Prezzo base (griglia)', delta: base }]
  let total = base

  // Gruppi a scelta singola: una maggiorazione attiva per gruppo
  for (const gruppo of cfg.gruppi) {
    const sceltaKey = input.scelteGruppi[gruppo.key]
    if (!sceltaKey) continue
    const m = gruppo.valori.find(v => v.key === sceltaKey)
    if (!m) continue
    const delta = deltaMaggiorazione(m, base, larghezza_mm, altezza_mm, 1)
    total += delta
    lines.push({ label: `${gruppo.label}: ${m.label}`, delta })
  }

  // Accessori extra: scelta multipla con quantità
  for (const m of cfg.accessori_extra) {
    const qta = input.accessoriQta[m.key] ?? 0
    if (qta <= 0) continue
    const delta = deltaMaggiorazione(m, base, larghezza_mm, altezza_mm, qta)
    total += delta
    lines.push({ label: `${m.label}${qta > 1 ? ` ×${qta}` : ''}`, delta })
  }

  return { base, lines, total: round2(total), fuoriListino: false }
}
