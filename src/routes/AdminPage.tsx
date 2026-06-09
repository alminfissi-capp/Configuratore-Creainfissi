import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductMapping, PricingRule, Quote, AllowedOptions, OptionGroup, TipoListino } from '../types'

type Tab = 'listini' | 'prodotti' | 'pricing' | 'quotes'

interface Famiglia {
  id: string
  nome: string
  slug: string
  created_at: string
}

interface Listino {
  id: string
  famiglia_id: string
  nome: string
  slug: string
  options_json: AllowedOptions
  created_at: string
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('listini')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'listini', label: 'Listini' },
    { key: 'prodotti', label: 'Prodotti' },
    { key: 'pricing', label: 'Regole Prezzo' },
    { key: 'quotes', label: 'Preventivi' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ci-graphite)', marginBottom: '1.5rem' }}>
        Pannello Amministrativo
      </h1>
      <div style={{ display: 'flex', borderBottom: '2px solid var(--ci-border)', marginBottom: '2rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: tab === t.key ? 600 : 400,
            fontSize: '0.875rem', color: tab === t.key ? 'var(--ci-teal)' : 'var(--ci-text-muted)',
            background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid var(--ci-teal)' : '2px solid transparent',
            marginBottom: '-2px', padding: '0.75rem 1.25rem', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'listini' && <ListiniTab />}
      {tab === 'prodotti' && <ProdottiTab />}
      {tab === 'pricing' && <PricingRulesTab />}
      {tab === 'quotes' && <QuotesTab />}
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB LISTINI  (famiglie → listini drill-down)
══════════════════════════════════════════════ */

const TIPI_LISTINO: { tipo: TipoListino; label: string; desc: string; icon: string }[] = [
  {
    tipo: 'griglia',
    label: 'Griglia',
    desc: 'Prezzi fissi per combinazioni di misure standard (es. 60×90, 80×120…)',
    icon: '⊞',
  },
  {
    tipo: 'catalogo-prodotti',
    label: 'Catalogo Prodotti',
    desc: 'Prodotti con foto, varianti e prezzo fisso senza misure personalizzabili.',
    icon: '📋',
  },
  {
    tipo: 'prodotti-su-misura',
    label: 'Prodotti su Misura',
    desc: 'Configuratore con larghezza × altezza personalizzate e opzioni a scelta.',
    icon: '📐',
  },
]

function tipoBadge(tipo: TipoListino | undefined) {
  const t = TIPI_LISTINO.find(x => x.tipo === tipo)
  return t ? (
    <span style={{ background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', borderRadius: '4px', padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: 600, marginLeft: '0.5rem' }}>
      {t.icon} {t.label}
    </span>
  ) : null
}

function ListiniTab() {
  const [famiglie, setFamiglie] = useState<Famiglia[]>([])
  const [listiniMap, setListiniMap] = useState<Record<string, Listino[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedFamiglia, setSelectedFamiglia] = useState<Famiglia | null>(null)
  const [showFamigliaForm, setShowFamigliaForm] = useState(false)
  const [showTipoSelezione, setShowTipoSelezione] = useState(false)
  const [showListinoForm, setShowListinoForm] = useState(false)
  const [editingListino, setEditingListino] = useState<Listino | null>(null)

  // Famiglia form state
  const [fNome, setFNome] = useState('')
  const [fSlug, setFSlug] = useState('')

  // Listino form state
  const [lNome, setLNome] = useState('')
  const [lSlug, setLSlug] = useState('')
  const [lOpts, setLOpts] = useState<AllowedOptions>(emptyOptions())
  const [newGroupKey, setNewGroupKey] = useState('')
  const [newGroupLabel, setNewGroupLabel] = useState('')
  const [newValueByGroup, setNewValueByGroup] = useState<Record<string, string>>({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: fam } = await supabase.from('famiglie').select('*').order('created_at')
    const { data: lst } = await supabase.from('listini').select('*').order('created_at')
    const fams = (fam ?? []) as Famiglia[]
    const lsts = (lst ?? []) as Listino[]
    setFamiglie(fams)
    const map: Record<string, Listino[]> = {}
    fams.forEach(f => { map[f.id] = lsts.filter(l => l.famiglia_id === f.id) })
    setListiniMap(map)
    setLoading(false)
  }

  // ── Famiglia CRUD ──
  async function saveFamiglia() {
    const nome = fNome.trim()
    const slug = fSlug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!nome || !slug) { alert('Inserisci nome e slug'); return }
    const { error } = await supabase.from('famiglie').insert({ nome, slug })
    if (error) { alert(error.message); return }
    setFNome(''); setFSlug(''); setShowFamigliaForm(false)
    loadAll()
  }

  async function deleteFamiglia(f: Famiglia) {
    if (!confirm(`Eliminare la famiglia "${f.nome}" e tutti i suoi listini?`)) return
    await supabase.from('famiglie').delete().eq('id', f.id)
    setSelectedFamiglia(null)
    loadAll()
  }

  // ── Listino CRUD ──
  function openTipoSelezione() {
    setEditingListino(null)
    setLNome(''); setLSlug(''); setLOpts(emptyOptions())
    setNewGroupKey(''); setNewGroupLabel(''); setNewValueByGroup({})
    setShowListinoForm(false)
    setShowTipoSelezione(true)
  }

  function selectTipo(tipo: TipoListino) {
    setLOpts(emptyOptions(tipo))
    setShowTipoSelezione(false)
    setShowListinoForm(true)
  }

  function openEditListino(l: Listino) {
    setEditingListino(l)
    setLNome(l.nome); setLSlug(l.slug); setLOpts(l.options_json)
    setNewGroupKey(''); setNewGroupLabel(''); setNewValueByGroup({})
    setShowTipoSelezione(false)
    setShowListinoForm(true)
  }

  async function saveListino() {
    if (!selectedFamiglia) return
    const nome = lNome.trim()
    const slug = lSlug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!nome || !slug) { alert('Inserisci nome e slug'); return }
    const payload = { famiglia_id: selectedFamiglia.id, nome, slug, options_json: lOpts }
    const { error } = editingListino
      ? await supabase.from('listini').update({ nome, options_json: lOpts }).eq('id', editingListino.id)
      : await supabase.from('listini').insert(payload)
    if (error) { alert(error.message); return }
    setShowListinoForm(false); setEditingListino(null)
    loadAll()
  }

  async function deleteListino(l: Listino) {
    if (!confirm(`Eliminare il listino "${l.nome}"?`)) return
    await supabase.from('listini').delete().eq('id', l.id)
    loadAll()
  }

  // ── Option group helpers ──
  function addGroup() {
    const key = newGroupKey.trim().toLowerCase().replace(/\s+/g, '-')
    const label = newGroupLabel.trim()
    if (!key || !label) return
    if (lOpts.opzioni.find(g => g.key === key)) { alert('Chiave già esistente'); return }
    setLOpts(o => ({ ...o, opzioni: [...o.opzioni, { key, label, values: [] }] }))
    setNewGroupKey(''); setNewGroupLabel('')
  }
  function removeGroup(key: string) { setLOpts(o => ({ ...o, opzioni: o.opzioni.filter(g => g.key !== key) })) }
  function addValue(groupKey: string) {
    const val = (newValueByGroup[groupKey] ?? '').trim().toLowerCase().replace(/\s+/g, '-')
    if (!val) return
    setLOpts(o => ({ ...o, opzioni: o.opzioni.map(g => g.key === groupKey ? { ...g, values: [...g.values, val] } : g) }))
    setNewValueByGroup(v => ({ ...v, [groupKey]: '' }))
  }
  function removeValue(groupKey: string, val: string) {
    setLOpts(o => ({ ...o, opzioni: o.opzioni.map(g => g.key === groupKey ? { ...g, values: g.values.filter(v => v !== val) } : g) }))
  }

  if (loading) return <LoadingSkeleton />

  // ── Vista listini di una famiglia ──
  if (selectedFamiglia) {
    const listini = listiniMap[selectedFamiglia.id] ?? []
    const tipoCorrente = lOpts.tipo
    const tipoInfo = TIPI_LISTINO.find(t => t.tipo === tipoCorrente)
    return (
      <div>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button onClick={() => { setSelectedFamiglia(null); setShowListinoForm(false); setShowTipoSelezione(false) }} style={{ ...editBtnStyle, fontSize: '0.875rem' }}>
            ← Famiglie
          </button>
          <span style={{ color: 'var(--ci-text-muted)' }}>/</span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: 'var(--ci-graphite)' }}>{selectedFamiglia.nome}</span>
        </div>

        {/* Selezione tipo */}
        {showTipoSelezione && (
          <div className="ci-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={sectionTitleStyle}>Che tipo di listino vuoi creare?</h2>
              <button onClick={() => setShowTipoSelezione(false)} style={cancelBtnStyle}>Annulla</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
              {TIPI_LISTINO.map(t => (
                <button key={t.tipo} onClick={() => selectTipo(t.tipo)} style={{
                  border: '2px solid var(--ci-border)', borderRadius: '10px', padding: '1.5rem 1.25rem',
                  background: 'var(--ci-bg)', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ci-teal)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px var(--ci-teal-light)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ci-border)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}>
                  <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{t.icon}</span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ci-graphite)' }}>{t.label}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)', lineHeight: 1.4 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form listino */}
        {showListinoForm && (
          <div className="ci-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={sectionTitleStyle}>{editingListino ? `Modifica: ${editingListino.nome}` : 'Nuovo listino'}</h2>
              {tipoInfo && (
                <span style={{ background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {tipoInfo.icon} {tipoInfo.label}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Nome listino</label>
                <input className="ci-input" placeholder="es. PVC Base, Alluminio Premium" value={lNome} onChange={e => setLNome(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Slug (identificatore)</label>
                <input className="ci-input" placeholder="es. pvc-base" value={lSlug} onChange={e => setLSlug(e.target.value)} disabled={!!editingListino} />
              </div>
            </div>

            {tipoCorrente === 'prodotti-su-misura' && (
              <>
                <h3 style={subTitleStyle}>Dimensioni</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {(['larghezza_min','larghezza_max','altezza_min','altezza_max'] as const).map(f => (
                    <div key={f}>
                      <label style={labelStyle}>{f.replace('_',' ')} (cm)</label>
                      <input className="ci-input" type="number" value={lOpts[f]} onChange={e => setLOpts(o => ({ ...o, [f]: Number(e.target.value) }))} />
                    </div>
                  ))}
                </div>

                <h3 style={subTitleStyle}>Campi configuratore</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {lOpts.opzioni.map(group => (
                    <OptionGroupEditor key={group.key} group={group}
                      newValue={newValueByGroup[group.key] ?? ''}
                      onNewValueChange={v => setNewValueByGroup(p => ({ ...p, [group.key]: v }))}
                      onAddValue={() => addValue(group.key)}
                      onRemoveValue={val => removeValue(group.key, val)}
                      onRemoveGroup={() => removeGroup(group.key)} />
                  ))}
                  {lOpts.opzioni.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)', fontStyle: 'italic' }}>Nessun campo aggiunto.</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: 'var(--ci-bg)', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Chiave (es. colore, vetro)</label>
                    <input className="ci-input" placeholder="colore" value={newGroupKey} onChange={e => setNewGroupKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Etichetta (mostrata al cliente)</label>
                    <input className="ci-input" placeholder="Colore" value={newGroupLabel} onChange={e => setNewGroupLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} />
                  </div>
                  <button onClick={addGroup} className="ci-btn ci-btn--teal" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>+ Campo</button>
                </div>
              </>
            )}

            {(tipoCorrente === 'griglia' || tipoCorrente === 'catalogo-prodotti') && (
              <div style={{ background: 'var(--ci-bg)', border: '1px dashed var(--ci-border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center', color: 'var(--ci-text-muted)', fontSize: '0.875rem' }}>
                La configurazione dettagliata per <strong>{tipoInfo?.label}</strong> sarà disponibile nelle prossime versioni.<br />
                Per ora puoi già creare il listino e impostarne il nome.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={saveListino} className="ci-btn ci-btn--teal">{editingListino ? 'Aggiorna' : 'Crea listino'}</button>
              <button onClick={() => { setShowListinoForm(false); setEditingListino(null) }} style={cancelBtnStyle}>Annulla</button>
            </div>
          </div>
        )}

        {/* Bottone nuovo listino (solo se nessun form aperto) */}
        {!showListinoForm && !showTipoSelezione && (
          <button onClick={openTipoSelezione} className="ci-btn ci-btn--teal" style={{ marginBottom: '1.5rem' }}>
            + Nuovo listino
          </button>
        )}

        {/* Lista listini */}
        {listini.length === 0 && !showListinoForm && !showTipoSelezione ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ci-text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
            Nessun listino. Clicca "+ Nuovo listino" per iniziare.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {listini.map(l => (
              <div key={l.id} className="ci-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: 'var(--ci-graphite)' }}>{l.nome}</span>
                  <code style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--ci-text-muted)', background: 'var(--ci-bg)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{l.slug}</code>
                  {tipoBadge(l.options_json?.tipo)}
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--ci-text-muted)' }}>
                    {l.options_json?.opzioni?.map(g => g.label).join(', ') || ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => openEditListino(l)} style={editBtnStyle}>Modifica</button>
                  <button onClick={() => deleteListino(l)} style={deleteBtnStyle}>Elimina</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Vista famiglie ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', color: 'var(--ci-text-muted)' }}>
          Clicca su una famiglia per gestirne i listini.
        </p>
        <button onClick={() => setShowFamigliaForm(f => !f)} className="ci-btn ci-btn--teal">
          {showFamigliaForm ? 'Annulla' : '+ Famiglia'}
        </button>
      </div>

      {showFamigliaForm && (
        <div className="ci-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={sectionTitleStyle}>Nuova famiglia di prodotti</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome famiglia</label>
              <input className="ci-input" placeholder="es. Finestre, Porte, Veneziane" value={fNome} onChange={e => { setFNome(e.target.value); setFSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')) }} />
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              <input className="ci-input" placeholder="es. finestre" value={fSlug} onChange={e => setFSlug(e.target.value)} />
            </div>
          </div>
          <button onClick={saveFamiglia} className="ci-btn ci-btn--teal">Crea famiglia</button>
        </div>
      )}

      {famiglie.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--ci-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Nessuna famiglia creata.</p>
          <p style={{ fontSize: '0.875rem' }}>Clicca "+ Famiglia" per iniziare.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {famiglie.map(f => {
            const count = listiniMap[f.id]?.length ?? 0
            return (
              <div key={f.id} className="ci-card" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => setSelectedFamiglia(f)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ci-graphite)', marginBottom: '0.25rem' }}>{f.nome}</h3>
                    <code style={{ fontSize: '0.75rem', color: 'var(--ci-text-muted)' }}>{f.slug}</code>
                  </div>
                  <span style={{ background: count > 0 ? 'var(--ci-teal-light)' : 'var(--ci-bg)', color: count > 0 ? 'var(--ci-teal)' : 'var(--ci-text-muted)', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    {count} {count === 1 ? 'listino' : 'listini'}
                  </span>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ci-teal)', fontWeight: 600 }}>Apri →</span>
                  <button onClick={e => { e.stopPropagation(); deleteFamiglia(f) }} style={deleteBtnStyle}>Elimina</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB PRODOTTI
══════════════════════════════════════════════ */

function ProdottiTab() {
  const [mappings, setMappings] = useState<ProductMapping[]>([])
  const [listini, setListini] = useState<Listino[]>([])
  const [loading, setLoading] = useState(true)
  const [shopifyId, setShopifyId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedListinoSlug, setSelectedListinoSlug] = useState('')
  const [price, setPrice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('product_mappings').select('*').order('display_name'),
      supabase.from('listini').select('*').order('nome'),
    ]).then(([{ data: m }, { data: l }]) => {
      setMappings((m ?? []) as ProductMapping[])
      setListini((l ?? []) as Listino[])
      setLoading(false)
    })
  }, [])

  function resetForm() { setShopifyId(''); setDisplayName(''); setSelectedListinoSlug(''); setPrice(''); setEditing(null) }

  function startEdit(m: ProductMapping) {
    setEditing(m.shopify_product_id); setShopifyId(m.shopify_product_id)
    setDisplayName(m.display_name); setSelectedListinoSlug(m.category_template); setPrice(String(m.base_price_sqm))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!shopifyId.trim() || !displayName.trim() || !selectedListinoSlug || !price) { alert('Compila tutti i campi'); return }
    const listino = listini.find(l => l.slug === selectedListinoSlug)
    if (!listino) { alert('Listino non trovato'); return }
    const payload: Partial<ProductMapping> = {
      shopify_product_id: shopifyId.trim(), display_name: displayName.trim(),
      category_template: selectedListinoSlug, base_price_sqm: Number(price),
      allowed_options_json: listino.options_json,
    }
    const { error } = await supabase.from('product_mappings').upsert(payload)
    if (error) { alert(error.message); return }
    resetForm()
    const { data } = await supabase.from('product_mappings').select('*').order('display_name')
    setMappings((data ?? []) as ProductMapping[])
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo prodotto?')) return
    await supabase.from('product_mappings').delete().eq('shopify_product_id', id)
    setMappings(m => m.filter(x => x.shopify_product_id !== id))
  }

  if (loading) return <LoadingSkeleton />
  const selectedListino = listini.find(l => l.slug === selectedListinoSlug)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="ci-card" style={{ padding: '1.5rem' }}>
        <h2 style={sectionTitleStyle}>{editing ? 'Modifica prodotto' : 'Aggiungi prodotto Shopify'}</h2>
        {listini.length === 0 && (
          <div className="ci-alert ci-alert--error" style={{ marginBottom: '1rem' }}>
            Nessun listino disponibile. Crea prima un listino dalla tab "Listini".
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>ID Shopify</label>
            <input className="ci-input" placeholder="es. 8123456789" value={shopifyId} onChange={e => setShopifyId(e.target.value)} disabled={!!editing} />
          </div>
          <div>
            <label style={labelStyle}>Nome prodotto</label>
            <input className="ci-input" placeholder="es. Finestra Classica PVC 70mm" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Listino</label>
            <select className="ci-input" value={selectedListinoSlug} onChange={e => setSelectedListinoSlug(e.target.value)}>
              <option value="">Seleziona listino...</option>
              {listini.map(l => <option key={l.slug} value={l.slug}>{l.nome} ({l.slug})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prezzo base (€/mq)</label>
            <input className="ci-input" type="number" placeholder="es. 250" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>
        {selectedListino && (
          <div style={{ background: 'var(--ci-teal-light)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--ci-teal)' }}>{selectedListino.nome}</span>
            <span style={{ color: 'var(--ci-text-muted)', marginLeft: '1rem' }}>
              Campi: {selectedListino.options_json?.opzioni?.map(g => g.label).join(', ') || 'nessuno'} ·
              L {selectedListino.options_json?.larghezza_min}–{selectedListino.options_json?.larghezza_max} ·
              H {selectedListino.options_json?.altezza_min}–{selectedListino.options_json?.altezza_max} cm
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleSave} disabled={listini.length === 0} className="ci-btn ci-btn--teal">{editing ? 'Aggiorna' : 'Aggiungi prodotto'}</button>
          {editing && <button onClick={resetForm} style={cancelBtnStyle}>Annulla</button>}
        </div>
      </div>

      {mappings.length > 0 && (
        <div style={{ background: 'var(--ci-bg)', borderRadius: '8px', padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--ci-text-muted)' }}>
          <strong style={{ color: 'var(--ci-graphite)' }}>Link configuratore: </strong>
          {window.location.origin}/?product_id=<strong>[ID Shopify]</strong>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead><tr style={{ background: 'var(--ci-bg)' }}>
          <Th>ID Shopify</Th><Th>Nome</Th><Th>Listino</Th><Th>€/mq</Th><Th>Azioni</Th>
        </tr></thead>
        <tbody>
          {mappings.map(m => (
            <tr key={m.shopify_product_id}>
              <Td><code style={{ fontSize: '0.75rem' }}>{m.shopify_product_id}</code></Td>
              <Td style={{ fontWeight: 500 }}>{m.display_name}</Td>
              <Td><span style={{ background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{m.category_template}</span></Td>
              <Td style={{ fontFamily: 'Open Sans, sans-serif' }}>€{m.base_price_sqm}</Td>
              <Td><div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => startEdit(m)} style={editBtnStyle}>Modifica</button>
                <button onClick={() => handleDelete(m.shopify_product_id)} style={deleteBtnStyle}>Elimina</button>
              </div></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB REGOLE PREZZO
══════════════════════════════════════════════ */

function PricingRulesTab() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [listini, setListini] = useState<Listino[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<PricingRule>>({ modifier_type: 'fixed' })
  const [filterSlug, setFilterSlug] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('pricing_rules').select('*').order('category_template'),
      supabase.from('listini').select('*').order('nome'),
    ]).then(([{ data: r }, { data: l }]) => {
      setRules((r ?? []) as PricingRule[])
      setListini((l ?? []) as Listino[])
      setLoading(false)
    })
  }, [])

  const selectedListino = listini.find(l => l.slug === form.category_template)
  const opzioni: OptionGroup[] = selectedListino?.options_json?.opzioni ?? []
  const selectedGroupKey = form.attribute_key?.split('_')[0] ?? ''
  const selectedGroup = opzioni.find(g => g.key === selectedGroupKey)
  const currentVal = form.attribute_key && selectedGroupKey ? form.attribute_key.slice(selectedGroupKey.length + 1) : ''

  async function handleSave() {
    if (!form.category_template || !form.attribute_key || !form.attribute_key.includes('_') || form.price_modifier === undefined) {
      alert('Compila tutti i campi'); return
    }
    const { error } = await supabase.from('pricing_rules').insert(form as PricingRule)
    if (error) { alert(error.message); return }
    setForm({ modifier_type: 'fixed' })
    const { data } = await supabase.from('pricing_rules').select('*').order('category_template')
    setRules((data ?? []) as PricingRule[])
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return
    await supabase.from('pricing_rules').delete().eq('id', id)
    setRules(r => r.filter(x => x.id !== id))
  }

  if (loading) return <LoadingSkeleton />
  const filtered = filterSlug ? rules.filter(r => r.category_template === filterSlug) : rules

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="ci-card" style={{ padding: '1.25rem' }}>
        <h2 style={sectionTitleStyle}>Aggiungi regola di prezzo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Listino</label>
            <select className="ci-input" value={form.category_template ?? ''} onChange={e => setForm({ modifier_type: 'fixed', category_template: e.target.value })}>
              <option value="">Seleziona listino...</option>
              {listini.map(l => <option key={l.slug} value={l.slug}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select className="ci-input" value={form.modifier_type} onChange={e => setForm(f => ({ ...f, modifier_type: e.target.value as 'fixed' | 'percentage' }))}>
              <option value="fixed">Fisso (€)</option>
              <option value="percentage">Percentuale (%)</option>
            </select>
          </div>
        </div>
        {form.category_template && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Campo</label>
              <select className="ci-input" value={selectedGroupKey} onChange={e => setForm(f => ({ ...f, attribute_key: e.target.value ? `${e.target.value}_` : '' }))}>
                <option value="">Seleziona campo...</option>
                {opzioni.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valore</label>
              {selectedGroup ? (
                <select className="ci-input" value={currentVal} onChange={e => setForm(f => ({ ...f, attribute_key: `${selectedGroupKey}_${e.target.value}` }))}>
                  <option value="">Seleziona...</option>
                  {selectedGroup.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : <input className="ci-input" disabled placeholder="—" />}
            </div>
            <div>
              <label style={labelStyle}>Importo ({form.modifier_type === 'percentage' ? '%' : '€'})</label>
              <input className="ci-input" type="number" placeholder="0" value={form.price_modifier ?? ''} onChange={e => setForm(f => ({ ...f, price_modifier: Number(e.target.value) }))} />
            </div>
          </div>
        )}
        <button onClick={handleSave} className="ci-btn ci-btn--teal">Salva regola</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <select className="ci-input" style={{ maxWidth: '240px' }} value={filterSlug} onChange={e => setFilterSlug(e.target.value)}>
          <option value="">Tutti i listini</option>
          {listini.map(l => <option key={l.slug} value={l.slug}>{l.nome}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)' }}>{filtered.length} regole</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead><tr style={{ background: 'var(--ci-bg)' }}>
          <Th>Listino</Th><Th>Campo → Valore</Th><Th>Importo</Th><Th>Tipo</Th><Th>Azioni</Th>
        </tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <Td><span style={{ background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{r.category_template}</span></Td>
              <Td><code style={{ fontSize: '0.75rem' }}>{r.attribute_key}</code></Td>
              <Td style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>{r.price_modifier}{r.modifier_type === 'percentage' ? '%' : '€'}</Td>
              <Td style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)' }}>{r.modifier_type}</Td>
              <Td><button onClick={() => handleDelete(r.id)} style={deleteBtnStyle}>Elimina</button></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB PREVENTIVI
══════════════════════════════════════════════ */

type QuoteWithProfile = Quote & { profiles: { email: string } | null }

function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('quotes').select('*, profiles(email), quote_items(id)').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setQuotes((data as QuoteWithProfile[]) ?? []); setLoading(false) })
  }, [])

  if (loading) return <LoadingSkeleton />
  const statusClass: Record<Quote['status'], string> = { ACTIVE: 'ci-badge--active', EXPIRED: 'ci-badge--expired', ORDERED: 'ci-badge--ordered' }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead><tr style={{ background: 'var(--ci-bg)' }}>
        <Th>ID</Th><Th>Email</Th><Th>Totale</Th><Th>Status</Th><Th>Scadenza</Th><Th>Articoli</Th>
      </tr></thead>
      <tbody>
        {quotes.map(q => (
          <tr key={q.id}>
            <Td><code style={{ fontSize: '0.7rem' }}>{q.id.slice(0,8)}</code></Td>
            <Td>{q.profiles?.email ?? '—'}</Td>
            <Td style={{ fontFamily: 'Open Sans, sans-serif' }}>€{q.total_price.toFixed(2)}</Td>
            <Td><span className={`ci-badge ${statusClass[q.status]}`}>{q.status}</span></Td>
            <Td style={{ fontSize: '0.75rem' }}>{new Date(q.expires_at).toLocaleDateString('it-IT')}</Td>
            <Td style={{ textAlign: 'center' }}>{(q.quote_items as unknown as {id:string}[])?.length ?? 0}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ══════════════════════════════════════════════
   COMPONENTI CONDIVISI
══════════════════════════════════════════════ */

function emptyOptions(tipo: TipoListino = 'prodotti-su-misura'): AllowedOptions {
  return { tipo, opzioni: [], larghezza_min: 60, larghezza_max: 350, altezza_min: 60, altezza_max: 280 }
}

function OptionGroupEditor({ group, newValue, onNewValueChange, onAddValue, onRemoveValue, onRemoveGroup }: {
  group: OptionGroup; newValue: string
  onNewValueChange: (v: string) => void; onAddValue: () => void
  onRemoveValue: (v: string) => void; onRemoveGroup: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--ci-border)', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.875rem', color: 'var(--ci-graphite)' }}>{group.label}</span>
          <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--ci-text-muted)', background: 'var(--ci-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{group.key}</code>
        </div>
        <button onClick={onRemoveGroup} style={deleteBtnStyle}>Rimuovi</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {group.values.map(v => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
            {v}
            <button onClick={() => onRemoveValue(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ci-teal)', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1 }}>×</button>
          </span>
        ))}
        {group.values.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--ci-text-muted)', fontStyle: 'italic' }}>Nessun valore</span>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input className="ci-input" placeholder="Aggiungi valore..." value={newValue} onChange={e => onNewValueChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAddValue()} style={{ fontSize: '0.875rem' }} />
        <button onClick={onAddValue} style={{ background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Valore</button>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ci-text-muted)', textAlign: 'left', padding: '0.625rem 0.75rem', borderBottom: '2px solid var(--ci-border)' }}>{children}</th>
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid var(--ci-border-light)', color: 'var(--ci-text)', ...style }}>{children}</td>
}
function LoadingSkeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[1,2,3].map(i => <div key={i} className="ci-skeleton" style={{ height: '44px', borderRadius: '4px' }} />)}</div>
}

const sectionTitleStyle: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ci-graphite)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const subTitleStyle: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ci-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--ci-text-muted)', marginBottom: '0.3rem' }
const editBtnStyle: React.CSSProperties = { color: 'var(--ci-teal)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }
const deleteBtnStyle: React.CSSProperties = { color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }
const cancelBtnStyle: React.CSSProperties = { background: 'var(--ci-bg)', color: 'var(--ci-text-muted)', border: '1px solid var(--ci-border)', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem' }
