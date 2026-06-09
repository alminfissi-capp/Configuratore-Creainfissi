import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductMapping } from '../../src/hooks/useProductMapping'
import type { ProductMapping } from '../../src/types'

const mockMapping: ProductMapping = {
  shopify_product_id: 'shopify-prod-001',
  category_template: 'porte-finestre',
  display_name: 'Porta Finestra Classica PVC',
  base_price_sqm: 250,
  allowed_options_json: {
    colori: ['bianco', 'grigio-antracite'],
    maniglie: ['maniglia-std', 'maniglia-premium'],
    vetri: ['vetro-base', 'vetro-camera'],
    larghezza_min: 60,
    larghezza_max: 350,
    altezza_min: 60,
    altezza_max: 280,
  },
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const { mockSingle } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    }),
  },
}))

describe('useProductMapping', () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: mockMapping, error: null })
  })

  it('restituisce loading:true inizialmente', () => {
    const { result } = renderHook(() => useProductMapping('shopify-prod-001'))
    expect(result.current.loading).toBe(true)
    expect(result.current.mapping).toBeNull()
  })

  it('carica il mapping corretto per product_id valido', async () => {
    const { result } = renderHook(() => useProductMapping('shopify-prod-001'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.mapping).toEqual(mockMapping)
    expect(result.current.error).toBeNull()
  })

  it('restituisce mapping:null e error se product_id è null', async () => {
    const { result } = renderHook(() => useProductMapping(null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.mapping).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
