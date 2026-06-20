import { describe, it, expect } from 'vitest'
import { calcolaCatalogo } from '../../src/lib/catalogoPricing'
import type { CatalogoConfig } from '../../src/types'

const cfg: CatalogoConfig = {
  tipo: 'catalogo-prodotti',
  prezzo: 199,
  varianti: [
    { label: 'Maniglia premium', delta: 30 },
    { label: 'Colore antracite', delta: 50 },
  ],
}

describe('calcolaCatalogo', () => {
  it('prezzo fisso senza varianti', () => {
    const r = calcolaCatalogo(cfg, { variantiSelezionate: [] })
    expect(r.total).toBe(199)
  })

  it('somma i delta delle varianti selezionate', () => {
    const r = calcolaCatalogo(cfg, { variantiSelezionate: ['Maniglia premium', 'Colore antracite'] })
    expect(r.total).toBe(279)
    expect(r.lines).toHaveLength(3)
  })

  it('ignora varianti inesistenti', () => {
    const r = calcolaCatalogo(cfg, { variantiSelezionate: ['Inesistente'] })
    expect(r.total).toBe(199)
  })
})
