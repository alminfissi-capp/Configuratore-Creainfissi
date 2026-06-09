import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductMapping } from '../types'

interface UseProductMappingReturn {
  mapping: ProductMapping | null
  loading: boolean
  error: string | null
}

export function useProductMapping(productId: string | null): UseProductMappingReturn {
  const [mapping, setMapping] = useState<ProductMapping | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) {
      setMapping(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    supabase
      .from('product_mappings')
      .select('*')
      .eq('shopify_product_id', productId)
      .eq('active', true)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(`Prodotto non trovato: ${error.message}`)
          setMapping(null)
        } else {
          setMapping(data as ProductMapping)
        }
        setLoading(false)
      })
  }, [productId])

  return { mapping, loading, error }
}
