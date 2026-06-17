# Listino a griglia — Fase 1 (authoring nel pannello admin)

Data: 2026-06-17
Stato: design approvato, pronto per il piano di implementazione

## Obiettivo

Permettere all'amministratore di creare e gestire un **listino a griglia** completo dal
pannello admin: caricare il PDF del listino cartaceo e un'immagine, definire la matrice
dei prezzi base per misura, e configurare le maggiorazioni (vetri, finiture, accessori).
Il calcolo del prezzo deve essere verificabile subito tramite la tab **Simulatore
Configurazione**.

**Fuori scope (Fase 2, rimandata):** il template lato cliente nel configuratore
(`ConfiguratorPage`) che fa scegliere le opzioni e mostra il prezzo. Questa fase produce
solo i dati e la verifica via simulatore.

## Contesto esistente

- I listini stanno in `public.listini` con `options_json` (JSONB) che contiene
  `tipo` (`griglia` | `catalogo-prodotti` | `prodotti-su-misura`), `opzioni[]`, e i limiti
  dimensionali. Oggi il ramo `griglia` del form mostra solo un placeholder.
- Le maggiorazioni dei listini su-misura stanno in `public.pricing_rules`
  (`fixed` | `percentage`). **Questa tabella non viene toccata.** La griglia porta i propri
  dati di prezzo dentro `options_json` e usa un calcolatore dedicato.
- Non esiste ancora alcun bucket Supabase Storage.
- La tab Simulatore (`SimulatoreTab` in `src/routes/AdminPage.tsx`) oggi calcola solo la
  formula su-misura (€/mq × superficie + pricing_rules).

## Decisioni di modello

- **Unità di misura: millimetri (mm)** per tutta la griglia, come sui listini cartacei.
  La conversione a m² (per le maggiorazioni €/mq) avviene nel calcolatore (mm → m: ÷1000).
- **Percentuale** = % calcolata sul **prezzo base di griglia** (non a cascata sulle altre
  maggiorazioni): indipendente dall'ordine.
- **Metro lineare**: lunghezza di riferimento configurabile per singola maggiorazione
  (`larghezza` | `altezza` | `perimetro`), default `larghezza`. Perimetro = 2×(L+H).
- **Gruppi a scelta singola**: Vetro, Finitura interna, Finitura esterna, Accessori-finitura.
  Una sola maggiorazione attiva per gruppo.
- **Accessori extra**: scelta multipla, ciascuno con quantità inserita dal cliente
  (rilevante in Fase 2; in Fase 1/simulatore la quantità è un input).

## Modello dati — `options_json` per `tipo: 'griglia'`

```ts
interface GrigliaOptions {
  tipo: 'griglia'
  unita: 'mm'
  pdf_url?: string
  image_url?: string
  griglia: {
    larghezze: number[]      // soglie crescenti (righe), in mm
    altezze: number[]        // soglie crescenti (colonne), in mm
    prezzi: number[][]       // prezzi[indiceLarghezza][indiceAltezza], in €
  }
  gruppi: Gruppo[]           // scelta singola
  accessori_extra: Maggiorazione[]  // scelta multipla
}

interface Gruppo {
  key: string                // es. 'vetro'
  label: string              // es. 'Vetro'
  valori: Maggiorazione[]
}

interface Maggiorazione {
  key: string
  label: string
  tipo: 'fisso' | 'percentuale' | 'mq' | 'pezzo' | 'ml'
  importo: number
  ml_rif?: 'larghezza' | 'altezza' | 'perimetro'  // solo se tipo === 'ml'
}
```

Le interfacce esistenti (`AllowedOptions`, `OptionGroup`) restano per gli altri tipi.
`GrigliaOptions` è un tipo separato; `options_json` resta `jsonb` lato DB (nessuna
migration sullo schema della tabella `listini`).

## Logica di prezzo (calcolatore condiviso)

Funzione pura riutilizzabile (es. `src/lib/grigliaPricing.ts`), usata dal simulatore ora e
dal configuratore in Fase 2.

Input: `GrigliaOptions`, larghezza/altezza reali (mm), scelta per ogni gruppo, lista
accessori extra selezionati con quantità.

1. **Prezzo base**: trova la più piccola soglia `larghezze[i] >= larghezza` e la più piccola
   `altezze[j] >= altezza`; leggi `prezzi[i][j]`. Misure ≤ soglia minima usano la cella
   minima. Se larghezza o altezza superano la soglia massima → stato **fuori listino**
   (nessun prezzo; in Fase 2 blocca il salvataggio).
