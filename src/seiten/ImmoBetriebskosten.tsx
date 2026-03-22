import React, { useState, useEffect } from 'react'
import api from '../services/api'

const KATEGORIEN = ['Wasser', 'Strom', 'Gas / Heizung', 'Müll / Abfall', 'Reinigung', 'Versicherung', 'Verwaltung', 'Reparaturen', 'Sonstiges']
const KAT_ICONS: Record<string, string> = {
  'Wasser': '💧', 'Strom': '⚡', 'Gas / Heizung': '🔥', 'Müll / Abfall': '♻️',
  'Reinigung': '🧹', 'Versicherung': '🛡', 'Verwaltung': '📋', 'Reparaturen': '🔧', 'Sonstiges': '📦'
}

const eur = (v: any) => v ? parseFloat(v).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
const leer = { objektId: '', jahr: new Date().getFullYear().toString(), kategorie: 'Wasser', betrag: '', notizen: '' }

export default function ImmoBetriebskosten() {
  const [eintraege, setEintraege] = useState<any[]>([])
  const [objekte, setObjekte] = useState<any[]>([])
  const [laden, setLaden] = useState(true)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...leer })
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [filterObjekt, setFilterObjekt] = useState('')
  const [filterJahr, setFilterJahr] = useState(new Date().getFullYear().toString())

  const laden_ = () => {
    Promise.all([
      api.get(`/immo/betriebskosten?${filterObjekt ? `objektId=${filterObjekt}&` : ''}${filterJahr ? `jahr=${filterJahr}` : ''}`),
      api.get('/immo/objekte'),
    ]).then(([b, o]) => { setEintraege(b.data); setObjekte(o.data) }).catch(() => {}).finally(() => setLaden(false))
  }

  useEffect(() => { setLaden(true); laden_() }, [filterObjekt, filterJahr]) // eslint-disable-line react-hooks/exhaustive-deps

  const oeffnen = (e?: any) => {
    if (e) {
      setForm({ objektId: e.objektId||'', jahr: e.jahr?.toString()||new Date().getFullYear().toString(), kategorie: e.kategorie||'Wasser', betrag: e.betrag||'', notizen: e.notizen||'' })
      setBearbeitenId(e.id)
    } else {
      setForm({ ...leer, objektId: filterObjekt, jahr: filterJahr })
      setBearbeitenId(null)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.betrag || !form.jahr || !form.kategorie) return
    setSpeichernLaden(true)
    try {
      const daten = { ...form, betrag: parseFloat(form.betrag), jahr: parseInt(form.jahr), objektId: form.objektId ? parseInt(form.objektId) : null }
      if (bearbeitenId) await api.put(`/immo/betriebskosten/${bearbeitenId}`, daten)
      else await api.post('/immo/betriebskosten', daten)
      setFormOffen(false)
      laden_()
    } catch { alert('Fehler beim Speichern') }
    setSpeichernLaden(false)
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Eintrag wirklich löschen?')) return
    try { await api.delete(`/immo/betriebskosten/${id}`); laden_() } catch { alert('Fehler') }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  // Gruppiert nach Kategorie + Summe
  const kategorieMap: Record<string, number> = {}
  let gesamt = 0
  eintraege.forEach(e => {
    const b = parseFloat(e.betrag) || 0
    kategorieMap[e.kategorie] = (kategorieMap[e.kategorie] || 0) + b
    gesamt += b
  })

  const jahre = Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - i).toString())

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>📊 Betriebskostenabrechnung</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Nebenkosten je Objekt und Jahr</div>
        </div>
        <button onClick={() => oeffnen()} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Neuer Eintrag
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterObjekt} onChange={e => setFilterObjekt(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', minWidth: 200 }}>
          <option value=''>🏠 Alle Objekte</option>
          {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterJahr} onChange={e => setFilterJahr(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}>
          <option value=''>Alle Jahre</option>
          {jahre.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      {/* Übersichtskarten */}
      {Object.keys(kategorieMap).length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            Jahresübersicht {filterJahr} {filterObjekt ? `· ${objekte.find(o => o.id.toString() === filterObjekt)?.name}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
            {Object.entries(kategorieMap).map(([kat, betrag]) => (
              <div key={kat} style={{ background: '#f5f3ef', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{KAT_ICONS[kat] || '📦'} {kat}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800 }}>€ {eur(betrag)}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #e5e0d8', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Gesamt {filterJahr}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a2a3a' }}>€ {eur(gesamt)}</span>
          </div>
        </div>
      )}

      {/* Tabelle */}
      {laden ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>⏳ Laden...</div>
      ) : eintraege.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e0d8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Keine Einträge</div>
          <div style={{ color: '#aaa', fontSize: 13 }}>Fügen Sie Betriebskosteneinträge für {filterJahr || 'das aktuelle Jahr'} hinzu</div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f3ef' }}>
                {['Kategorie', 'Objekt', 'Jahr', 'Betrag', 'Notizen', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eintraege.map((e, i) => (
                <tr key={e.id} onClick={() => oeffnen(e)} style={{ borderTop: i > 0 ? '1px solid #f0ede8' : 'none', cursor: 'pointer' }}
                  onMouseEnter={el => (el.currentTarget.style.background = '#faf8f5')} onMouseLeave={el => (el.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{KAT_ICONS[e.kategorie] || '📦'} {e.kategorie}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.objekt_name || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.jahr}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>€ {eur(e.betrag)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#aaa' }}>{e.notizen || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={ev => { ev.stopPropagation(); loeschen(e.id) }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16 }}
                      onMouseEnter={el => (el.currentTarget.style.color = '#ef4444')} onMouseLeave={el => (el.currentTarget.style.color = '#ccc')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {bearbeitenId ? '✏️ Eintrag bearbeiten' : '📊 Neuer BK-Eintrag'}
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Objekt</label>
                  <select style={inputStyle} value={form.objektId} onChange={e => f('objektId', e.target.value)}>
                    <option value=''>— kein Objekt —</option>
                    {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Jahr *</label>
                  <select style={inputStyle} value={form.jahr} onChange={e => f('jahr', e.target.value)}>
                    {jahre.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Kategorie *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {KATEGORIEN.map(k => (
                    <button key={k} onClick={() => f('kategorie', k)} style={{ padding: '5px 10px', borderRadius: 16, border: `1.5px solid ${form.kategorie === k ? '#1a2a3a' : '#e5e0d8'}`, background: form.kategorie === k ? '#1a2a3a' : 'white', color: form.kategorie === k ? 'white' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {KAT_ICONS[k]} {k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Betrag (€) *</label>
                <input style={inputStyle} type='number' value={form.betrag} onChange={e => f('betrag', e.target.value)} placeholder='z.B. 1250.00' step='0.01' />
              </div>

              <div>
                <label style={labelStyle}>Notizen</label>
                <textarea style={{ ...inputStyle, resize: 'none', minHeight: 60 } as any} value={form.notizen} onChange={e => f('notizen', e.target.value)} placeholder='z.B. Verbrauchsabrechnung Wiener Wasser' />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setFormOffen(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.betrag || !form.jahr} style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: !form.betrag || !form.jahr ? '#e5e0d8' : '#1a1a1a', color: !form.betrag || !form.jahr ? '#aaa' : 'white', fontSize: 13, fontWeight: 700, cursor: !form.betrag || !form.jahr ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
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
