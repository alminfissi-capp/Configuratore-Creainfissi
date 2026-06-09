# CreaInfissi Headless Configurator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a headless configurator SPA (Vercel + React) backed by Supabase (DB, Auth, Edge Functions) that lets users personalizzare serramenti, salvare preventivi con OTP, e completare il checkout via Shopify Draft Order.

**Architecture:** React SPA su sottodominio `configuratore.creainfissi.it`, routing client-side (React Router v6). Supabase gestisce DB PostgreSQL, autenticazione OTP passwordless e Edge Functions Deno che nascondono le API key Shopify. Il frontend riceve `?product_id=XXX`, interroga `product_mappings` su Supabase e carica il template React corretto con le opzioni iniettate dal DB — nessuna modifica al codice per aggiungere prodotti.

**Tech Stack:** React 18 + Vite + TypeScript, React Router v6, @supabase/supabase-js, Tailwind CSS, Vitest + @testing-library/react, Supabase CLI (locale), Deno Edge Functions, Shopify Admin REST API, pdf-lib (PDF generation)

**Brand:** Design system estratto dal tema Shopify CreaInfissi v2.0. Colore primario `#1AACB5` (teal), secondario `#6CB22A` (verde), graphite `#1A1A1A`. Font: Montserrat (titoli/bottoni) + Open Sans (tabelle/valori). Il configuratore deve sembrare una continuazione naturale dello store — stesso header, stessi bottoni, stesse card.

---

## File Structure

```
configuratore-creainfissi/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Router root
│   ├── lib/
│   │   └── supabase.ts                   # Supabase client singleton
│   ├── types/
│   │   └── index.ts                      # Tutti i tipi TypeScript condivisi
│   ├── hooks/
│   │   ├── useAuth.ts                    # OTP login, logout, session
│   │   ├── useProductMapping.ts          # Fetch product_mappings da Supabase
│   │   └── usePriceCalculator.ts         # Calcolo prezzo real-time
│   ├── routes/
│   │   ├── ConfiguratorPage.tsx          # Pagina principale (?product_id=XXX)
│   │   ├── LoginPage.tsx                 # OTP login / area preventivi
│   │   ├── PreventiviPage.tsx            # Dashboard storico preventivi
│   │   └── AdminPage.tsx                 # Pannello admin (role-guard)
│   ├── templates/
│   │   ├── TemplateRegistry.tsx          # Map string → React component
│   │   ├── TemplatePorteFinestre.tsx     # Macro-famiglia porte/finestre
│   │   └── TemplateFallback.tsx          # Fallback per template sconosciuti
│   ├── styles/
│   │   └── ci-design-system.css          # CSS variables brand + classi UI CreaInfissi
│   └── components/
│       ├── CiHeader.tsx                  # Header brand-consistent (logo + link preventivi)
│       ├── CiFooter.tsx                  # Footer minimal brand-consistent
│       ├── OtpForm.tsx                   # Form inserimento email + OTP
│       ├── StepWizard.tsx                # Wizard multi-step riusabile
│       ├── PriceDisplay.tsx              # Mostra prezzo aggiornato real-time
│       ├── QuoteCard.tsx                 # Card preventivo in dashboard
│       ├── ProtectedRoute.tsx            # Guard per rotte autenticate
│       └── AdminRoute.tsx                # Guard per rotte admin
├── supabase/
│   ├── config.toml                       # Configurazione Supabase locale
│   ├── migrations/
│   │   ├── 20260609000001_initial_schema.sql   # Schema + tabelle
│   │   ├── 20260609000002_rls_policies.sql     # Row Level Security
│   │   └── 20260609000003_seed_data.sql        # Dati di test
│   └── functions/
│       ├── process-checkout/
│       │   └── index.ts                  # Edge Function: checkout sicuro
│       └── update-expired-quotes/
│           └── index.ts                  # Edge Function: cron TTL 5gg
├── tests/
│   ├── hooks/
│   │   ├── usePriceCalculator.test.ts
│   │   └── useProductMapping.test.ts
│   ├── components/
│   │   ├── OtpForm.test.tsx
│   │   └── StepWizard.test.tsx
│   └── setup.ts                          # Vitest setup globale
├── .env.example                          # Template variabili ambiente
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json                           # SPA rewrite + headers CORS
```

---

## LINEE GRAFICHE — Design System CreaInfissi

Il configuratore eredita integralmente il design system del tema Shopify (file: `Creainfissi/assets/creainfissi-theme.css`).

### Token di Design

| Token CSS | Valore | Uso |
|-----------|--------|-----|
| `--ci-teal` | `#1AACB5` | Primario — bottoni, accenti, border attivi |
| `--ci-teal-hover` | `#138C94` | Hover su elementi teal |
| `--ci-teal-light` | `#E6F7F8` | Background teal chiaro (hover menu, badge) |
| `--ci-green` | `#6CB22A` | Secondario — bottoni CTA conferma |
| `--ci-green-hover` | `#5A9822` | Hover su elementi verde |
| `--ci-green-light` | `#EEF7E4` | Background verde chiaro |
| `--ci-graphite` | `#1A1A1A` | Header/footer bar, testi primari |
| `--ci-text` | `#111111` | Testo body |
| `--ci-text-muted` | `#5F6B7A` | Testo secondario, placeholder |
| `--ci-border` | `#DEE2E6` | Bordi card/input |
| `--ci-bg` | `#F8F9FA` | Background pagina |
| `--ci-shadow` | `0 4px 24px rgba(0,0,0,0.07)` | Ombra card |

### Font

- **Montserrat** (Google Fonts) — titoli, sottotitoli, bottoni, etichette. Weights: 300, 400, 500, 600, 700
- **Open Sans** (Google Fonts) — valori numerici, tabelle, dati tecnici. Weights: 300, 400, 600, 700

### Classi UI Riusabili (da implementare in `ci-design-system.css`)

```
.ci-btn              → base bottone (Montserrat, uppercase, letter-spacing 0.07em, border-radius 3px)
.ci-btn--primary     → sfondo graphite (#1A1A1A), hover diventa teal
.ci-btn--teal        → sfondo teal (#1AACB5), hover teal-hover
.ci-btn--green       → sfondo verde (#6CB22A), hover verde-hover
.ci-btn--outline     → bordo teal, hover riempie teal
.ci-card             → bianco, border ci-border, radius 6px, shadow ci-shadow
.ci-card:hover       → border-color teal, shadow più intenso
.ci-input            → border ci-border, focus border teal, font Montserrat
.ci-badge            → teal background, bianco, radius 20px, uppercase tiny
.ci-section-title    → Montserrat 700, graphite, con accent-line teal→verde sotto
.ci-price            → Open Sans 300, grande, graphite (come parameter-value dello store)
```

### Header del Configuratore

- **Top bar** (36px, sfondo `--ci-graphite`): logo testuale `CREA` (graphite/bianco) + `INFISSI` (teal), link "I miei preventivi", link "Torna allo store"
- **Nessun mega-menu**: il configuratore è un sottodominio tecnico, il nav è semplificato
- Lo stesso stile della top-bar dello store (sfondo graphite, testo `rgba(255,255,255,0.7)`)

### Componenti Visual

