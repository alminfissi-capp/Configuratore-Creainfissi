import type { CSSProperties } from 'react'

/** Stili condivisi dai componenti di authoring del pannello admin. */
export const labelStyle: CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--ci-text-muted)', marginBottom: '0.3rem' }
export const subTitleStyle: CSSProperties = { fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ci-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
export const cancelBtnStyle: CSSProperties = { background: 'var(--ci-bg)', color: 'var(--ci-text-muted)', border: '1px solid var(--ci-border)', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem' }
export const deleteBtnStyle: CSSProperties = { color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }
export const editBtnStyle: CSSProperties = { color: 'var(--ci-teal)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }

export function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Tipi di maggiorazione mostrati nei select dell'editor griglia. */
export const MAGGIORAZIONE_TIPI: { value: string; label: string }[] = [
  { value: 'fisso', label: '€ fisso' },
  { value: 'percentuale', label: '% sul base' },
  { value: 'mq', label: '€/mq' },
  { value: 'pezzo', label: '€/pezzo' },
  { value: 'ml', label: '€/metro lineare' },
]
