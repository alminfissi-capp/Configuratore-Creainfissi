import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { usePriceCalculator } from '../../src/hooks/usePriceCalculator'
import type { ProductMapping, PricingRule, ConfigurationData } from '../../src/types'

const mockMapping: ProductMapping = {
  shopify_product_id: 'shopify-prod-001',
  category_template: 'porte-finestre',
  display_name: 'Porta Finestra Classica PVC',
  base_price_sqm: 250,
  allowed_options_json: {
    colori: ['bianco', 'grigio-antracite'],
    maniglie: ['maniglia-std', 'maniglia-premium'],
    vetri: ['vetro-base'],
    larghezza_min: 60,
    larghezza_max: 350,
    altezza_min: 60,
    altezza_max: 280,
  },
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const mockRules = vi.hoisted<PricingRule[]>(() => [
  {
    id: '1',
    category_template: 'porte-finestre',
    attribute_key: 'colore_grigio-antracite',
    price_modifier: 15,
    modifier_type: 'percentage',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    category_template: 'porte-finestre',
    attribute_key: 'maniglia_maniglia-premium',
    price_modifier: 85,
    modifier_type: 'fixed',
    created_at: '2026-01-01T00:00:00Z',
  },
])

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockRules, error: null }),
      }),
    }),
  },
}))

describe('usePriceCalculator', () => {
  const baseConfig: ConfigurationData = {
    larghezza: 100,
    altezza: 150,
    colore: 'bianco',
    maniglia: 'maniglia-std',
    vetro: 'vetro-base',
  }

  it('calcola prezzo base corretto (mq × base_price_sqm)', async () => {
    const { result } = renderHook(() => usePriceCalculator(mockMapping, baseConfig))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // 1m × 1.5m = 1.5 mq × 250 = 375
    expect(result.current.price).toBe(375)
  })

  it('applica ricarico percentuale per colore grigio-antracite', async () => {
    const config = { ...baseConfig, colore: 'grigio-antracite' }
    const { result } = renderHook(() => usePriceCalculator(mockMapping, config))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // 375 + 15% = 375 * 1.15 = 431.25
    expect(result.current.price).toBeCloseTo(431.25)
  })

  it('applica ricarico fisso per maniglia premium', async () => {
    const config = { ...baseConfig, maniglia: 'maniglia-premium' }
    const { result } = renderHook(() => usePriceCalculator(mockMapping, config))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // 375 + 85 = 460
    expect(result.current.price).toBe(460)
  })
})
