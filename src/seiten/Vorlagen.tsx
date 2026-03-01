import React, { useState, useEffect } from 'react'
import api from '../services/api'

const EINHEITEN = ['PA', 'M2', 'M3', 'LFM', 'STD', 'OBJ', 'KG', 'L', 'ST']

export default function Vorlagen() {
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [laden, setLaden] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState('PA')
  const [einzelpreis, setEinzelpreis] = useState('')

  useEffect(() => {
    vorlagenLaden()
  }, [])

  const vorlagenLaden = async () => {
    try {
      const r = await api.get('/vorlagen')
      setVorlagen(r.data)
    } catch (e) {
      console.error('Fehler beim Laden der Vorlagen', e)
    }
  }

  const formLeeren = () => {
    setName('')
    setBeschreibung('')
    setMenge('1')
    setEinheit('PA')
    setEinzelpreis('')
    setBearbeitenId(null)
  }

  const speichern = async () => {
    if (!name.trim()) { alert('Bitte einen Namen eingeben!'); return }
    setLaden(true)
    try {
      const daten = {
        name: name.trim(),
        beschreibung: beschreibung.trim(),
        menge: parseFloat(menge.replace(',', '.')) || 1,
        einheit,
        einzelpreis: parseFloat(einzelpreis.replace(',', '.')) || 0
      }
      if (bearbeitenId) {
        await api.put(`/vorlagen/${bearbeitenId}`, daten)
      } else {
        await api.post('/vorlagen', daten)
      }
      setFormOffen(false)
      formLeeren()
      vorlagenLaden()
    } catch (fehler: any) {
      alert('Fehler: ' + (fehler.response?.data?.fehler || fehler.message))
    }
    setLaden(false)
  }

  const vorlageBearbeiten = (v: any) => {
    setBearbeitenId(v.id)
    setName(v.name || '')
    setBeschreibung(v.beschreibung || '')
    setMenge(String(parseFloat(v.menge) || 1))
    setEinheit(v.einheit || 'PA')
    setEinzelpreis(String(parseFloat(v.einzelpreis) || ''))
    setFormOffen(true)
  }

  const vorlageLoeschen = async (id: number) => {
    if (!window.confirm('Vorlage wirklich löschen?')) return
    try {
      await api.delete(`/vorlagen/${id}`)
      vorlagenLaden()
    } catch (e: any) {
      alert('Fehler: ' + e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#888' }}>
          Gespeicherte Positionen – wiederverwendbar in Angeboten &amp; Rechnungen
        </div>
        <button
          style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => { formLeeren(); setFormOffen(true) }}>
          + Neue Vorlage
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e0d8', flex: 1, overflow: 'auto' }}>
        {vorlagen.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>Noch keine Vorlagen</div>
              <div style={{ fontSize: 13, marginBottom: 20, color: '#aaa' }}>Speichere häufig verwendete Positionen,<br />um sie schnell in Angebote &amp; Rechnungen einzufügen.</div>
              <button
                style={{ background: '#c8a96e', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setFormOffen(true)}>
                + Erste Vorlage erstellen
              </button>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf8f5' }}>
                {['Name', 'Beschreibung', 'Menge', 'Einheit', 'Preis (€)', 'Aktionen'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 700, borderBottom: '1px solid #e5e0d8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vorlagen.map((v: any) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f0ede8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a1a', maxWidth: 160 }}>
                    {v.name}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#555', maxWidth: 260 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.beschreibung || <span style={{ color: '#ccc' }}>—</span>}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#888', textAlign: 'right' }}>
                    {parseFloat(v.menge).toLocaleString('de-AT')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#888' }}>
                    {v.einheit}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#1a1a1a', fontWeight: 600, textAlign: 'right' }}>
                    {parseFloat(v.einzelpreis) > 0 ? `€ ${parseFloat(v.einzelpreis).toFixed(2)}` : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Bearbeiten" onClick={() => vorlageBearbeiten(v)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button title="Löschen" onClick={() => vorlageLoeschen(v.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fde8e6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0392b' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '40px 20px' }}>
          <div style={{ background: 'white', borderRadius: 14, width: 520, margin: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e0d8', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, flex: 1 }}>
                {bearbeitenId ? '✏️ Vorlage bearbeiten' : '📋 Neue Vorlage'}
              </div>
              <button onClick={() => { setFormOffen(false); formLeeren() }}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Name (Bezeichnung) *</label>
                <input style={inputStyle} placeholder="z.B. Malerarbeiten Innenbereich"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Beschreibung (optional)</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', height: 70 }}
                  placeholder="Detailbeschreibung der Leistung..."
                  value={beschreibung} onChange={e => setBeschreibung(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Menge</label>
                  <input style={{ ...inputStyle, textAlign: 'right' }} type="text" inputMode="decimal"
                    value={menge}
                    onChange={e => setMenge(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Einheit</label>
                  <select style={{ ...inputStyle, background: 'white' }}
                    value={einheit} onChange={e => setEinheit(e.target.value)}>
                    {EINHEITEN.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Preis (€)</label>
                  <input style={{ ...inputStyle, textAlign: 'right' }} type="text" inputMode="decimal"
                    placeholder="0,00"
                    value={einzelpreis}
                    onChange={e => setEinzelpreis(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{ flex: 1, padding: 13, background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  onClick={speichern} disabled={laden}>
                  {laden ? '⏳ Wird gespeichert...' : bearbeitenId ? '✅ Änderungen speichern' : '✅ Vorlage speichern'}
                </button>
                <button
                  style={{ padding: 13, background: '#f0ede8', color: '#888', border: 'none', borderRadius: 9, cursor: 'pointer' }}
                  onClick={() => { setFormOffen(false); formLeeren() }}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 5
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e0d8',
  borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
  boxSizing: 'border-box'
}
