import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  Prodotto, ProdottoConfig, TipoListino,
  CatalogoConfig, SuMisuraConfig,
  CatalogoVariante, SuMisuraOpzione, SuMisuraValore,
} from '../../types'
import { labelStyle, subTitleStyle, cancelBtnStyle, deleteBtnStyle, slugify } from './ui'
import GrigliaConfigEditor from './GrigliaConfigEditor'

const BUCKET = 'listini-assets'

function defaultConfig(tipo: TipoListino): ProdottoConfig {
  switch (tipo) {
    case 'catalogo-prodotti':
      return { tipo: 'catalogo-prodotti', prezzo: 0, varianti: [] }
    case 'griglia':
      return { tipo: 'griglia', unita: 'mm', griglia: { larghezze: [], altezze: [], prezzi: [] }, gruppi: [], accessori_extra: [] }
    case 'prodotti-su-misura':
    default:
      return { tipo: 'prodotti-su-misura', base_price_sqm: 0, larghezza_min: 60, larghezza_max: 350, altezza_min: 60, altezza_max: 280, opzioni: [] }
  }
}

export default function ProdottoEditor({ listinoId, listinoTipo, prodotto, onClose, onSaved }: {
  listinoId: string
  listinoTipo: TipoListino
  prodotto: Prodotto | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(prodotto?.nome ?? '')
  const [slug, setSlug] = useState(prodotto?.slug ?? '')
  const [imageUrl, setImageUrl] = useState(prodotto?.image_url ?? '')
  const [pdfUrl, setPdfUrl] = useState(prodotto?.pdf_url ?? '')
  const [config, setConfig] = useState<ProdottoConfig>(
    prodotto?.config_json && prodotto.config_json.tipo === listinoTipo
      ? prodotto.config_json
      : defaultConfig(listinoTipo)
  )
  const [uploading, setUploading] = useState<'image' | 'pdf' | null>(null)
  const [saving, setSaving] = useState(false)

  async function uploadFile(file: File, kind: 'image' | 'pdf') {
    setUploading(kind)
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${listinoId}/${slugify(nome) || 'prodotto'}-${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    setUploading(null)
    if (error) { alert(`Upload fallito: ${error.message}`); return }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    if (kind === 'image') setImageUrl(data.publicUrl)
    else setPdfUrl(data.publicUrl)
  }

  async function save() {
    const n = nome.trim()
    const s = (slug.trim() || slugify(n))
    if (!n || !s) { alert('Inserisci almeno il nome del prodotto'); return }
    setSaving(true)
    const baseRow = { nome: n, image_url: imageUrl || null, pdf_url: pdfUrl || null, config_json: config }
    const { error } = prodotto
      ? await supabase.from('prodotti').update(baseRow).eq('id', prodotto.id)
      : await supabase.from('prodotti').insert({ listino_id: listinoId, slug: s, ordinamento: 0, ...baseRow })
    setSaving(false)
    if (error) { alert(error.message); return }
    onSaved()
  }

  return (
    <div className="ci-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={sectionTitleStyle}>{prodotto ? `Modifica prodotto: ${prodotto.nome}` : 'Nuovo prodotto'}</h2>
        <button type="button" onClick={onClose} style={cancelBtnStyle}>Annulla</button>
      </div>

      {/* Anagrafica + immagine */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Immagine</label>
          <div style={{ width: '160px', height: '160px', border: '1px dashed var(--ci-border)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ci-bg)' }}>
            {imageUrl
              ? <img src={imageUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '0.75rem', color: 'var(--ci-text-muted)', textAlign: 'center', padding: '0.5rem' }}>Nessuna immagine</span>}
          </div>
          <label className="ci-btn ci-btn--teal" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            {uploading === 'image' ? 'Caricamento…' : (imageUrl ? 'Sostituisci' : 'Carica immagine')}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'image') }} />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Nome prodotto</label>
            <input className="ci-input" placeholder="es. Finestra 1 anta PVC" value={nome}
              onChange={e => { setNome(e.target.value); if (!prodotto) setSlug(slugify(e.target.value)) }} />
          </div>
          <div>
            <label style={labelStyle}>Slug</label>
            <input className="ci-input" value={slug} onChange={e => setSlug(e.target.value)} disabled={!!prodotto} />
          </div>
          {listinoTipo === 'griglia' && (
            <div>
              <label style={labelStyle}>PDF listino (opzionale)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ ...cancelBtnStyle, cursor: 'pointer' }}>
                  {uploading === 'pdf' ? 'Caricamento…' : 'Carica PDF'}
                  <input type="file" accept="application/pdf" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'pdf') }} />
                </label>
                {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--ci-teal)' }}>Apri PDF →</a>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config per tipo */}
      <div style={{ borderTop: '1px solid var(--ci-border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
        {config.tipo === 'catalogo-prodotti' && <CatalogoSubEditor value={config} onChange={setConfig} />}
        {config.tipo === 'griglia' && <GrigliaConfigEditor value={config} onChange={setConfig} />}
        {config.tipo === 'prodotti-su-misura' && <SuMisuraSubEditor value={config} onChange={setConfig} />}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="button" onClick={save} disabled={saving} className="ci-btn ci-btn--teal">
          {saving ? 'Salvataggio…' : (prodotto ? 'Aggiorna prodotto' : 'Crea prodotto')}
        </button>
        <button type="button" onClick={onClose} style={cancelBtnStyle}>Annulla</button>
      </div>
    </div>
  )
}