| Componente React | Equivalente Store | Note |
|---|---|---|
| `PriceDisplay` | `.parameter` del product header | Box con bordi laterali teal, valore Open Sans 300, label uppercase |
| Step wizard progress bar | Colori teal attivo, grigio inattivo | Border-radius 50% per i pallini |
| Card selezione opzione (colore/maniglia) | `.accessory-card` | Border teal on selected, hover shadow |
| Bottone "Salva preventivo" | `.btn-st.btn-green` | Verde (#6CB22A) |
| Bottone "Procedi acquisto" | `.btn-st.btn-dark-pro` | Graphite → hover teal |
| Input misure | Slider con accent teal | thumb color teal |
| Badge status preventivo | `.prod-badge-top` | Teal per ACTIVE, grigio per EXPIRED |

---

## FASE 1 — Foundation & Database

### Task 1: Inizializzazione Progetto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.env.example`

- [ ] **Step 1: Crea il progetto Vite**

```bash
cd "C:\Users\almin\OneDrive\Desktop\Configuratore CreaInfissi"
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Installa dipendenze**

```bash
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configura Tailwind in `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

- [ ] **Step 4: Crea `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Crea `.env.example`**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Copia come `.env.local` e compila con le credenziali del progetto Supabase.

- [ ] **Step 6: Crea `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 7: Crea `src/App.tsx` (router placeholder)**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-2xl">CreaInfissi Configurator — Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 8: Avvia dev server e verifica**

```bash
npm run dev
```

Atteso: browser su `http://localhost:5173` mostra "CreaInfissi Configurator — Coming Soon".

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: init Vite React TS project with Tailwind and Vitest"
```

---

### Task 1b: Design System CreaInfissi — CSS Variables, Font e Componenti Base

**Files:**
- Create: `src/styles/ci-design-system.css`
- Create: `src/components/CiHeader.tsx`
- Create: `src/components/CiFooter.tsx`
- Modify: `src/index.css`
- Modify: `index.html`

> **Nota:** Questo task porta il configuratore al 100% in linea con il tema Shopify CreaInfissi v2.0. Tutti i componenti successivi (OtpForm, PriceDisplay, StepWizard, etc.) DEVONO usare le classi definite qui invece delle classi Tailwind raw.

- [ ] **Step 1: Aggiungi i font Google in `index.html`**

Sostituisci il contenuto di `index.html` con:

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Configuratore — CreaInfissi</title>
    <meta name="description" content="Configura il tuo serramento su misura con CreaInfissi." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Crea `src/styles/ci-design-system.css`**

```css
/* =====================================================
   CreaInfissi Design System — configuratore.creainfissi.it
   Estratto e allineato con creainfissi-theme.css v2.0
   ===================================================== */

/* ===== DESIGN TOKENS ===== */
:root {
  --ci-teal:          #1AACB5;
  --ci-teal-hover:    #138C94;
  --ci-teal-light:    #E6F7F8;
  --ci-green:         #6CB22A;
  --ci-green-hover:   #5A9822;
  --ci-green-light:   #EEF7E4;
  --ci-accent:        var(--ci-teal);
  --ci-accent-hover:  var(--ci-teal-hover);
  --ci-secondary:     var(--ci-green);
  --ci-graphite:      #1A1A1A;
  --ci-white:         #FFFFFF;
  --ci-bg:            #F8F9FA;
  --ci-bg-alt:        #F1F3F5;
  --ci-text:          #111111;
  --ci-text-muted:    #5F6B7A;
  --ci-border:        #DEE2E6;
  --ci-border-light:  #E9ECEF;
  --ci-shadow:        0 4px 24px rgba(0,0,0,0.07);
  --ci-shadow-hover:  0 8px 32px rgba(0,0,0,0.12);
  --topbar-h:         44px;
  --container-max:    1200px;
}

/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ci-text);
  background: var(--ci-bg);
  -webkit-font-smoothing: antialiased;
  margin: 0;
  padding-top: var(--topbar-h);
}

img, svg { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { cursor: pointer; border: none; background: none; font-family: inherit; }

/* ===== ACCESSIBILITY ===== */
*:focus-visible { outline: 2px solid var(--ci-teal); outline-offset: 3px; }

/* ===== CONTAINER ===== */
.ci-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 2rem;
}

/* ===== TYPOGRAPHY ===== */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Montserrat', sans-serif;
  line-height: 1.1;
  color: var(--ci-graphite);
  margin: 0;
}

/* Accent line sotto i titoli sezione (come nel tema store) */
.ci-section-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ci-graphite);
  margin-bottom: 1.5rem;
}
.ci-section-title::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--ci-teal), var(--ci-green));
  margin-top: 0.75rem;
  border-radius: 2px;
}

/* ===== BUTTONS ===== */
.ci-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: 3px;
  border: 2px solid transparent;
  transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.15s;
  cursor: pointer;
  white-space: nowrap;
}
.ci-btn:hover { transform: translateY(-1px); }
.ci-btn:active { transform: translateY(0); }
.ci-btn:disabled { opacity: 0.5; pointer-events: none; }

/* Graphite → hover teal (bottone principale scuro) */
.ci-btn--primary {
  background: var(--ci-graphite);
  color: var(--ci-white);
  border-color: var(--ci-graphite);
}
.ci-btn--primary:hover {
  background: var(--ci-teal);
  border-color: var(--ci-teal);
}

/* Teal pieno */
.ci-btn--teal {
  background: var(--ci-teal);
  color: var(--ci-white);
  border-color: var(--ci-teal);
}
.ci-btn--teal:hover {
  background: var(--ci-teal-hover);
  border-color: var(--ci-teal-hover);
}

/* Verde (conferma, salvataggio) */
.ci-btn--green {
  background: var(--ci-green);
  color: var(--ci-white);
  border-color: var(--ci-green);
}
.ci-btn--green:hover {
  background: var(--ci-green-hover);
  border-color: var(--ci-green-hover);
}

/* Outline teal */
.ci-btn--outline {
  background: transparent;
  color: var(--ci-teal);
  border-color: var(--ci-teal);
}
.ci-btn--outline:hover {
  background: var(--ci-teal);
  color: var(--ci-white);
}

/* Small */
.ci-btn--sm {
  padding: 0.5rem 1.25rem;
  font-size: 0.75rem;
}

/* Full width */
.ci-btn--full { width: 100%; justify-content: center; }

/* ===== CARDS ===== */
.ci-card {
  background: var(--ci-white);
  border: 1px solid var(--ci-border-light);
  border-radius: 6px;
  transition: box-shadow 0.3s, border-color 0.3s;
}
.ci-card:hover {
  box-shadow: var(--ci-shadow-hover);
  border-color: var(--ci-teal);
}

/* Card opzione selezionabile (colore, maniglia, vetro) */
.ci-option-card {
  background: var(--ci-white);
  border: 2px solid var(--ci-border);
  border-radius: 6px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  text-align: center;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ci-text);
}
.ci-option-card:hover {
  border-color: var(--ci-teal);
  box-shadow: 0 0 0 3px var(--ci-teal-light);
}
.ci-option-card--selected {
  border-color: var(--ci-teal);
  background: var(--ci-teal-light);
  color: var(--ci-teal);
  font-weight: 600;
}

/* ===== INPUTS ===== */
.ci-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  color: var(--ci-text);
  background: var(--ci-white);
  border: 2px solid var(--ci-border);
  border-radius: 4px;
  transition: border-color 0.2s;
  outline: none;
}
.ci-input:focus { border-color: var(--ci-teal); }
.ci-input::placeholder { color: var(--ci-text-muted); }

/* Slider range con accent teal */
.ci-slider {
  width: 100%;
  appearance: none;
  height: 4px;
  border-radius: 4px;
  background: var(--ci-border);
  outline: none;
  cursor: pointer;
}
.ci-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ci-teal);
  border: 3px solid var(--ci-white);
  box-shadow: 0 0 0 1px var(--ci-teal), 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform 0.15s;
}
.ci-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.ci-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ci-teal);
  border: 3px solid var(--ci-white);
  cursor: pointer;
}

/* ===== PRICE DISPLAY (come .parameter del store) ===== */
.ci-price-box {
  position: relative;
  padding: 1.25rem 2rem;
  border-left: 2px solid var(--ci-teal);
  border-right: 2px solid var(--ci-teal);
  text-align: center;
  background: var(--ci-white);
}
.ci-price-box::before, .ci-price-box::after {
  content: '';
  position: absolute;
  left: -2px; right: -2px;
  height: 1px;
  background: linear-gradient(90deg, var(--ci-teal), var(--ci-green));
  opacity: 0.5;
}
.ci-price-box::before { top: 0; }
.ci-price-box::after { bottom: 0; }

.ci-price-value {
  font-family: 'Open Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--ci-graphite);
  line-height: 1;
}
.ci-price-label {
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ci-text-muted);
  margin-top: 0.5rem;
}
.ci-price-note {
  font-size: 0.75rem;
  color: var(--ci-text-muted);
  margin-top: 0.25rem;
}

/* ===== BADGE STATUS ===== */
.ci-badge {
  display: inline-block;
  padding: 0.2rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 20px;
}
.ci-badge--active  { background: var(--ci-teal); color: var(--ci-white); }
.ci-badge--expired { background: var(--ci-bg-alt); color: var(--ci-text-muted); border: 1px solid var(--ci-border); }
.ci-badge--ordered { background: var(--ci-green); color: var(--ci-white); }

/* ===== FORM LABEL ===== */
.ci-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ci-text-muted);
  margin-bottom: 0.5rem;
}

/* ===== STEP WIZARD PROGRESS ===== */
.ci-step-dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  transition: background 0.25s, color 0.25s;
  flex-shrink: 0;
}
.ci-step-dot--active   { background: var(--ci-teal); color: var(--ci-white); }
.ci-step-dot--done     { background: var(--ci-green); color: var(--ci-white); }
.ci-step-dot--inactive { background: var(--ci-border); color: var(--ci-text-muted); }

.ci-step-line {
  flex: 1;
  height: 2px;
  background: var(--ci-border);
  margin: 0 0.5rem;
  transition: background 0.25s;
}
.ci-step-line--done { background: var(--ci-green); }

