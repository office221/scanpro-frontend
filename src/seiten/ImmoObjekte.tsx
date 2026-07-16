import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary, ACCENT } from '../ui/theme'

const TYP_OPTIONEN = ['Wohnung', 'Haus', 'Gewerbe', 'Büro', 'Garage', 'Rohdachboden', 'Sonstiges']
const TYP_FARBEN: Record<string, string> = {
  Wohnung:      '#3b82f6',
  Haus:         '#10b981',
  Gewerbe:      '#8b5cf6',
  Büro:         '#f59e0b',
  Garage:       '#94a3b8',
  Rohdachboden: '#ec4899',
  Sonstiges:    '#94a3b8',
}

const leer = { name: '', typ: 'Wohnung', adresse: '', flaeche: '', zimmer: '', baujahr: '', kaufpreis: '', notizen: '' }

export default function ImmoObjekte({ selectedId, onChanged, onNavigate }: { selectedId?: number; onChanged?: () => void; onNavigate?: (id: number) => void } = {}) {
  const [objekte, setObjekte] = useState<any[]>([])
  const [laden, setLaden] = useState(true)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...leer })
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const laden_ = () => {
    api.get('/immo/objekte').then(r => setObjekte(r.data)).catch(() => {}).finally(() => setLaden(false))
  }

  useEffect(() => { laden_() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Wenn selectedId gesetzt → Objekt direkt zum Bearbeiten öffnen
  useEffect(() => {
    if (selectedId && objekte.length > 0) {
      const obj = objekte.find(o => o.id === selectedId)
      if (obj && !formOffen) oeffnen(obj)
    }
  }, [selectedId, objekte]) // eslint-disable-line react-hooks/exhaustive-deps

  const oeffnen = (o?: any) => {
    if (o) {
      setForm({ name: o.name||'', typ: o.typ||'Wohnung', adresse: o.adresse||'', flaeche: o.flaeche||'', zimmer: o.zimmer||'', baujahr: o.baujahr||'', kaufpreis: o.kaufpreis||'', notizen: o.notizen||'' })
      setBearbeitenId(o.id)
    } else {
      setForm({ ...leer })
      setBearbeitenId(null)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.name.trim()) return
    setSpeichernLaden(true)
    try {
      const daten = { ...form, flaeche: form.flaeche ? parseFloat(form.flaeche) : null, zimmer: form.zimmer ? parseInt(form.zimmer) : null, baujahr: form.baujahr ? parseInt(form.baujahr) : null, kaufpreis: form.kaufpreis ? parseFloat(form.kaufpreis) : null }
      if (bearbeitenId) await api.put(`/immo/objekte/${bearbeitenId}`, daten)
      else await api.post('/immo/objekte', daten)
      setFormOffen(false)
      laden_()
      onChanged?.()
    } catch (err: any) {
      const msg = err?.response?.data?.fehler || err?.response?.data?.message || err?.message || 'Unbekannter Fehler'
      alert('Fehler beim Speichern: ' + msg)
    }
    setSpeichernLaden(false)
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Objekt wirklich löschen?')) return
    try { await api.delete(`/immo/objekte/${id}`); laden_(); onChanged?.() } catch { alert('Fehler') }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--bf-text)' }}>Objekte / Wohnungen</div>
          <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>{objekte.length} Objekt{objekte.length !== 1 ? 'e' : ''}</div>
        </div>
        <button onClick={() => oeffnen()} style={{ ...btnPrimary, padding: '10px 20px', fontSize: 13 }}>
          + Neues Objekt
        </button>
      </div>

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)', padding: 40 }}>Laden...</div>
      ) : objekte.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--bf-text)' }}>Noch keine Objekte</div>
          <div style={{ color: 'var(--bf-text-muted)', fontSize: 13 }}>Fügen Sie Ihr erstes Objekt hinzu</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {objekte.map(o => {
            const farbe = TYP_FARBEN[o.typ] || TYP_FARBEN.Sonstiges
            return (
              <div key={o.id} style={{ background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--bf-shadow)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => onNavigate ? onNavigate(o.id) : oeffnen(o)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--bf-text)', flex: 1, marginRight: 8 }}>{o.name}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bf-soft)', border: '1px solid var(--bf-border)', color: 'var(--bf-text-soft)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: farbe, flexShrink: 0 }} />
                    {o.typ}
                  </span>
                </div>
                {o.adresse && <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginBottom: 8 }}>{o.adresse}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--bf-text-soft)', marginBottom: 12 }}>
                  {o.flaeche && <span>{o.flaeche} m²</span>}
                  {o.zimmer && <span>{o.zimmer} Zi.</span>}
                  {o.baujahr && <span>Bj. {o.baujahr}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, background: 'var(--bf-soft)', border: '1px solid var(--bf-border)', color: parseInt(o.aktive_vertraege) > 0 ? '#10b981' : 'var(--bf-text-muted)', padding: '2px 8px', borderRadius: 20 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: parseInt(o.aktive_vertraege) > 0 ? '#10b981' : 'var(--bf-text-muted)', flexShrink: 0 }} />
                    {o.aktive_vertraege} aktiver Vertrag
                  </span>
                  <button onClick={e => { e.stopPropagation(); loeschen(o.id) }} style={{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', padding: '5px 10px', fontSize: 11 }}>
                    Löschen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'var(--bf-card)', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 520, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--bf-text)' }}>
              {bearbeitenId ? 'Objekt bearbeiten' : 'Neues Objekt'}
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name / Bezeichnung *</label>
                <input style={inputStyle} value={form.name} onChange={e => f('name', e.target.value)} placeholder='z.B. "Wohnung Top 3, Wien 1030"' />
              </div>

              {/* Typ */}
              <div>
                <label style={labelStyle}>Typ</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYP_OPTIONEN.map(t => (
                    <button key={t} onClick={() => f('typ', t)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${form.typ === t ? ACCENT : 'var(--bf-border)'}`, background: form.typ === t ? 'var(--bf-soft)' : 'var(--bf-card)', color: form.typ === t ? 'var(--bf-text)' : 'var(--bf-text-soft)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label style={labelStyle}>Adresse</label>
                <input style={inputStyle} value={form.adresse} onChange={e => f('adresse', e.target.value)} placeholder='Straße Nr., PLZ Ort' />
              </div>

              {/* Fläche + Zimmer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fläche (m²)</label>
                  <input style={inputStyle} type='number' value={form.flaeche} onChange={e => f('flaeche', e.target.value)} placeholder='z.B. 78' />
                </div>
                <div>
                  <label style={labelStyle}>Zimmer</label>
                  <input style={inputStyle} type='number' value={form.zimmer} onChange={e => f('zimmer', e.target.value)} placeholder='z.B. 3' />
                </div>
              </div>

              {/* Baujahr + Kaufpreis */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Baujahr</label>
                  <input style={inputStyle} type='number' value={form.baujahr} onChange={e => f('baujahr', e.target.value)} placeholder='z.B. 1980' />
                </div>
                <div>
                  <label style={labelStyle}>Kaufpreis (€)</label>
                  <input style={inputStyle} type='number' value={form.kaufpreis} onChange={e => f('kaufpreis', e.target.value)} placeholder='z.B. 250000' />
                </div>
              </div>

              {/* Notizen */}
              <div>
                <label style={labelStyle}>Notizen</label>
                <textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 } as any} value={form.notizen} onChange={e => f('notizen', e.target.value)} placeholder='Interne Notizen...' />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setFormOffen(false)} style={{ ...btnSecondary, flex: 1, padding: 11, fontSize: 13 }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.name.trim()} style={{ ...btnPrimary, flex: 2, padding: 11, fontSize: 13, opacity: speichernLaden || !form.name.trim() ? 0.55 : 1, cursor: speichernLaden || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
                {speichernLaden ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--bf-text-muted)', fontWeight: 600, marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--bf-input-border)', background: 'var(--bf-input-bg)', color: 'var(--bf-text)', borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
