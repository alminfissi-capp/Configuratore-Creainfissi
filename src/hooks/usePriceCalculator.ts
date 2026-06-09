import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ConfigurationData, ProductMapping, PricingRule } from '../types'

interface UsePriceCalculatorReturn {
  price: number
  loading: boolean
}

export function usePriceCalculator(
  mapping: ProductMapping | null,
  config: ConfigurationData
): UsePriceCalculatorReturn {
  const [price, setPrice] = useState(0)
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)

  // Load rules once per category template
  useEffect(() => {
    if (!mapping) {
      setLoading(false)
      return
    }

    supabase
      .from('pricing_rules')
      .select('*')
      .eq('category_template', mapping.category_template)
      .then(({ data }) => {
        setRules((data ?? []) as PricingRule[])
        setLoading(false)
      })
  }, [mapping?.category_template])

  // Recalculate price whenever config or rules change
  useEffect(() => {
    if (!mapping || loading) return

    const mq = (config.larghezza / 100) * (config.altezza / 100)
    let total = mq * mapping.base_price_sqm

    for (const rule of rules) {
      const underscoreIdx = rule.attribute_key.indexOf('_')
      const attributeType = rule.attribute_key.slice(0, underscoreIdx)
      const attributeValue = rule.attribute_key.slice(underscoreIdx + 1)
      const configValue = config[attributeType]

      if (String(configValue) !== attributeValue) continue

      if (rule.modifier_type === 'percentage') {
        total += total * (rule.price_modifier / 100)
      } else {
        total += rule.price_modifier
      }
    }

    setPrice(Math.round(total * 100) / 100)
  }, [mapping, config, rules, loading])

  return { price, loading }
}
