import React, { useState, useEffect } from 'react'
import api from '../services/api'

const TYP_OPTIONEN = ['Wohnung', 'Haus', 'Gewerbe', 'Büro', 'Garage', 'Rohdachboden', 'Sonstiges']
const TYP_FARBEN: Record<string, { bg: string; text: string }> = {
  Wohnung:      { bg: '#dbeafe', text: '#1e40af' },
  Haus:         { bg: '#d1f5e0', text: '#2d6a4f' },
  Gewerbe:      { bg: '#ede9fe', text: '#6d28d9' },
  Büro:         { bg: '#fef3c7', text: '#92400e' },
  Garage:       { bg: '#f0f0f0', text: '#555' },
  Rohdachboden: { bg: '#fce7f3', text: '#9d174d' },
  Sonstiges:    { bg: '#f0ede8', text: '#888' },
}

const leer = { name: '', typ: 'Wohnung', adresse: '', flaeche: '', zimmer: '', baujahr: '', kaufpreis: '', notizen: '' }

export default function ImmoObjekte({ selectedId, onChanged, onNavigate }: { selectedId?: number; onChanged?: () => void; onNavigate?: (id: number) => void } = {}) {
  const [objekte, setObjekte] = useState<any[]>([])
  const [laden, setLaden] = useState(true)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...leer })
  const [speichernLaden, setSpeichernLaden] = useState(false)

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
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>🏠 Objekte / Wohnungen</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{objekte.length} Objekt{objekte.length !== 1 ? 'e' : ''}</div>
        </div>
        <button onClick={() => oeffnen()} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Neues Objekt
        </button>
      </div>

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>⏳ Laden...</div>
      ) : objekte.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e0d8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Noch keine Objekte</div>
          <div style={{ color: '#aaa', fontSize: 13 }}>Fügen Sie Ihr erstes Objekt hinzu</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {objekte.map(o => {
            const farbe = TYP_FARBEN[o.typ] || TYP_FARBEN.Sonstiges
            return (
              <div key={o.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => onNavigate ? onNavigate(o.id) : oeffnen(o)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#1a2a3a', flex: 1, marginRight: 8 }}>{o.name}</div>
                  <span style={{ background: farbe.bg, color: farbe.text, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{o.typ}</span>
                </div>
                {o.adresse && <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>📍 {o.adresse}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555', marginBottom: 12 }}>
                  {o.flaeche && <span>📐 {o.flaeche} m²</span>}
                  {o.zimmer && <span>🛏 {o.zimmer} Zi.</span>}
                  {o.baujahr && <span>🏗 {o.baujahr}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, background: parseInt(o.aktive_vertraege) > 0 ? '#d1f5e0' : '#f0ede8', color: parseInt(o.aktive_vertraege) > 0 ? '#2d6a4f' : '#888', padding: '2px 8px', borderRadius: 20 }}>
                    {o.aktive_vertraege} aktiver Vertrag
                  </span>
                  <button onClick={e => { e.stopPropagation(); loeschen(o.id) }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {bearbeitenId ? '✏️ Objekt bearbeiten' : '🏠 Neues Objekt'}
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
                    <button key={t} onClick={() => f('typ', t)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${form.typ === t ? '#1a2a3a' : '#e5e0d8'}`, background: form.typ === t ? '#1a2a3a' : 'white', color: form.typ === t ? 'white' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
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
              <button onClick={() => setFormOffen(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.name.trim()} style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: speichernLaden || !form.name.trim() ? '#e5e0d8' : '#1a1a1a', color: speichernLaden || !form.name.trim() ? '#aaa' : 'white', fontSize: 13, fontWeight: 700, cursor: speichernLaden || !form.name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                {speichernLaden ? '⏳ Speichern...' : '💾 Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e0d8', borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