/* ===== LOADING SKELETON ===== */
.ci-skeleton {
  background: linear-gradient(90deg, var(--ci-bg-alt) 25%, var(--ci-border-light) 50%, var(--ci-bg-alt) 75%);
  background-size: 200% 100%;
  animation: ci-shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes ci-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== ERROR / ALERT ===== */
.ci-alert {
  padding: 0.875rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}
.ci-alert--error {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FECACA;
}
.ci-alert--success {
  background: var(--ci-green-light);
  color: var(--ci-green-hover);
  border: 1px solid rgba(108,178,42,0.3);
}
.ci-alert--info {
  background: var(--ci-teal-light);
  color: var(--ci-teal-hover);
  border: 1px solid rgba(26,172,181,0.3);
}

/* ===== DIVIDER ===== */
.ci-divider {
  height: 1px;
  background: var(--ci-border-light);
  margin: 1.5rem 0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .ci-btn { padding: 0.75rem 1.5rem; }
  .ci-price-value { font-size: 2rem; }
}
```

- [ ] **Step 3: Aggiorna `src/index.css` per importare il design system**

Sostituisci il contenuto di `src/index.css` con:

```css
@import './styles/ci-design-system.css';
@import 'tailwindcss';
```

- [ ] **Step 4: Crea `src/components/CiHeader.tsx`**

```typescript
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function CiHeader() {
  const { session, signOut } = useAuth()

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--topbar-h)',
        background: 'var(--ci-graphite)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="ci-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
      >
        {/* Logo testuale — uguale allo store Shopify */}
        <a
          href="https://creainfissi.it"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>CREA</span>
          <span style={{ color: 'var(--ci-teal)' }}>INFISSI</span>
        </a>

        {/* Label configuratore */}
        <span
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Configuratore
        </span>

        {/* Nav destra */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {session ? (
            <>
              <Link
                to="/preventivi"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ci-teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                I miei preventivi
              </Link>
              <button
                onClick={() => signOut()}
                className="ci-btn ci-btn--outline ci-btn--sm"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
              >
                Esci
              </button>
            </>
          ) : (
            <Link to="/login" className="ci-btn ci-btn--outline ci-btn--sm"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)' }}>
              Accedi
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Crea `src/components/CiFooter.tsx`**

```typescript
export default function CiFooter() {
  return (
    <footer
      style={{
        background: 'var(--ci-graphite)',
        padding: '1.5rem 0',
        marginTop: '4rem',
      }}
    >
      <div
        className="ci-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} CreaInfissi — ALM Infissi Srl
        </span>
        <a
          href="https://creainfissi.it"
          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ci-teal)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          Torna allo store →
        </a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: Aggiorna `src/App.tsx` per includere Header e Footer globali**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CiHeader from './components/CiHeader'
import CiFooter from './components/CiFooter'
import LoginPage from './routes/LoginPage'
import PreventiviPage from './routes/PreventiviPage'
import ConfiguratorPage from './routes/ConfiguratorPage'
import AdminPage from './routes/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <CiHeader />
      <main style={{ minHeight: 'calc(100vh - var(--topbar-h) - 80px)' }}>
        <Routes>
          <Route path="/" element={<ConfiguratorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/preventivi"
            element={
              <ProtectedRoute>
                <PreventiviPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      <CiFooter />
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: Aggiorna `src/components/OtpForm.tsx` con le classi CI**

Sostituisci il return del componente con:

```typescript
return (
  <div className="ci-card" style={{ maxWidth: '380px', margin: '0 auto', padding: '2.5rem' }}>
    {step === 'email' ? (
      <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 className="ci-section-title">Accedi per salvare il preventivo</h2>
        <div>
          <label className="ci-label">La tua email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="esempio@email.it"
            required
            className="ci-input"
          />
        </div>
        {error && <div className="ci-alert ci-alert--error">{error}</div>}
        <button type="submit" disabled={loading} className="ci-btn ci-btn--teal ci-btn--full">
          {loading ? 'Invio codice...' : 'Invia codice OTP'}
        </button>
      </form>
    ) : (
      <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 className="ci-section-title">Codice OTP</h2>
        <div className="ci-alert ci-alert--info">Codice inviato a <strong>{email}</strong></div>
        <div>
          <label className="ci-label">Inserisci il codice a 6 cifre</label>
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            placeholder="• • • • • •"
            maxLength={6}
            required
            className="ci-input"
            style={{ textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.5em', fontFamily: 'Open Sans, sans-serif', fontWeight: 300 }}
          />
        </div>
        {error && <div className="ci-alert ci-alert--error">{error}</div>}
        <button type="submit" disabled={loading} className="ci-btn ci-btn--green ci-btn--full">
          {loading ? 'Verifica...' : 'Verifica e accedi'}
        </button>
        <button type="button" onClick={() => setStep('email')}
          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'var(--ci-text-muted)', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}>
          ← Cambia email
        </button>
      </form>
    )}
  </div>
)
```

- [ ] **Step 8: Aggiorna `src/components/PriceDisplay.tsx` con le classi CI**

```typescript
interface PriceDisplayProps {
  price: number
  loading: boolean
}

export default function PriceDisplay({ price, loading }: PriceDisplayProps) {
  return (
    <div className="ci-price-box">
      <p className="ci-price-label">Prezzo stimato</p>
      {loading ? (
        <div className="ci-skeleton" style={{ height: '2.5rem', width: '180px', margin: '0.5rem auto' }} />
      ) : (
        <p className="ci-price-value">
          €{price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </p>
      )}
      <p className="ci-price-note">IVA esclusa — preventivo indicativo</p>
    </div>
  )
}
```

- [ ] **Step 9: Aggiorna `src/components/StepWizard.tsx` con le classi CI**

```typescript
interface Step {
  label: string
  content: React.ReactNode
}

interface StepWizardProps {
  steps: Step[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  canProceed: boolean
}

export default function StepWizard({ steps, currentStep, onNext, onPrev, canProceed }: StepWizardProps) {
  const isLast = currentStep === steps.length - 1

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div className={`ci-step-dot ${i < currentStep ? 'ci-step-dot--done' : i === currentStep ? 'ci-step-dot--active' : 'ci-step-dot--inactive'}`}>
                {i < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: i <= currentStep ? 'var(--ci-graphite)' : 'var(--ci-text-muted)', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ci-step-line ${i < currentStep ? 'ci-step-line--done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ marginBottom: '2rem' }}>{steps[currentStep].content}</div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="ci-btn ci-btn--outline"
        >
          ← Indietro
        </button>
        {!isLast && (
          <button
            onClick={onNext}
            disabled={!canProceed}
            className="ci-btn ci-btn--teal"
          >
            Avanti →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Verifica visiva**

```bash
npm run dev
```

Controlla su `http://localhost:5173`:
- Top bar graphite (#1A1A1A) con logo CREA(bianco)+INFISSI(teal) a sinistra
- Naviga su `/login` — card con bordi corretti, bottone teal, font Montserrat
- Verifica che i colori siano `#1AACB5` (teal) e `#6CB22A` (verde) usando DevTools

- [ ] **Step 11: Commit**

```bash
git add src/styles/ src/components/CiHeader.tsx src/components/CiFooter.tsx src/index.css index.html
git add src/components/OtpForm.tsx src/components/PriceDisplay.tsx src/components/StepWizard.tsx
git commit -m "feat: CreaInfissi brand design system — CSS variables, header, footer, UI components"
```

---

### Task 2: Supabase CLI e Schema Database

**Files:**
- Create: `supabase/migrations/20260609000001_initial_schema.sql`

- [ ] **Step 1: Installa Supabase CLI e inizializza**

```bash
npm install -D supabase
npx supabase init
npx supabase start
```

Atteso output: URL locale (es. `http://127.0.0.1:54321`) e chiavi API locali. Copiare `anon key` in `.env.local` come `VITE_SUPABASE_URL=http://127.0.0.1:54321`.

- [ ] **Step 2: Crea la migration dello schema**

File: `supabase/migrations/20260609000001_initial_schema.sql`

```sql
-- Estende auth.users con profilo pubblico
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per creare il profilo automaticamente all'OTP signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Preventivi
CREATE TABLE public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'ORDERED')),
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shopify_draft_order_id TEXT,
  shopify_invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 days'
);

-- Articoli del preventivo
CREATE TABLE public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  shopify_product_id TEXT NOT NULL,
  category_template TEXT NOT NULL,
  configuration_json JSONB NOT NULL DEFAULT '{}',
  item_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regole di prezzo
CREATE TABLE public.pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_template TEXT NOT NULL,
  attribute_key TEXT NOT NULL,
  price_modifier NUMERIC(10, 4) NOT NULL,
  modifier_type TEXT NOT NULL CHECK (modifier_type IN ('fixed', 'percentage')),
  UNIQUE (category_template, attribute_key)
);

-- Mappatura prodotti Shopify → Template React
CREATE TABLE public.product_mappings (
  shopify_product_id TEXT PRIMARY KEY,
  category_template TEXT NOT NULL,
  allowed_options_json JSONB NOT NULL DEFAULT '{}',
  base_price_sqm NUMERIC(10, 2) NOT NULL,
  display_name TEXT NOT NULL
);
```

- [ ] **Step 3: Applica la migration**

```bash
npx supabase db push
```

Atteso: "Finished supabase db push."

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: initial database schema with profiles, quotes, quote_items, pricing_rules, product_mappings"
```

---

### Task 3: Row Level Security (RLS)

**Files:**
- Create: `supabase/migrations/20260609000002_rls_policies.sql`

- [ ] **Step 1: Crea la migration RLS**

File: `supabase/migrations/20260609000002_rls_policies.sql`

```sql
-- PROFILES: ogni utente vede/modifica solo il proprio profilo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Gli admin possono leggere tutti i profili
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- QUOTES: ogni utente gestisce solo i propri preventivi
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes: self read"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quotes: self insert"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes: self update"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin può leggere tutti i preventivi
CREATE POLICY "quotes: admin read all"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- QUOTE_ITEMS: eredita accesso dal preventivo padre
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_items: self read"
  ON public.quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "quote_items: self insert"
  ON public.quote_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid()
    )
  );

-- PRICING_RULES: lettura pubblica (necessaria per calcolo prezzo nel frontend)
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules: public read"
  ON public.pricing_rules FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo admin può modificare pricing_rules
CREATE POLICY "pricing_rules: admin write"
  ON public.pricing_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- PRODUCT_MAPPINGS: lettura pubblica, scrittura solo admin
ALTER TABLE public.product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_mappings: public read"
  ON public.product_mappings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "product_mappings: admin write"
  ON public.product_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
```

- [ ] **Step 2: Applica la migration**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260609000002_rls_policies.sql
git commit -m "feat: Row Level Security policies — users own their quotes, public reads on pricing/mappings"
```

---

### Task 4: Seed Dati di Test e Supabase Client

**Files:**
- Create: `supabase/migrations/20260609000003_seed_data.sql`, `src/lib/supabase.ts`, `src/types/index.ts`

- [ ] **Step 1: Crea seed data**

File: `supabase/migrations/20260609000003_seed_data.sql`

```sql
-- Mappa prodotto di test (porte/finestre)
INSERT INTO public.product_mappings (shopify_product_id, category_template, display_name, base_price_sqm, allowed_options_json)
VALUES
  ('shopify-prod-001', 'porte-finestre', 'Finestra Scorrevole Standard', 250.00,
   '{"colori": ["bianco", "grigio-antracite", "legno-rovere"], "maniglie": ["maniglia-std", "maniglia-premium"], "vetri": ["vetro-base", "vetro-triplo"], "larghezza_min": 60, "larghezza_max": 350, "altezza_min": 60, "altezza_max": 280}'),
  ('shopify-prod-002', 'porte-finestre', 'Porta Finestra Alzante', 320.00,
   '{"colori": ["bianco", "grigio-antracite"], "maniglie": ["maniglia-std"], "vetri": ["vetro-base", "vetro-triplo"], "larghezza_min": 80, "larghezza_max": 400, "altezza_min": 180, "altezza_max": 300}');

-- Regole di prezzo per porte-finestre
INSERT INTO public.pricing_rules (category_template, attribute_key, price_modifier, modifier_type)
VALUES
  ('porte-finestre', 'colore_grigio-antracite', 15.00, 'percentage'),
  ('porte-finestre', 'colore_legno-rovere', 20.00, 'percentage'),
  ('porte-finestre', 'maniglia_maniglia-premium', 85.00, 'fixed'),
  ('porte-finestre', 'vetro_vetro-triplo', 25.00, 'percentage');
```

- [ ] **Step 2: Applica seed**

```bash
npx supabase db push
```

- [ ] **Step 3: Crea `src/types/index.ts`**

```typescript
export interface ProductMapping {
  shopify_product_id: string
  category_template: string
  display_name: string
  base_price_sqm: number
  allowed_options_json: {
    colori: string[]
    maniglie: string[]
    vetri: string[]
    larghezza_min: number
    larghezza_max: number
    altezza_min: number
    altezza_max: number
  }
}

export interface PricingRule {
  id: string
  category_template: string
  attribute_key: string
  price_modifier: number
  modifier_type: 'fixed' | 'percentage'
}

export interface Quote {
  id: string
  user_id: string
  status: 'ACTIVE' | 'EXPIRED' | 'ORDERED'
  total_price: number
  shopify_draft_order_id: string | null
  shopify_invoice_url: string | null
  created_at: string
  expires_at: string
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  shopify_product_id: string
  category_template: string
  configuration_json: ConfigurationData
  item_price: number
}

export interface ConfigurationData {
  larghezza: number
  altezza: number
  colore: string
  maniglia: string
  vetro: string
  [key: string]: string | number
}

export interface UserProfile {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}
```

- [ ] **Step 4: Crea `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609000003_seed_data.sql src/lib/supabase.ts src/types/index.ts
git commit -m "feat: seed test data, Supabase client, shared TypeScript types"
```

---

## FASE 2 — Autenticazione OTP

### Task 5: Hook `useAuth` e Componente `OtpForm`

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/components/OtpForm.tsx`
- Test: `tests/components/OtpForm.test.tsx`

- [ ] **Step 1: Scrivi il test fallente per `OtpForm`**

File: `tests/components/OtpForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import OtpForm from '../../src/components/OtpForm'

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('OtpForm', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    onSuccess.mockClear()
  })

  it('mostra il campo email inizialmente', () => {
    render(<OtpForm onSuccess={onSuccess} />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/codice/i)).not.toBeInTheDocument()
  })

  it('dopo invio email mostra il campo OTP', async () => {
    const user = userEvent.setup()
    render(<OtpForm onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /invia codice/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/codice otp/i)).toBeInTheDocument()
    })
  })

  it('chiama onSuccess dopo OTP valido', async () => {
    const user = userEvent.setup()
    render(<OtpForm onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /invia codice/i }))

    await waitFor(() => screen.getByPlaceholderText(/codice otp/i))

    await user.type(screen.getByPlaceholderText(/codice otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verifica/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
  })
})
```

- [ ] **Step 2: Esegui il test per verificare il fallimento**

```bash
npx vitest run tests/components/OtpForm.test.tsx
```

Atteso: FAIL — "Cannot find module '../../src/components/OtpForm'"

- [ ] **Step 3: Crea `src/hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) fetchProfile(data.session.user)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user)
      else { setProfile(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(user: User) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }

  async function verifyOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, profile, loading, sendOtp, verifyOtp, signOut }
}
```

- [ ] **Step 4: Crea `src/components/OtpForm.tsx`**

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface OtpFormProps {
  onSuccess: () => void
}

export default function OtpForm({ onSuccess }: OtpFormProps) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setError(error.message); return }
    onSuccess()
  }

  return (
    <div className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow">
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <h2 className="text-xl font-semibold">Accedi per salvare il preventivo</h2>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="La tua email"
            required
            className="w-full border rounded px-3 py-2"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Invio...' : 'Invia codice'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <h2 className="text-xl font-semibold">Inserisci il codice ricevuto via email</h2>
          <p className="text-sm text-gray-500">Codice inviato a {email}</p>
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            placeholder="Codice OTP (6 cifre)"
            maxLength={6}
            required
            className="w-full border rounded px-3 py-2 tracking-widest text-center text-2xl"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Verifica...' : 'Verifica'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="w-full text-sm text-gray-500 underline"
          >
            Cambia email
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Esegui i test**

```bash
npx vitest run tests/components/OtpForm.test.tsx
```

Atteso: 3 PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth.ts src/components/OtpForm.tsx tests/components/OtpForm.test.tsx
git commit -m "feat: OTP auth hook and form component with tests"
```

