import { useState } from 'react'
import type { GrigliaConfig, Gruppo, Maggiorazione, MaggiorazioneTipo } from '../../types'
import { labelStyle, subTitleStyle, deleteBtnStyle, slugify, MAGGIORAZIONE_TIPI } from './ui'

/** Crea una matrice prezzi delle dimensioni richieste, preservando i valori già inseriti. */
function resizeMatrix(prezzi: number[][], nLarghezze: number, nAltezze: number): number[][] {
  const out: number[][] = []
  for (let i = 0; i < nLarghezze; i++) {
    const riga: number[] = []
    for (let j = 0; j < nAltezze; j++) riga.push(prezzi[i]?.[j] ?? 0)
    out.push(riga)
  }
  return out
}

/** Inserisce una soglia mantenendo l'ordine crescente; ritorna [nuovoArray, indiceInserito]. */
function insertSoglia(soglie: number[], val: number): [number[], number] {
  const next = [...soglie, val].sort((a, b) => a - b)
  return [next, next.indexOf(val)]
}

export default function GrigliaConfigEditor({ value, onChange }: { value: GrigliaConfig; onChange: (c: GrigliaConfig) => void }) {
  const { larghezze, altezze, prezzi } = value.griglia
  const [newLarg, setNewLarg] = useState('')
  const [newAlt, setNewAlt] = useState('')

  function addLarghezza() {
    const v = Number(newLarg)
    if (!v || larghezze.includes(v)) return
    const [next, idx] = insertSoglia(larghezze, v)
    const newPrezzi = [...prezzi]
    newPrezzi.splice(idx, 0, new Array(altezze.length).fill(0))
    onChange({ ...value, griglia: { larghezze: next, altezze, prezzi: newPrezzi } })
    setNewLarg('')
  }
  function removeLarghezza(i: number) {
    const next = larghezze.filter((_, k) => k !== i)
    onChange({ ...value, griglia: { larghezze: next, altezze, prezzi: prezzi.filter((_, k) => k !== i) } })
  }
  function addAltezza() {
    const v = Number(newAlt)
    if (!v || altezze.includes(v)) return
    const [next, idx] = insertSoglia(altezze, v)
    const newPrezzi = prezzi.map(riga => { const r = [...riga]; r.splice(idx, 0, 0); return r })
    onChange({ ...value, griglia: { larghezze, altezze: next, prezzi: resizeMatrix(newPrezzi, larghezze.length, next.length) } })
    setNewAlt('')
  }
  function removeAltezza(j: number) {
    const next = altezze.filter((_, k) => k !== j)
    onChange({ ...value, griglia: { larghezze, altezze: next, prezzi: prezzi.map(riga => riga.filter((_, k) => k !== j)) } })
  }
  function setCella(i: number, j: number, v: number) {
    const newPrezzi = prezzi.map(r => [...r])
    newPrezzi[i][j] = v
    onChange({ ...value, griglia: { larghezze, altezze, prezzi: newPrezzi } })
  }

  // ── Gruppi a scelta singola ──
  function addGruppo() {
    const key = `gruppo-${value.gruppi.length + 1}`
    onChange({ ...value, gruppi: [...value.gruppi, { key, label: 'Nuovo gruppo', valori: [] }] })
  }
  function updateGruppo(idx: number, patch: Partial<Gruppo>) {
    onChange({ ...value, gruppi: value.gruppi.map((g, k) => k === idx ? { ...g, ...patch } : g) })
  }
  function removeGruppo(idx: number) {
    onChange({ ...value, gruppi: value.gruppi.filter((_, k) => k !== idx) })
  }

  function setAccessori(list: Maggiorazione[]) { onChange({ ...value, accessori_extra: list }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Soglie */}
      <div>
        <h3 style={subTitleStyle}>Soglie misure (mm)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <SoglieList titolo="Larghezze (righe)" soglie={larghezze} onRemove={removeLarghezza}
            newVal={newLarg} onNewVal={setNewLarg} onAdd={addLarghezza} />
          <SoglieList titolo="Altezze (colonne)" soglie={altezze} onRemove={removeAltezza}
            newVal={newAlt} onNewVal={setNewAlt} onAdd={addAltezza} />
        </div>
      </div>

      {/* Matrice prezzi */}
      {larghezze.length > 0 && altezze.length > 0 && (
        <div>
          <h3 style={subTitleStyle}>Matrice prezzi (€)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={cellHeadStyle}>L \ H</th>
                  {altezze.map(h => <th key={h} style={cellHeadStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {larghezze.map((l, i) => (
                  <tr key={l}>
                    <th style={cellHeadStyle}>{l}</th>
                    {altezze.map((_, j) => (
                      <td key={j} style={{ border: '1px solid var(--ci-border)', padding: '2px' }}>
                        <input type="number" value={prezzi[i]?.[j] ?? 0}
                          onChange={e => setCella(i, j, Number(e.target.value))}
                          style={{ width: '70px', border: 'none', textAlign: 'right', fontFamily: 'Open Sans, sans-serif', fontSize: '0.8rem', background: 'transparent' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ci-text-muted)', marginTop: '0.4rem' }}>
            Una misura usa la cella con la soglia ≥ misura. Oltre la soglia massima → fuori listino.
          </p>
        </div>
      )}

      {/* Gruppi a scelta singola */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ ...subTitleStyle, marginBottom: 0 }}>Gruppi a scelta singola (vetro, finiture…)</h3>
          <button type="button" onClick={addGruppo} className="ci-btn ci-btn--teal" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>+ Gruppo</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {value.gruppi.map((g, idx) => (
            <GruppoEditor key={idx} gruppo={g}
              onChange={patch => updateGruppo(idx, patch)} onRemove={() => removeGruppo(idx)} />
          ))}
          {value.gruppi.length === 0 && <p style={emptyHintStyle}>Nessun gruppo.</p>}
        </div>
      </div>

      {/* Accessori extra */}
      <div>
        <h3 style={subTitleStyle}>Accessori extra (scelta multipla con quantità)</h3>
        <MaggiorazioneListEditor list={value.accessori_extra} onChange={setAccessori} />
      </div>
    </div>
  )
}

function SoglieList({ titolo, soglie, onRemove, newVal, onNewVal, onAdd }: {
  titolo: string; soglie: number[]; onRemove: (i: number) => void
  newVal: string; onNewVal: (v: string) => void; onAdd: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--ci-border)', borderRadius: '8px', padding: '0.75rem' }}>
      <label style={labelStyle}>{titolo}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
        {soglie.map((s, i) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', padding: '0.2rem 0.5rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 600 }}>
            {s}
            <button type="button" onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ci-teal)', fontWeight: 700 }}>×</button>
          </span>
        ))}
        {soglie.length === 0 && <span style={emptyHintStyle}>Nessuna soglia</span>}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input className="ci-input" type="number" placeholder="mm" value={newVal} onChange={e => onNewVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())} style={{ fontSize: '0.8rem' }} />
        <button type="button" onClick={onAdd} className="ci-btn ci-btn--teal" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>+ Soglia</button>
      </div>
    </div>
  )
}

function GruppoEditor({ gruppo, onChange, onRemove }: { gruppo: Gruppo; onChange: (p: Partial<Gruppo>) => void; onRemove: () => void }) {
  return (
    <div style={{ border: '1px solid var(--ci-border)', borderRadius: '8px', padding: '0.85rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Etichetta gruppo</label>
          <input className="ci-input" value={gruppo.label} onChange={e => onChange({ label: e.target.value, key: slugify(e.target.value) || gruppo.key })} />
        </div>
        <button type="button" onClick={onRemove} style={deleteBtnStyle}>Rimuovi gruppo</button>
      </div>
      <MaggiorazioneListEditor list={gruppo.valori} onChange={valori => onChange({ valori })} valoreLabel="valore" />
    </div>
  )
}

/** Editor riutilizzabile di una lista di maggiorazioni (per gruppi e accessori). */
function MaggiorazioneListEditor({ list, onChange, valoreLabel = 'accessorio' }: {
  list: Maggiorazione[]; onChange: (l: Maggiorazione[]) => void; valoreLabel?: string
}) {
  function add() {
    const key = `${valoreLabel}-${list.length + 1}`
    onChange([...list, { key, label: '', tipo: 'fisso', importo: 0 }])
  }
  function update(idx: number, patch: Partial<Maggiorazione>) {
    onChange(list.map((m, k) => k === idx ? { ...m, ...patch } : m))
  }
  function remove(idx: number) { onChange(list.filter((_, k) => k !== idx)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {list.map((m, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 140px' }}>
            <label style={labelStyle}>Nome</label>
            <input className="ci-input" placeholder="es. Triplo vetro" value={m.label} onChange={e => update(idx, { label: e.target.value, key: slugify(e.target.value) || m.key })} style={{ fontSize: '0.85rem' }} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={labelStyle}>Tipo</label>
            <select className="ci-input" value={m.tipo} onChange={e => update(idx, { tipo: e.target.value as MaggiorazioneTipo })} style={{ fontSize: '0.85rem' }}>
              {MAGGIORAZIONE_TIPI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 1 90px' }}>
            <label style={labelStyle}>Importo</label>
            <input className="ci-input" type="number" value={m.importo} onChange={e => update(idx, { importo: Number(e.target.value) })} style={{ fontSize: '0.85rem' }} />
          </div>
          {m.tipo === 'ml' && (
            <div style={{ flex: '1 1 110px' }}>
              <label style={labelStyle}>Riferimento</label>
              <select className="ci-input" value={m.ml_rif ?? 'larghezza'} onChange={e => update(idx, { ml_rif: e.target.value as Maggiorazione['ml_rif'] })} style={{ fontSize: '0.85rem' }}>
                <option value="larghezza">Larghezza</option>
                <option value="altezza">Altezza</option>
                <option value="perimetro">Perimetro</option>
              </select>
            </div>
          )}
          <button type="button" onClick={() => remove(idx)} style={{ ...deleteBtnStyle, paddingBottom: '0.5rem' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ alignSelf: 'flex-start', background: 'var(--ci-teal-light)', color: 'var(--ci-teal)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
        + Aggiungi {valoreLabel}
      </button>
    </div>
  )
}

const cellHeadStyle: React.CSSProperties = { border: '1px solid var(--ci-border)', padding: '0.3rem 0.5rem', background: 'var(--ci-bg)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.75rem', color: 'var(--ci-text-muted)' }
const emptyHintStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--ci-text-muted)', fontStyle: 'italic' }
