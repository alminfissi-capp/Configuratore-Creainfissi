export interface UserProfile {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export interface OptionGroup {
  key: string      // config key + pricing rule prefix, e.g. "colore"
  label: string    // shown to user, e.g. "Colore"
  values: string[] // e.g. ["bianco", "grigio-antracite"]
}

export type TipoListino = 'griglia' | 'catalogo-prodotti' | 'prodotti-su-misura'

export interface AllowedOptions {
  tipo?: TipoListino
  opzioni: OptionGroup[]
  larghezza_min: number
  larghezza_max: number
  altezza_min: number
  altezza_max: number
}

export interface ProductMapping {
  shopify_product_id: string
  category_template: string
  display_name: string
  base_price_sqm: number
  allowed_options_json: AllowedOptions
  active: boolean
  created_at: string
}

export interface PricingRule {
  id: string
  category_template: string
  attribute_key: string      // pattern: {key}_{value} e.g. "colore_grigio-antracite"
  price_modifier: number
  modifier_type: 'fixed' | 'percentage'
  created_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  shopify_product_id: string
  category_template: string
  configuration_json: ConfigurationData
  item_price: number
  created_at: string
}

export interface Quote {
  id: string
  user_id: string
  status: 'ACTIVE' | 'EXPIRED' | 'ORDERED'
  total_price: number
  expires_at: string
  shopify_draft_order_id: string | null
  shopify_invoice_url: string | null
  created_at: string
  updated_at: string
  quote_items?: QuoteItem[]
}

export interface ConfigurationData {
  larghezza: number
  altezza: number
  [key: string]: string | number
}