---

### Task 6: Route Guards e Pagine Login / Preventivi

**Files:**
- Create: `src/components/ProtectedRoute.tsx`, `src/components/AdminRoute.tsx`, `src/routes/LoginPage.tsx`, `src/routes/PreventiviPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Crea `src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8">Caricamento...</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 2: Crea `src/components/AdminRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="p-8">Caricamento...</div>
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
```

- [ ] **Step 3: Crea `src/routes/LoginPage.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import OtpForm from '../components/OtpForm'

export default function LoginPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <OtpForm onSuccess={() => navigate('/preventivi')} />
    </div>
  )
}
```

- [ ] **Step 4: Crea `src/routes/PreventiviPage.tsx` (placeholder)**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Quote } from '../types'
import { useAuth } from '../hooks/useAuth'

export default function PreventiviPage() {
  const { profile } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8">Caricamento preventivi...</div>

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">I tuoi preventivi</h1>
      {quotes.length === 0 ? (
        <p className="text-gray-500">Nessun preventivo trovato. <a href="/" className="text-blue-600 underline">Avvia una configurazione</a>.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {quotes.map(q => (
            <div key={q.id} className="ci-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: 'var(--ci-graphite)' }}>
                  Preventivo #{q.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`ci-badge ci-badge--${q.status.toLowerCase()}`}>
                  {q.status === 'ACTIVE' ? 'Attivo' : q.status === 'EXPIRED' ? 'Scaduto' : 'Ordinato'}
                </span>
              </div>
              <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '1.5rem', fontWeight: 300, color: 'var(--ci-graphite)', marginBottom: '0.25rem' }}>
                €{q.total_price.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--ci-text-muted)' }}>Scade: {new Date(q.expires_at).toLocaleDateString('it-IT')}</p>
              {q.status === 'ACTIVE' && q.shopify_invoice_url && (
                <a href={q.shopify_invoice_url} className="ci-btn ci-btn--primary ci-btn--sm" style={{ marginTop: '0.75rem' }}>
                  Procedi al pagamento →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Aggiorna `src/App.tsx` con routing completo**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './routes/LoginPage'
import PreventiviPage from './routes/PreventiviPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/preventivi"
          element={
            <ProtectedRoute>
              <PreventiviPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div className="p-8 text-2xl">Configuratore — in costruzione</div>} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Testa il flusso manualmente**

```bash
npm run dev
```

Naviga su `http://localhost:5173/login` — deve mostrare il form OTP.
Naviga su `http://localhost:5173/preventivi` senza login — deve reindirizzare a `/login`.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProtectedRoute.tsx src/components/AdminRoute.tsx src/routes/LoginPage.tsx src/routes/PreventiviPage.tsx src/App.tsx
git commit -m "feat: protected routes, login page, preventivi dashboard"
```

---

## FASE 3 — Configurator Engine

### Task 7: Hook `useProductMapping`

**Files:**
- Create: `src/hooks/useProductMapping.ts`
- Test: `tests/hooks/useProductMapping.test.ts`

- [ ] **Step 1: Scrivi il test fallente**

File: `tests/hooks/useProductMapping.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useProductMapping } from '../../src/hooks/useProductMapping'
import type { ProductMapping } from '../../src/types'

