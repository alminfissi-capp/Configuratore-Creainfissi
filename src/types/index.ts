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

/* ══════════════════════════════════════════════════════════════
   PRODOTTI (card dentro un listino)
   Il tipo vive sul listino; ogni prodotto porta la propria
   configurazione in config_json, la cui forma dipende dal tipo
   del listino padre.
══════════════════════════════════════════════════════════════ */

export interface Prodotto {
  id: string
  listino_id: string
  nome: string
  slug: string
  image_url: string | null
  pdf_url: string | null
  ordinamento: number
  config_json: ProdottoConfig
  active: boolean
  created_at: string
}

export type ProdottoConfig = CatalogoConfig | GrigliaConfig | SuMisuraConfig

// ── Catalogo: prezzo fisso, eventuali varianti ──
export interface CatalogoVariante {
  label: string
  delta: number   // scostamento in € rispetto al prezzo base
}
export interface CatalogoConfig {
  tipo: 'catalogo-prodotti'
  prezzo: number
  varianti: CatalogoVariante[]
}

// ── Griglia: matrice prezzi per misura (mm) + maggiorazioni ──
export type MaggiorazioneTipo = 'fisso' | 'percentuale' | 'mq' | 'pezzo' | 'ml'

export interface Maggiorazione {
  key: string
  label: string
  tipo: MaggiorazioneTipo
  importo: number
  ml_rif?: 'larghezza' | 'altezza' | 'perimetro'  // solo se tipo === 'ml'
}

export interface Gruppo {
  key: string
  label: string
  valori: Maggiorazione[]   // scelta singola
}

export interface GrigliaConfig {
  tipo: 'griglia'
  unita: 'mm'
  griglia: {
    larghezze: number[]   // soglie crescenti (righe), mm
    altezze: number[]     // soglie crescenti (colonne), mm
    prezzi: number[][]    // prezzi[indiceLarghezza][indiceAltezza], €
  }
  gruppi: Gruppo[]                  // scelta singola per gruppo
  accessori_extra: Maggiorazione[]  // scelta multipla
}

// ── Su misura: €/mq + opzioni configurabili con modificatori ──
export interface SuMisuraValore {
  value: string
  modifier_type: 'fixed' | 'percentage'
  price_modifier: number
}
export interface SuMisuraOpzione {
  key: string
  label: string
  valori: SuMisuraValore[]
}
export interface SuMisuraConfig {
  tipo: 'prodotti-su-misura'
  base_price_sqm: number
  larghezza_min: number
  larghezza_max: number
  altezza_min: number
  altezza_max: number
  opzioni: SuMisuraOpzione[]
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