2. **Maggiorazioni** (sommate al base, mai a cascata):
   - `fisso` → `+importo`
   - `percentuale` → `+ base × importo / 100`
   - `mq` → `+ importo × (larghezza_mm/1000) × (altezza_mm/1000)` (misure reali)
   - `pezzo` → `+ importo × quantità` (×1 per i gruppi a scelta singola)
   - `ml` → `+ importo × (lunghezza_rif in metri)`, dove la lunghezza dipende da `ml_rif`
3. **Totale** = `base + Σ maggiorazioni`, arrotondato a 2 decimali.

Il calcolatore ritorna anche il **dettaglio** (base + ogni voce con il suo delta) per il
riepilogo del simulatore, e un flag `fuoriListino`.

## Storage file

Nuova migration: bucket `listini-assets` su Supabase Storage.
- Lettura pubblica (le immagini/PDF servono in chiaro).
- Scrittura/eliminazione solo admin (policy basata su `public.is_admin()`, coerente con le
  altre policy).
- L'admin carica PDF e immagine via `supabase.storage`; gli URL pubblici risultanti vengono
  salvati in `options_json.pdf_url` / `image_url`.

## UI pannello admin (ramo `griglia` del form listino)

Sostituisce il placeholder attuale nel form listino di `ListiniTab` quando il tipo è
`griglia`. Sezioni:

1. **File**: upload PDF (con link "apri") + upload immagine (con anteprima). Mostra lo stato
   di caricamento e consente la sostituzione.
2. **Soglie misure**: due liste editabili di soglie in mm — larghezze (righe) e altezze
   (colonne). Aggiungi/rimuovi soglia; mantenute ordinate.
3. **Matrice prezzi**: tabella larghezze × altezze con un input numerico per cella (€).
   Le celle si rigenerano quando cambiano le soglie, preservando i valori già inseriti
   dove possibile.
4. **Gruppi a scelta singola**: per ciascun gruppo (Vetro, Finitura interna, Finitura
   esterna, Accessori-finitura) elenco di valori; ogni valore ha label, tipo maggiorazione
   e importo (+ `ml_rif` se ml). Aggiungi/rimuovi gruppo e valore.
5. **Accessori extra**: lista di maggiorazioni multiple, stessa struttura (label, tipo,
   importo, `ml_rif`).

Salvataggio: l'intero `GrigliaOptions` viene serializzato in `options_json` con
l'`upsert`/`update` già esistente in `saveListino`.

## Estensione del Simulatore

`SimulatoreTab` deve riconoscere il tipo del listino selezionato:
- Se `tipo === 'griglia'`: usa il calcolatore griglia. Input: larghezza/altezza (mm),
  un select per ciascun gruppo a scelta singola, checkbox+quantità per gli accessori extra.
  Mostra il riepilogo (base di griglia + ogni maggiorazione con delta + totale, o
  "fuori listino"). Non richiede il campo "prezzo base €/mq".
- Altrimenti: comportamento attuale (formula su-misura €/mq + pricing_rules).

## Componenti e file coinvolti

- `src/types/index.ts` — aggiungere `GrigliaOptions`, `Gruppo`, `Maggiorazione`,
  `MaggiorazioneTipo`.
- `src/lib/grigliaPricing.ts` — calcolatore puro + tipi del risultato (nuovo).
- `supabase/migrations/<ts>_storage_listini_assets.sql` — bucket + policy (nuovo).
- `src/routes/AdminPage.tsx` — ramo `griglia` del form listino + estensione `SimulatoreTab`.
  Se il file cresce troppo, estrarre l'editor griglia in un componente dedicato
  (`src/components/admin/GrigliaEditor.tsx`).

## Test

- Test unitari del calcolatore (`grigliaPricing`): arrotondamento a soglia superiore su
  entrambe le dimensioni, caso fuori listino, ciascun tipo di maggiorazione, somma totale,
  conversione mm→m per mq e ml (con i tre `ml_rif`).
- Verifica manuale via Simulatore con un listino di esempio.

## Rischi / note

- Mix di unità nell'app (cm per su-misura, mm per griglia): isolato dentro il calcolatore
  griglia e il suo ramo di UI; nessuna logica condivisa converte tra i due.
- Griglie grandi: la matrice è in `options_json`; dimensioni realistiche (es. 10×10 = 100
  celle) restano ben sotto i limiti pratici di una riga JSONB.