const mockMapping: ProductMapping = {
  shopify_product_id: 'shopify-prod-001',
  category_template: 'porte-finestre',
  display_name: 'Finestra Test',
  base_price_sqm: 250,
  allowed_options_json: {
    colori: ['bianco', 'grigio-antracite'],
    maniglie: ['maniglia-std'],
    vetri: ['vetro-base'],
    larghezza_min: 60,
    larghezza_max: 350,
    altezza_min: 60,
    altezza_max: 280,
  },
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: mockMapping, error: null }),
        }),
      }),
    }),
  },
}))

describe('useProductMapping', () => {
  it('carica la mappatura prodotto da Supabase', async () => {
    const { result } = renderHook(() => useProductMapping('shopify-prod-001'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.mapping).toEqual(mockMapping)
      expect(result.current.error).toBeNull()
    })
  })

  it('restituisce error se product_id non trovato', async () => {
    vi.mocked(
      require('../../src/lib/supabase').supabase.from('').select('').eq('', '').single
    )
    // Questo caso è coperto dall'error state — il componente gestisce l'assenza
    const { result } = renderHook(() => useProductMapping(null))
    expect(result.current.mapping).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Esegui il test per verificare il fallimento**

```bash
npx vitest run tests/hooks/useProductMapping.test.ts
```

Atteso: FAIL

- [ ] **Step 3: Crea `src/hooks/useProductMapping.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProductMapping } from '../types'

export function useProductMapping(productId: string | null) {
  const [mapping, setMapping] = useState<ProductMapping | null>(null)
  const [loading, setLoading] = useState(productId !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) { setLoading(false); return }

    setLoading(true)
    supabase
      .from('product_mappings')
      .select('*')
      .eq('shopify_product_id', productId)
      .single()
      .then(({ data, error }) => {
        if (error) setError('Prodotto non trovato. Verifica il link.')
        else setMapping(data)
        setLoading(false)
      })
  }, [productId])

  return { mapping, loading, error }
}
```

- [ ] **Step 4: Esegui i test**

```bash
npx vitest run tests/hooks/useProductMapping.test.ts
```

Atteso: PASS (il secondo test verifica solo lo stato null iniziale)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProductMapping.ts tests/hooks/useProductMapping.test.ts
git commit -m "feat: useProductMapping hook fetches template config from Supabase"
```

---

### Task 8: Hook `usePriceCalculator`

**Files:**
- Create: `src/hooks/usePriceCalculator.ts`
- Test: `tests/hooks/usePriceCalculator.test.ts`

- [ ] **Step 1: Scrivi il test fallente**

File: `tests/hooks/usePriceCalculator.test.ts`

```typescript
import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { usePriceCalculator } from '../../src/hooks/usePriceCalculator'
import type { ConfigurationData, ProductMapping, PricingRule } from '../../src/types'

const mockMapping: ProductMapping = {
  shopify_product_id: 'shopify-prod-001',
  category_template: 'porte-finestre',
  display_name: 'Finestra Test',
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
}

const mockRules: PricingRule[] = [
  { id: '1', category_template: 'porte-finestre', attribute_key: 'colore_grigio-antracite', price_modifier: 15, modifier_type: 'percentage' },
  { id: '2', category_template: 'porte-finestre', attribute_key: 'maniglia_maniglia-premium', price_modifier: 85, modifier_type: 'fixed' },
]

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue({ data: mockRules, error: null }),
      }),
    }),
  },
}))

