import { describe, it, expect } from 'vitest'
import { calcolaSuMisura } from '../../src/lib/suMisuraPricing'
import type { SuMisuraConfig } from '../../src/types'

const cfg: SuMisuraConfig = {
  tipo: 'prodotti-su-misura',
  base_price_sqm: 250,
  larghezza_min: 60, larghezza_max: 350,
  altezza_min: 60, altezza_max: 280,
  opzioni: [
    { key: 'colore', label: 'Colore', valori: [
      { value: 'bianco', modifier_type: 'fixed', price_modifier: 0 },
      { value: 'antracite', modifier_type: 'fixed', price_modifier: 80 },
    ] },
    { key: 'vetro', label: 'Vetro', valori: [
      { value: 'triplo', modifier_type: 'percentage', price_modifier: 10 },
    ] },
  ],
}

describe('calcolaSuMisura', () => {
  it('base = superficie × €/mq', () => {
    // 100×100 cm = 1 mq × 250
    const r = calcolaSuMisura(cfg, { larghezza_cm: 100, altezza_cm: 100, scelte: {} })
    expect(r.base).toBe(250)
    expect(r.total).toBe(250)
    expect(r.fuoriListino).toBe(false)
  })

  it('modificatore fixed sommato', () => {
    const r = calcolaSuMisura(cfg, { larghezza_cm: 100, altezza_cm: 100, scelte: { colore: 'antracite' } })
    expect(r.total).toBe(330)
  })

  it('modificatore percentage sul base', () => {
    const r = calcolaSuMisura(cfg, { larghezza_cm: 100, altezza_cm: 100, scelte: { vetro: 'triplo' } })
    expect(r.total).toBe(275) // 250 + 10%
  })

  it('fuori dai limiti dimensionali → fuoriListino true', () => {
    const r = calcolaSuMisura(cfg, { larghezza_cm: 400, altezza_cm: 100, scelte: {} })
    expect(r.fuoriListino).toBe(true)
  })
})
