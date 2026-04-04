import React, { useState, useEffect } from 'react'
import api from '../services/api'

const leer = { vorname: '', nachname: '', email: '', telefon: '', adresse: '', notizen: '' }

export default function ImmoMieter() {
  const [mieter, setMieter] = useState<any[]>([])
  const [laden, setLaden] = useState(true)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...leer })
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [suche, setSuche] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const laden_ = () => {
    api.get('/immo/mieter').then(r => setMieter(r.data)).catch(() => {}).finally(() => setLaden(false))
  }

  useEffect(() => { laden_() }, [])

  const oeffnen = (m?: any) => {
    if (m) {
      setForm({ vorname: m.vorname||'', nachname: m.nachname||'', email: m.email||'', telefon: m.telefon||'', adresse: m.adresse||'', notizen: m.notizen||'' })
      setBearbeitenId(m.id)
    } else {
      setForm({ ...leer })
      setBearbeitenId(null)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.nachname.trim()) return
    setSpeichernLaden(true)
    try {
      if (bearbeitenId) await api.put(`/immo/mieter/${bearbeitenId}`, form)
      else await api.post('/immo/mieter', form)
      setFormOffen(false)
      laden_()
    } catch { alert('Fehler beim Speichern') }
    setSpeichernLaden(false)
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Mieter wirklich löschen?')) return
    try { await api.delete(`/immo/mieter/${id}`); laden_() } catch { alert('Fehler') }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const gefiltert = mieter.filter(m => {
    const q = suche.toLowerCase()
    return !q || `${m.vorname} ${m.nachname}`.toLowerCase().includes(q) || (m.email||'').toLowerCase().includes(q)
  })

  const initials = (m: any) => `${(m.vorname||'')[0]||''}${(m.nachname||'')[0]||''}`.toUpperCase()

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>👤 Mieter</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{mieter.length} Mieter gesamt</div>
        </div>
        <button onClick={() => oeffnen()} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Neuer Mieter
        </button>
      </div>

      {/* Suche */}
      <input value={suche} onChange={e => setSuche(e.target.value)} placeholder='🔍 Mieter suchen...'
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e0d8', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>⏳ Laden...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e0d8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Keine Mieter gefunden</div>
          <div style={{ color: '#aaa', fontSize: 13 }}>Fügen Sie Ihren ersten Mieter hinzu</div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', overflow: 'hidden' }}>
          {gefiltert.map((m, i) => (
            <div key={m.id} onClick={() => oeffnen(m)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < gefiltert.length - 1 ? '1px solid #f0ede8' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              {/* Avatar */}
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a2a3a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                {initials(m)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2a3a' }}>{m.vorname} {m.nachname}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {[m.email, m.telefon].filter(Boolean).join(' · ')}
                </div>
              </div>
              {m.aktuelles_objekt && (
                <span style={{ fontSize: 11, background: '#d1f5e0', color: '#2d6a4f', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                  🏠 {m.aktuelles_objekt}
                </span>
              )}
              <button onClick={e => { e.stopPropagation(); loeschen(m.id) }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '0 4px', minHeight: 40, minWidth: 40 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'white', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 480, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {bearbeitenId ? '✏️ Mieter bearbeiten' : '👤 Neuer Mieter'}
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vorname</label>
                  <input style={inputStyle} value={form.vorname} onChange={e => f('vorname', e.target.value)} placeholder='Max' />
                </div>
                <div>
                  <label style={labelStyle}>Nachname *</label>
                  <input style={inputStyle} value={form.nachname} onChange={e => f('nachname', e.target.value)} placeholder='Mustermann' />
                </div>
              </div>
              <div>
                <label style={labelStyle}>E-Mail</label>
                <input style={inputStyle} type='email' value={form.email} onChange={e => f('email', e.target.value)} placeholder='mieter@beispiel.at' />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input style={inputStyle} value={form.telefon} onChange={e => f('telefon', e.target.value)} placeholder='+43 ...' />
              </div>
              <div>
                <label style={labelStyle}>Aktuelle Anschrift (Zustellung)</label>
                <input style={inputStyle} value={form.adresse} onChange={e => f('adresse', e.target.value)} placeholder='Straße Nr., PLZ Ort' />
              </div>
              <div>
                <label style={labelStyle}>Notizen</label>
                <textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 } as any} value={form.notizen} onChange={e => f('notizen', e.target.value)} placeholder='Interne Notizen...' />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setFormOffen(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.nachname.trim()} style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: speichernLaden || !form.nachname.trim() ? '#e5e0d8' : '#1a1a1a', color: speichernLaden || !form.nachname.trim() ? '#aaa' : 'white', fontSize: 13, fontWeight: 700, cursor: speichernLaden || !form.nachname.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
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
