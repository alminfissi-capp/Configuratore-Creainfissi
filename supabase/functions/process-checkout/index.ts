import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN')!
const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { quoteId } = await req.json()
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'Missing quoteId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Load quote + items using service role (bypasses RLS for server-side ops)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: quote, error: quoteError } = await serviceClient
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('id', quoteId)
      .eq('user_id', user.id)   // still enforce ownership server-side
      .single()

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: 'Preventivo non trovato' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (quote.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Solo i preventivi ACTIVE possono essere convertiti in ordine' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Server-side price recalculation (anti-tampering)
    const { data: allRules } = await serviceClient.from('pricing_rules').select('*')
    const { data: allMappings } = await serviceClient.from('product_mappings').select('*')

    let recalculatedTotal = 0
    const lineItems: { title: string; price: string; quantity: number; requires_shipping: boolean }[] = []

    for (const item of quote.quote_items) {
      const mapping = allMappings?.find(
        (m: { shopify_product_id: string }) => m.shopify_product_id === item.shopify_product_id
      )
      if (!mapping) {
        return new Response(JSON.stringify({ error: `Prodotto non trovato: ${item.shopify_product_id}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const cfg = item.configuration_json
      const mq = (cfg.larghezza / 100) * (cfg.altezza / 100)
      let itemPrice = mq * mapping.base_price_sqm

      const categoryRules = (allRules ?? []).filter(
        (r: { category_template: string }) => r.category_template === item.category_template
      )

      for (const rule of categoryRules) {
        const underscoreIdx = rule.attribute_key.indexOf('_')
        const attrType = rule.attribute_key.slice(0, underscoreIdx)
        const attrValue = rule.attribute_key.slice(underscoreIdx + 1)
        if (String(cfg[attrType]) !== attrValue) continue
        if (rule.modifier_type === 'percentage') {
          itemPrice += itemPrice * (rule.price_modifier / 100)
        } else {
          itemPrice += rule.price_modifier
        }
      }

      itemPrice = Math.round(itemPrice * 100) / 100
      recalculatedTotal += itemPrice

      const configSummary = Object.entries(cfg as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')

      lineItems.push({
        title: `${mapping.display_name} — ${configSummary}`,
        price: itemPrice.toFixed(2),
        quantity: 1,
        requires_shipping: true,
      })
    }

    // 4. Load user profile for Shopify customer email
    const { data: profileData } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // 5. Create Shopify Draft Order
    const shopifyPayload = {
      draft_order: {
        line_items: lineItems,
        customer: { email: profileData?.email },
        note: `Preventivo CreaInfissi #${quoteId}`,
        tags: 'configuratore,preventivo',
      },
    }

    const shopifyRes = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopifyPayload),
      }
    )

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text()
      return new Response(JSON.stringify({ error: `Shopify error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { draft_order } = await shopifyRes.json()

    // 6. Update quote with Shopify data
    await serviceClient
      .from('quotes')
      .update({
        status: 'ORDERED',
        shopify_draft_order_id: String(draft_order.id),
        shopify_invoice_url: draft_order.invoice_url,
        total_price: Math.round(recalculatedTotal * 100) / 100,
      })
      .eq('id', quoteId)

    return new Response(
      JSON.stringify({ invoice_url: draft_order.invoice_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
