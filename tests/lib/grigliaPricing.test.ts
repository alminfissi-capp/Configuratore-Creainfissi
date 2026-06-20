import { describe, it, expect } from 'vitest'
import { calcolaGriglia } from '../../src/lib/grigliaPricing'
import type { GrigliaConfig } from '../../src/types'

const cfg: GrigliaConfig = {
  tipo: 'griglia',
  unita: 'mm',
  griglia: {
    larghezze: [800, 1200, 1600],
    altezze: [1000, 1400],
    prezzi: [
      [100, 140],
      [160, 200],
      [220, 260],
    ],
  },
  gruppi: [
    {
      key: 'vetro', label: 'Vetro', valori: [
        { key: 'doppio', label: 'Doppio', tipo: 'fisso', importo: 50 },
        { key: 'triplo', label: 'Triplo', tipo: 'percentuale', importo: 10 },
      ],
    },
  ],
  accessori_extra: [
    { key: 'maniglia', label: 'Maniglia', tipo: 'pezzo', importo: 15 },
    { key: 'guarniz', label: 'Guarnizione', tipo: 'ml', importo: 8, ml_rif: 'perimetro' },
    { key: 'pellicola', label: 'Pellicola', tipo: 'mq', importo: 20 },
  ],
}

const noScelte = { scelteGruppi: {}, accessoriQta: {} }

describe('calcolaGriglia — prezzo base da matrice', () => {
  it('arrotonda alla soglia superiore su entrambe le dimensioni', () => {
    // 900×1100 → larghezza soglia 1200 (i=1), altezza soglia 1400 (j=1) → 200
    const r = calcolaGriglia(cfg, { larghezza_mm: 900, altezza_mm: 1100, ...noScelte })
    expect(r.base).toBe(200)
    expect(r.total).toBe(200)
    expect(r.fuoriListino).toBe(false)
  })

  it('misure ≤ soglia minima usano la cella minima', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 500, altezza_mm: 600, ...noScelte })
    expect(r.base).toBe(100)
  })

  it('esattamente sulla soglia massima è ancora dentro', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 1600, altezza_mm: 1400, ...noScelte })
    expect(r.base).toBe(260)
  })

  it('oltre la soglia massima → fuori listino', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 1601, altezza_mm: 1000, ...noScelte })
    expect(r.fuoriListino).toBe(true)
    expect(r.total).toBe(0)
  })
})

describe('calcolaGriglia — maggiorazioni', () => {
  it('gruppo fisso somma importo', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 800, altezza_mm: 1000, scelteGruppi: { vetro: 'doppio' }, accessoriQta: {} })
    expect(r.total).toBe(150) // 100 + 50
  })

  it('percentuale è calcolata sul base, non a cascata', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 800, altezza_mm: 1000, scelteGruppi: { vetro: 'triplo' }, accessoriQta: {} })
    expect(r.total).toBe(110) // 100 + 10%
  })

  it('pezzo moltiplica per quantità', () => {
    const r = calcolaGriglia(cfg, { larghezza_mm: 800, altezza_mm: 1000, scelteGruppi: {}, accessoriQta: { maniglia: 2 } })
    expect(r.total).toBe(130) // 100 + 15×2
  })

  it('ml su perimetro usa 2×(L+H) in metri', () => {
    // 800×1000 mm → perimetro = 2×(0.8+1.0) = 3.6 m → 8×3.6 = 28.8
    const r = calcolaGriglia(cfg, { larghezza_mm: 800, altezza_mm: 1000, scelteGruppi: {}, accessoriQta: { guarniz: 1 } })
    expect(r.total).toBe(128.8)
  })

  it('mq usa la superficie reale in m²', () => {
    // 800×1000 mm → 0.8 m² → 20×0.8 = 16
    const r = calcolaGriglia(cfg, { larghezza_mm: 800, altezza_mm: 1000, scelteGruppi: {}, accessoriQta: { pellicola: 1 } })
    expect(r.total).toBe(116)
  })

  it('somma più maggiorazioni con dettaglio per riga', () => {
    const r = calcolaGriglia(cfg, {
      larghezza_mm: 800, altezza_mm: 1000,
      scelteGruppi: { vetro: 'doppio' }, accessoriQta: { maniglia: 1 },
    })
    expect(r.total).toBe(165) // 100 + 50 + 15
    expect(r.lines).toHaveLength(3) // base + vetro + maniglia
  })
})