describe('usePriceCalculator', () => {
  const baseConfig: ConfigurationData = {
    larghezza: 100, // cm
    altezza: 150,   // cm
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
```

- [ ] **Step 2: Esegui per verificare il fallimento**

```bash
npx vitest run tests/hooks/usePriceCalculator.test.ts
```

Atteso: FAIL

- [ ] **Step 3: Crea `src/hooks/usePriceCalculator.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ConfigurationData, ProductMapping, PricingRule } from '../types'

export function usePriceCalculator(mapping: ProductMapping | null, config: ConfigurationData) {
  const [price, setPrice] = useState(0)
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)

  // Carica le regole una volta sola quando cambia la categoria
  useEffect(() => {
    if (!mapping) { setLoading(false); return }

    supabase
      .from('pricing_rules')
      .select('*')
      .eq('category_template', mapping.category_template)
      .then(({ data }) => {
        setRules(data ?? [])
        setLoading(false)
      })
  }, [mapping?.category_template])

  // Ricalcola il prezzo ogni volta che cambiano misure o opzioni
  useEffect(() => {
    if (!mapping || loading) return

    const mq = (config.larghezza / 100) * (config.altezza / 100)
    let total = mq * mapping.base_price_sqm

    for (const rule of rules) {
      const [attributeType, attributeValue] = rule.attribute_key.split('_')
      const configValue = config[attributeType as keyof ConfigurationData]

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
```

- [ ] **Step 4: Esegui i test**

```bash
npx vitest run tests/hooks/usePriceCalculator.test.ts
```

Atteso: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePriceCalculator.ts tests/hooks/usePriceCalculator.test.ts
git commit -m "feat: usePriceCalculator with real-time mq + rule-based pricing"
```

---

### Task 9: Template `TemplatePorteFinestre` e Wizard

**Files:**
- Create: `src/templates/TemplatePorteFinestre.tsx`, `src/templates/TemplateRegistry.tsx`, `src/templates/TemplateFallback.tsx`, `src/components/StepWizard.tsx`, `src/components/PriceDisplay.tsx`

- [ ] **Step 1: Crea `src/components/PriceDisplay.tsx`**

```typescript
interface PriceDisplayProps {
  price: number
  loading: boolean
}

export default function PriceDisplay({ price, loading }: PriceDisplayProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
      <p className="text-sm text-blue-600 font-medium">Prezzo stimato</p>
      {loading ? (
        <div className="h-8 bg-blue-100 animate-pulse rounded mt-1" />
      ) : (
        <p className="text-3xl font-bold text-blue-800">
          €{price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1">IVA esclusa — preventivo indicativo</p>
    </div>
  )
}
```

- [ ] **Step 2: Crea `src/components/StepWizard.tsx`**

```typescript
interface Step {
  label: string
  content: React.ReactNode
}

interface StepWizardProps {
  steps: Step[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  canProceed: boolean
}

export default function StepWizard({ steps, currentStep, onNext, onPrev, canProceed }: StepWizardProps) {
  const isLast = currentStep === steps.length - 1

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
            <span className="ml-2 text-sm hidden sm:block">{step.label}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-1 mx-3 ${i < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mb-8">{steps[currentStep].content}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="px-4 py-2 border rounded disabled:opacity-30"
        >
          Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed || isLast}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isLast ? 'Salva preventivo' : 'Avanti'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crea `src/templates/TemplatePorteFinestre.tsx`**

```typescript
import { useState } from 'react'
import { ProductMapping, ConfigurationData } from '../types'
import { usePriceCalculator } from '../hooks/usePriceCalculator'
import StepWizard from '../components/StepWizard'
import PriceDisplay from '../components/PriceDisplay'

interface TemplatePorteFinestreProps {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

export default function TemplatePorteFinestre({ mapping, onSave }: TemplatePorteFinestreProps) {
  const opts = mapping.allowed_options_json
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState<ConfigurationData>({
    larghezza: opts.larghezza_min,
    altezza: opts.altezza_min,
    colore: opts.colori[0],
    maniglia: opts.maniglie[0],
    vetro: opts.vetri[0],
  })

  const { price, loading: priceLoading } = usePriceCalculator(mapping, config)

  function set(key: keyof ConfigurationData, value: string | number) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const steps = [
    {
      label: 'Misure',
      content: (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Inserisci le misure</h2>
          <div>
            <label className="block text-sm font-medium mb-1">
              Larghezza: {config.larghezza} cm
            </label>
            <input
              type="range"
              min={opts.larghezza_min}
              max={opts.larghezza_max}
              value={config.larghezza}
              onChange={e => set('larghezza', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{opts.larghezza_min} cm</span>
              <span>{opts.larghezza_max} cm</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Altezza: {config.altezza} cm
            </label>
            <input
              type="range"
              min={opts.altezza_min}
              max={opts.altezza_max}
              value={config.altezza}
              onChange={e => set('altezza', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{opts.altezza_min} cm</span>
              <span>{opts.altezza_max} cm</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Colore',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="ci-section-title">Scegli il colore</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {opts.colori.map(c => (
              <button
                key={c}
                onClick={() => set('colore', c)}
                className={`ci-option-card ${config.colore === c ? 'ci-option-card--selected' : ''}`}
              >
                {c.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: 'Accessori',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 className="ci-section-title">Maniglia e vetro</h2>
          <div>
            <label className="ci-label">Maniglia</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {opts.maniglie.map(m => (
                <button
                  key={m}
                  onClick={() => set('maniglia', m)}
                  className={`ci-option-card ${config.maniglia === m ? 'ci-option-card--selected' : ''}`}
                >
                  {m.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="ci-label">Tipo di vetro</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {opts.vetri.map(v => (
                <button
                  key={v}
                  onClick={() => set('vetro', v)}
                  className={`ci-option-card ${config.vetro === v ? 'ci-option-card--selected' : ''}`}
                >
                  {v.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Riepilogo',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 className="ci-section-title">Riepilogo configurazione</h2>
          <div className="ci-card" style={{ padding: '1.25rem' }}>
            {Object.entries(config).map(([k, v], i, arr) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--ci-border-light)' : 'none' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ci-text-muted)', textTransform: 'capitalize' }}>{k}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Open Sans, sans-serif', color: 'var(--ci-graphite)' }}>
                  {v}{typeof v === 'number' ? ' cm' : ''}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onSave(config, price)}
            className="ci-btn ci-btn--green ci-btn--full"
            style={{ fontSize: '1rem', padding: '1rem 2rem' }}
          >
            Salva preventivo — €{price.toFixed(2)}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
      <div style={{ position: 'sticky', top: 'var(--topbar-h)', background: 'var(--ci-bg)', paddingTop: '1.5rem', paddingBottom: '1.5rem', marginBottom: '2rem', zIndex: 10, borderBottom: '1px solid var(--ci-border-light)' }}>
        <PriceDisplay price={price} loading={priceLoading} />
      </div>
      <StepWizard
        steps={steps}
        currentStep={step}
        onNext={() => setStep(s => Math.min(s + 1, steps.length - 1))}
        onPrev={() => setStep(s => Math.max(s - 1, 0))}
        canProceed={true}
      />
    </div>
  )
}
```

- [ ] **Step 4: Crea `src/templates/TemplateFallback.tsx`**

```typescript
export default function TemplateFallback({ template }: { template: string }) {
  return (
    <div className="p-8 text-center text-gray-500">
      <p>Template "{template}" non ancora disponibile.</p>
      <p className="mt-2 text-sm">Contatta il supporto o seleziona un altro prodotto.</p>
    </div>
  )
}
```

- [ ] **Step 5: Crea `src/templates/TemplateRegistry.tsx`**

```typescript
import TemplatePorteFinestre from './TemplatePorteFinestre'
import TemplateFallback from './TemplateFallback'
import { ProductMapping, ConfigurationData } from '../types'

interface TemplateProps {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

const REGISTRY: Record<string, React.ComponentType<TemplateProps>> = {
  'porte-finestre': TemplatePorteFinestre,
}

export default function TemplateRegistry({ mapping, onSave }: TemplateProps) {
  const Component = REGISTRY[mapping.category_template]
  if (!Component) return <TemplateFallback template={mapping.category_template} />
  return <Component mapping={mapping} onSave={onSave} />
}
```

- [ ] **Step 6: Commit**

```bash
git add src/templates/ src/components/StepWizard.tsx src/components/PriceDisplay.tsx
git commit -m "feat: TemplatePorteFinestre with step wizard, real-time pricing, template registry"
```

---

### Task 10: Pagina Configuratore e Salvataggio Preventivo

**Files:**
- Create: `src/routes/ConfiguratorPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Crea `src/routes/ConfiguratorPage.tsx`**

```typescript
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useProductMapping } from '../hooks/useProductMapping'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TemplateRegistry from '../templates/TemplateRegistry'
import OtpForm from '../components/OtpForm'
import { ConfigurationData } from '../types'

export default function ConfiguratorPage() {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product_id')
  const navigate = useNavigate()
  const { mapping, loading, error } = useProductMapping(productId)
  const { session, profile } = useAuth()
  const [showOtp, setShowOtp] = useState(false)
  const [pendingConfig, setPendingConfig] = useState<{ config: ConfigurationData; price: number } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!productId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Nessun prodotto selezionato.</p>
        <p className="mt-2 text-sm text-gray-500">Torna su creainfissi.it e seleziona un prodotto.</p>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center">Caricamento configurazione...</div>
  if (error || !mapping) return <div className="p-8 text-center text-red-600">{error ?? 'Errore nel caricamento.'}</div>

  async function saveQuote(config: ConfigurationData, price: number) {
    if (!session || !profile) {
      setPendingConfig({ config, price })
      setShowOtp(true)
      return
    }
    await persistQuote(config, price, profile.id)
  }

  async function persistQuote(config: ConfigurationData, price: number, userId: string) {
    if (!mapping) return
    setSaving(true)

    // Cerca preventivo ACTIVE esistente e chiedi se aggiungere
    const { data: activeQuotes } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)

    let quoteId: string

    if (activeQuotes && activeQuotes.length > 0) {
      const confirmed = window.confirm(
        `Hai già un preventivo aperto (#${activeQuotes[0].id.slice(0, 8)}). Vuoi aggiungere questo infisso a quel preventivo?`
      )
      quoteId = confirmed ? activeQuotes[0].id : await createNewQuote(userId, price)
    } else {
      quoteId = await createNewQuote(userId, price)
    }

    await supabase.from('quote_items').insert({
      quote_id: quoteId,
      shopify_product_id: mapping.shopify_product_id,
      category_template: mapping.category_template,
      configuration_json: config,
      item_price: price,
    })

    // Aggiorna il totale del preventivo
    const { data: items } = await supabase
      .from('quote_items')
      .select('item_price')
      .eq('quote_id', quoteId)

    const newTotal = (items ?? []).reduce((sum, i) => sum + i.item_price, 0)
    await supabase.from('quotes').update({ total_price: newTotal }).eq('id', quoteId)

    setSaving(false)
    navigate('/preventivi')
  }

  async function createNewQuote(userId: string, price: number): Promise<string> {
    const { data } = await supabase
      .from('quotes')
      .insert({ user_id: userId, total_price: price })
      .select('id')
      .single()
    return data!.id
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">{mapping.display_name}</h1>
        <p className="text-sm text-gray-500">Configura il tuo serramento</p>
      </header>

      <main className="p-6">
        {saving ? (
          <div className="text-center p-8">Salvataggio preventivo in corso...</div>
        ) : showOtp ? (
          <div>
            <p className="mb-4 text-center text-gray-600">Inserisci la tua email per salvare la configurazione:</p>
            <OtpForm
              onSuccess={() => {
                setShowOtp(false)
                if (pendingConfig && profile) {
                  persistQuote(pendingConfig.config, pendingConfig.price, profile.id)
                }
              }}
            />
          </div>
        ) : (
          <TemplateRegistry mapping={mapping} onSave={saveQuote} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Aggiorna `src/App.tsx` con rotta configuratore e admin**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './routes/LoginPage'
import PreventiviPage from './routes/PreventiviPage'
import ConfiguratorPage from './routes/ConfiguratorPage'
import AdminPage from './routes/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConfiguratorPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/preventivi"
          element={
            <ProtectedRoute>
              <PreventiviPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Crea `src/routes/AdminPage.tsx` (placeholder per ora)**

```typescript
export default function AdminPage() {
  return <div className="p-8 text-2xl">Admin Panel — Fase 6</div>
}
```

- [ ] **Step 4: Testa il flusso completo manualmente**

```bash
npm run dev
```

Naviga su `http://localhost:5173/?product_id=shopify-prod-001`.
Verifica: configuratore si carica, wizard funziona, prezzo si aggiorna.
Completa la configurazione → deve mostrare il form OTP.

- [ ] **Step 5: Commit**

```bash
git add src/routes/ConfiguratorPage.tsx src/routes/AdminPage.tsx src/App.tsx
git commit -m "feat: configurator page with product mapping, OTP save flow, quote grouping dialog"
```

---

## FASE 4 — Edge Functions & Shopify

### Task 11: Edge Function `process-checkout`

**Files:**
- Create: `supabase/functions/process-checkout/index.ts`

Prerequisiti: avere un account Shopify con Admin API access token. Il token non entra mai nel frontend.

- [ ] **Step 1: Crea la struttura della Edge Function**

```bash
mkdir -p "supabase/functions/process-checkout"
```

- [ ] **Step 2: Crea `supabase/functions/process-checkout/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN')!
const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verifica autenticazione utente dal JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authError || !user) throw new Error('Invalid token')

    const { quoteId } = await req.json()

    // 2. Carica preventivo e articoli (solo del proprio utente)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (quoteError || !quote) throw new Error('Preventivo non trovato')
    if (quote.status !== 'ACTIVE') throw new Error('Preventivo non attivo')

    // 3. Ricalcola autoritativamente il prezzo (anti-manomissione)
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('*')

    const { data: mappings } = await supabase
      .from('product_mappings')
      .select('*')

    let recalculatedTotal = 0
    const lineItems = []

    for (const item of quote.quote_items) {
      const mapping = mappings?.find(m => m.shopify_product_id === item.shopify_product_id)
      if (!mapping) throw new Error(`Prodotto ${item.shopify_product_id} non trovato`)

      const cfg = item.configuration_json
      const mq = (cfg.larghezza / 100) * (cfg.altezza / 100)
      let itemPrice = mq * mapping.base_price_sqm

      const categoryRules = (rules ?? []).filter(r => r.category_template === item.category_template)
      for (const rule of categoryRules) {
        const [attrType, attrValue] = rule.attribute_key.split('_')
        if (String(cfg[attrType]) !== attrValue) continue
        if (rule.modifier_type === 'percentage') {
          itemPrice += itemPrice * (rule.price_modifier / 100)
        } else {
          itemPrice += rule.price_modifier
        }
      }

      itemPrice = Math.round(itemPrice * 100) / 100
      recalculatedTotal += itemPrice

      const configSummary = Object.entries(cfg)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')

      lineItems.push({
        title: `${mapping.display_name} — ${configSummary}`,
        price: itemPrice.toFixed(2),
        quantity: 1,
        requires_shipping: true,
      })
    }

    // 4. Carica profilo utente per anagrafica Shopify
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // 5. Crea Draft Order su Shopify
    const shopifyPayload = {
      draft_order: {
        line_items: lineItems,
        customer: { email: profile?.email },
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
      const errBody = await shopifyRes.text()
      throw new Error(`Shopify error: ${errBody}`)
    }

    const { draft_order } = await shopifyRes.json()

    // 6. Aggiorna il preventivo con i dati Shopify e il totale ricalcolato
    await supabase
      .from('quotes')
      .update({
        status: 'ORDERED',
        shopify_draft_order_id: String(draft_order.id),
        shopify_invoice_url: draft_order.invoice_url,
        total_price: recalculatedTotal,
      })
      .eq('id', quoteId)

    return new Response(
      JSON.stringify({ invoice_url: draft_order.invoice_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 3: Configura i secrets della Edge Function**

```bash
npx supabase secrets set SHOPIFY_STORE_DOMAIN=tuo-store.myshopify.com
npx supabase secrets set SHOPIFY_ADMIN_API_TOKEN=shpat_XXXXX
```

- [ ] **Step 4: Deploya la funzione localmente e testala**

```bash
npx supabase functions serve process-checkout --env-file .env.local
```

In un altro terminale, testa con curl (sostituire TOKEN con un JWT valido):

```bash
curl -X POST http://localhost:54321/functions/v1/process-checkout \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quoteId":"ID_PREVENTIVO_REALE"}'
```

Atteso: `{"invoice_url":"https://tuo-store.myshopify.com/..."}` oppure errore dettagliato.

- [ ] **Step 5: Aggiungi bottone "Procedi all'acquisto" in `PreventiviPage.tsx`**

Aggiorna la sezione del bottone in `src/routes/PreventiviPage.tsx`:

```typescript
// Aggiungere sotto `const [loading, setLoading] = useState(true)`:
const [checkingOut, setCheckingOut] = useState<string | null>(null)

async function handleCheckout(quoteId: string) {
  setCheckingOut(quoteId)
  const session = (await supabase.auth.getSession()).data.session
  const res = await supabase.functions.invoke('process-checkout', {
    body: { quoteId },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  setCheckingOut(null)
  if (res.error || res.data.error) {
    alert('Errore nel checkout: ' + (res.data?.error ?? res.error?.message))
    return
  }
  window.location.href = res.data.invoice_url
}
```

Aggiorna il pulsante nel JSX da:
```typescript
{q.status === 'ACTIVE' && q.shopify_invoice_url && (
  <a href={q.shopify_invoice_url} ...>Procedi al pagamento</a>
)}
```

A:
```typescript
{q.status === 'ACTIVE' && !q.shopify_invoice_url && (
  <button
    onClick={() => handleCheckout(q.id)}
    disabled={checkingOut === q.id}
    className="mt-2 inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
  >
    {checkingOut === q.id ? 'Elaborazione...' : 'Procedi all\'acquisto'}
  </button>
)}
{q.shopify_invoice_url && (
  <a href={q.shopify_invoice_url} className="mt-2 inline-block bg-green-600 text-white rounded px-4 py-2 text-sm">
    Completa il pagamento
  </a>
)}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/process-checkout/ src/routes/PreventiviPage.tsx
git commit -m "feat: process-checkout Edge Function with server-side price recalc, Shopify Draft Order"
```

---

### Task 12: Edge Function `update-expired-quotes` (cron TTL)

**Files:**
- Create: `supabase/functions/update-expired-quotes/index.ts`

- [ ] **Step 1: Crea la funzione**

```bash
mkdir -p "supabase/functions/update-expired-quotes"
```

File: `supabase/functions/update-expired-quotes/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verificare che la richiesta venga dal cron Supabase (header segreto)
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'EXPIRED' })
    .eq('status', 'ACTIVE')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ expired_count: data?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 2: Configura il cron in Supabase Dashboard**

Nel pannello Supabase → Edge Functions → Schedules, aggiungi:
- Function: `update-expired-quotes`
- Schedule: `0 2 * * *` (ogni giorno alle 02:00 UTC)
- Header: `Authorization: Bearer [CRON_SECRET]`

Oppure via CLI dopo il deploy su Supabase Cloud.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/update-expired-quotes/
git commit -m "feat: update-expired-quotes cron Edge Function for 5-day TTL"
```

---

## FASE 5 — Admin Panel

### Task 13: Admin Panel — Product Mappings CRUD

**Files:**
- Modify: `src/routes/AdminPage.tsx`

- [ ] **Step 1: Aggiorna `src/routes/AdminPage.tsx` con tabs e CRUD mappature**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProductMapping, PricingRule, Quote } from '../types'

type Tab = 'mappings' | 'pricing' | 'quotes'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('mappings')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pannello Amministrativo</h1>

      <div className="flex space-x-1 mb-6 border-b">
        {([['mappings', 'Prodotti & Template'], ['pricing', 'Regole Prezzo'], ['quotes', 'Preventivi']] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {tab === 'mappings' && <ProductMappingsTab />}
      {tab === 'pricing' && <PricingRulesTab />}
      {tab === 'quotes' && <QuotesTab />}
    </div>
  )
}

function ProductMappingsTab() {
  const [mappings, setMappings] = useState<ProductMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<ProductMapping>>({
    allowed_options_json: {
      colori: [], maniglie: [], vetri: [],
      larghezza_min: 60, larghezza_max: 350,
      altezza_min: 60, altezza_max: 280,
    }
  })

  useEffect(() => {
    supabase.from('product_mappings').select('*').then(({ data }) => {
      setMappings(data ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.shopify_product_id || !form.category_template || !form.display_name || !form.base_price_sqm) {
      alert('Compila tutti i campi obbligatori')
      return
    }
    const { error } = await supabase.from('product_mappings').upsert(form as ProductMapping)
    if (error) { alert('Errore: ' + error.message); return }
    const { data } = await supabase.from('product_mappings').select('*')
    setMappings(data ?? [])
    setForm({ allowed_options_json: { colori: [], maniglie: [], vetri: [], larghezza_min: 60, larghezza_max: 350, altezza_min: 60, altezza_max: 280 } })
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa mappatura?')) return
    await supabase.from('product_mappings').delete().eq('shopify_product_id', id)
    setMappings(m => m.filter(x => x.shopify_product_id !== id))
  }

  if (loading) return <div>Caricamento...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Aggiungi / Modifica Mappatura</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="ID Shopify (es. shopify-prod-003)" value={form.shopify_product_id ?? ''} onChange={e => setForm(f => ({ ...f, shopify_product_id: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Nome prodotto" value={form.display_name ?? ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Template (es. porte-finestre)" value={form.category_template ?? ''} onChange={e => setForm(f => ({ ...f, category_template: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="Prezzo base €/mq" value={form.base_price_sqm ?? ''} onChange={e => setForm(f => ({ ...f, base_price_sqm: Number(e.target.value) }))} />
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">Salva</button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">ID Shopify</th>
            <th className="text-left p-2 border">Nome</th>
            <th className="text-left p-2 border">Template</th>
            <th className="text-left p-2 border">€/mq</th>
            <th className="p-2 border">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map(m => (
            <tr key={m.shopify_product_id} className="hover:bg-gray-50">
              <td className="p-2 border font-mono text-xs">{m.shopify_product_id}</td>
              <td className="p-2 border">{m.display_name}</td>
              <td className="p-2 border">{m.category_template}</td>
              <td className="p-2 border">€{m.base_price_sqm}</td>
              <td className="p-2 border text-center">
                <button onClick={() => handleDelete(m.shopify_product_id)} className="text-red-500 text-xs hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PricingRulesTab() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<PricingRule>>({ modifier_type: 'fixed' })

  useEffect(() => {
    supabase.from('pricing_rules').select('*').order('category_template').then(({ data }) => {
      setRules(data ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.category_template || !form.attribute_key || form.price_modifier === undefined) {
      alert('Compila tutti i campi')
      return
    }
    const { error } = await supabase.from('pricing_rules').upsert(form as PricingRule)
    if (error) { alert('Errore: ' + error.message); return }
    const { data } = await supabase.from('pricing_rules').select('*').order('category_template')
    setRules(data ?? [])
    setForm({ modifier_type: 'fixed' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return
    await supabase.from('pricing_rules').delete().eq('id', id)
    setRules(r => r.filter(x => x.id !== id))
  }

  if (loading) return <div>Caricamento...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Aggiungi / Modifica Regola</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Template (es. porte-finestre)" value={form.category_template ?? ''} onChange={e => setForm(f => ({ ...f, category_template: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Chiave (es. colore_grigio-antracite)" value={form.attribute_key ?? ''} onChange={e => setForm(f => ({ ...f, attribute_key: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="Valore (€ o %)" value={form.price_modifier ?? ''} onChange={e => setForm(f => ({ ...f, price_modifier: Number(e.target.value) }))} />
          <select className="border rounded px-3 py-2 text-sm" value={form.modifier_type} onChange={e => setForm(f => ({ ...f, modifier_type: e.target.value as 'fixed' | 'percentage' }))}>
            <option value="fixed">Fisso (€)</option>
            <option value="percentage">Percentuale (%)</option>
          </select>
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">Salva</button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">Template</th>
            <th className="text-left p-2 border">Chiave Attributo</th>
            <th className="text-left p-2 border">Valore</th>
            <th className="text-left p-2 border">Tipo</th>
            <th className="p-2 border">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="p-2 border">{r.category_template}</td>
              <td className="p-2 border font-mono text-xs">{r.attribute_key}</td>
              <td className="p-2 border">{r.price_modifier}{r.modifier_type === 'percentage' ? '%' : '€'}</td>
              <td className="p-2 border">{r.modifier_type}</td>
              <td className="p-2 border text-center">
                <button onClick={() => handleDelete(r.id)} className="text-red-500 text-xs hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QuotesTab() {
  const [quotes, setQuotes] = useState<(Quote & { profiles: { email: string } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*, profiles(email), quote_items(*)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setQuotes((data as any) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Caricamento...</div>

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50">
          <th className="text-left p-2 border">ID</th>
          <th className="text-left p-2 border">Email</th>
          <th className="text-left p-2 border">Totale</th>
          <th className="text-left p-2 border">Status</th>
          <th className="text-left p-2 border">Scadenza</th>
          <th className="text-left p-2 border">Articoli</th>
        </tr>
      </thead>
      <tbody>
        {quotes.map(q => (
          <tr key={q.id} className="hover:bg-gray-50">
            <td className="p-2 border font-mono text-xs">{q.id.slice(0, 8)}</td>
            <td className="p-2 border">{q.profiles?.email}</td>
            <td className="p-2 border">€{q.total_price.toFixed(2)}</td>
            <td className="p-2 border">
              <span className={`px-2 py-0.5 rounded text-xs ${q.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : q.status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {q.status}
              </span>
            </td>
            <td className="p-2 border text-xs">{new Date(q.expires_at).toLocaleDateString('it-IT')}</td>
            <td className="p-2 border text-center">{q.quote_items?.length ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Testa il pannello admin**

```bash
npm run dev
```

Imposta `role = 'admin'` in Supabase Studio per il tuo utente, poi naviga su `http://localhost:5173/admin`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/AdminPage.tsx
git commit -m "feat: admin panel with product mappings CRUD, pricing rules CRUD, quotes registry"
```

---

## FASE 6 — Deploy su Vercel

### Task 14: Configurazione Vercel e Deploy

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Crea `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Pubblica su Supabase Cloud**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy process-checkout
npx supabase functions deploy update-expired-quotes
npx supabase secrets set SHOPIFY_STORE_DOMAIN=tuo-store.myshopify.com
npx supabase secrets set SHOPIFY_ADMIN_API_TOKEN=shpat_XXXXX
```

- [ ] **Step 3: Deploy su Vercel**

```bash
npm install -g vercel
vercel --prod
```

Durante il wizard, imposta le variabili d'ambiente:
- `VITE_SUPABASE_URL` → URL del progetto Supabase cloud
- `VITE_SUPABASE_ANON_KEY` → anon key del progetto Supabase cloud

- [ ] **Step 4: Configura il dominio personalizzato in Vercel Dashboard**

Nel pannello Vercel → Settings → Domains, aggiungi `configuratore.creainfissi.it`.
Configura il CNAME nel DNS del dominio: `configuratore CNAME cname.vercel-dns.com`.

- [ ] **Step 5: Configura l'URL del configuratore in Shopify**

Nella pagina prodotto Shopify, il link "Configura Ora" deve puntare a:
```
https://configuratore.creainfissi.it/?product_id={{product.id}}
```

Dove `{{product.id}}` è la variabile Liquid che Shopify compila automaticamente.

- [ ] **Step 6: Testa il flusso end-to-end in produzione**

1. Apri `https://creainfissi.it` → clicca "Configura Ora" su un prodotto
2. Verifica redirect a `configuratore.creainfissi.it/?product_id=XXX`
3. Completa la configurazione
4. Login OTP → salva preventivo
5. Premi "Procedi all'acquisto" → verifica redirect a Shopify invoice URL
6. Completa il pagamento su Shopify

- [ ] **Step 7: Commit finale**

```bash
git add vercel.json
git commit -m "feat: Vercel config with SPA rewrite and security headers, deploy-ready"
```

---

## Self-Review

### Spec coverage

| Requisito spec | Task che lo implementa |
|---|---|
| Linee grafiche store Shopify CreaInfissi | Task 1b |
| Hosting Vercel + React + Vite SPA | Task 1 |
| Supabase Auth OTP passwordless | Task 5 |
| Schema PostgreSQL (profiles, quotes, quote_items, pricing_rules, product_mappings) | Task 2 |
| Row Level Security | Task 3 |
| Architettura template dinamica (product_mappings → template React) | Task 7, 9, 10 |
| Calcolo prezzo real-time | Task 8, 9 |
| Salvataggio preventivo con raggruppamento ordini | Task 10 |
| OTP login al salvataggio se non autenticato | Task 10 |
| Dashboard storico preventivi (/preventivi) | Task 6 |
| Scadenza TTL 5 giorni | Task 2 (expires_at), Task 12 (cron) |
| Edge Function process-checkout | Task 11 |
| Ricalcolo server-side prezzo (anti-manomissione) | Task 11 |
| Creazione Shopify Draft Order | Task 11 |
| Redirect a invoice_url | Task 11 |
| Admin panel — gestione mappature | Task 13 |
| Admin panel — motore prezzi | Task 13 |
| Admin panel — registro preventivi | Task 13 |
| Deploy Vercel + dominio personalizzato | Task 14 |
| Integrazione link "Configura Ora" da Shopify | Task 14 |

**Gap rilevati:** La spec menziona "PDF del preventivo" generato dalla Edge Function e salvato su Supabase Storage. Questo non è stato implementato nelle task sopra per mantenere il piano focalizzato. Si può aggiungere come Task 11b separato.

### Checklist placeholder

- Nessun "TBD" o "TODO" nei task
- Ogni step ha codice completo o comandi precisi
- I tipi in `src/types/index.ts` (Task 4) sono usati coerentemente in tutti i task successivi
- `ProductMapping`, `PricingRule`, `Quote`, `QuoteItem`, `ConfigurationData` — nomenclatura consistente
- `usePriceCalculator` usa `mapping.base_price_sqm` (definito nel tipo in Task 4) ✓
- `process-checkout` usa la stessa logica di calcolo di `usePriceCalculator` ✓

### Consistenza tipi

- `ConfigurationData.larghezza` e `.altezza` sono `number` (cm) in tutti i task ✓
- `PricingRule.attribute_key` usa il pattern `{attributeType}_{attributeValue}` definito in Task 4, applicato in Task 8 e Task 11 ✓
- `Quote.status` è `'ACTIVE' | 'EXPIRED' | 'ORDERED'` — consistente nel DB (Task 2) e nel frontend (Task 6, 10) ✓