/* ── Catalogo: prezzo fisso + varianti ── */
function CatalogoSubEditor({ value, onChange }: { value: CatalogoConfig; onChange: (c: CatalogoConfig) => void }) {
  function setVarianti(varianti: CatalogoVariante[]) { onChange({ ...value, varianti }) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ maxWidth: '220px' }}>
        <label style={labelStyle}>Prezzo (€)</label>
        <input className="ci-input" type="number" value={value.prezzo} onChange={e => onChange({ ...value, prezzo: Number(e.target.value) })} />
      </div>
      <div>
        <h3 style={subTitleStyle}>Varianti (opzionali)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {value.varianti.map((v, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Etichetta</label>
                <input className="ci-input" placeholder="es. Maniglia premium" value={v.label}
                  onChange={e => setVarianti(value.varianti.map((x, k) => k === idx ? { ...x, label: e.target.value } : x))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Δ Prezzo (€)</label>
                <input className="ci-input" type="number" value={v.delta}
                  onChange={e => setVarianti(value.varianti.map((x, k) => k === idx ? { ...x, delta: Number(e.target.value) } : x))} />
              </div>
              <button type="button" onClick={() => setVarianti(value.varianti.filter((_, k) => k !== idx))} style={{ ...deleteBtnStyle, paddingBottom: '0.5rem' }}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setVarianti([...value.varianti, { label: '', delta: 0 }])}
          style={{ marginTop: '0.5rem', background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          + Variante
        </button>
      </div>
    </div>
  )
}

/* ── Su misura: €/mq + misure + opzioni ── */
function SuMisuraSubEditor({ value, onChange }: { value: SuMisuraConfig; onChange: (c: SuMisuraConfig) => void }) {
  function setOpzioni(opzioni: SuMisuraOpzione[]) { onChange({ ...value, opzioni }) }
  function addOpzione() {
    onChange({ ...value, opzioni: [...value.opzioni, { key: `opzione-${value.opzioni.length + 1}`, label: '', valori: [] }] })
  }
  function updateOpzione(idx: number, patch: Partial<SuMisuraOpzione>) {
    setOpzioni(value.opzioni.map((o, k) => k === idx ? { ...o, ...patch } : o))
  }
  function addValore(idx: number) {
    const o = value.opzioni[idx]
    updateOpzione(idx, { valori: [...o.valori, { value: '', modifier_type: 'fixed', price_modifier: 0 }] })
  }
  function updateValore(oi: number, vi: number, patch: Partial<SuMisuraValore>) {
    const o = value.opzioni[oi]
    updateOpzione(oi, { valori: o.valori.map((v, k) => k === vi ? { ...v, ...patch } : v) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Prezzo (€/mq)</label>
          <input className="ci-input" type="number" value={value.base_price_sqm} onChange={e => onChange({ ...value, base_price_sqm: Number(e.target.value) })} />
        </div>
        {(['larghezza_min', 'larghezza_max', 'altezza_min', 'altezza_max'] as const).map(f => (
          <div key={f}>
            <label style={labelStyle}>{f.replace('_', ' ')} (cm)</label>
            <input className="ci-input" type="number" value={value[f]} onChange={e => onChange({ ...value, [f]: Number(e.target.value) })} />
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ ...subTitleStyle, marginBottom: 0 }}>Opzioni configurabili</h3>
          <button type="button" onClick={addOpzione} className="ci-btn ci-btn--teal" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>+ Opzione</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {value.opzioni.map((o, oi) => (
            <div key={oi} style={{ border: '1px solid var(--ci-border)', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Etichetta opzione</label>
                  <input className="ci-input" placeholder="es. Colore" value={o.label}
                    onChange={e => updateOpzione(oi, { label: e.target.value, key: slugify(e.target.value) || o.key })} />
                </div>
                <button type="button" onClick={() => setOpzioni(value.opzioni.filter((_, k) => k !== oi))} style={deleteBtnStyle}>Rimuovi</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {o.valori.map((v, vi) => (
                  <div key={vi} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle}>Valore</label>
                      <input className="ci-input" placeholder="es. antracite" value={v.value} onChange={e => updateValore(oi, vi, { value: e.target.value })} style={{ fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Tipo</label>
                      <select className="ci-input" value={v.modifier_type} onChange={e => updateValore(oi, vi, { modifier_type: e.target.value as SuMisuraValore['modifier_type'] })} style={{ fontSize: '0.85rem' }}>
                        <option value="fixed">€ fisso</option>
                        <option value="percentage">% sul base</option>
                      </select>
                    </div>
                    <div style={{ flex: '0 1 90px' }}>
                      <label style={labelStyle}>Valore mod.</label>
                      <input className="ci-input" type="number" value={v.price_modifier} onChange={e => updateValore(oi, vi, { price_modifier: Number(e.target.value) })} style={{ fontSize: '0.85rem' }} />
                    </div>
                    <button type="button" onClick={() => updateOpzione(oi, { valori: o.valori.filter((_, k) => k !== vi) })} style={{ ...deleteBtnStyle, paddingBottom: '0.5rem' }}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addValore(oi)} style={{ marginTop: '0.5rem', background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                + Valore
              </button>
            </div>
          ))}
          {value.opzioni.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)', fontStyle: 'italic' }}>Nessuna opzione.</p>}
        </div>
      </div>
    </div>
  )
}

const sectionTitleStyle: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ci-graphite)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }
