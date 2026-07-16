import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary, ACCENT, ACCENT_2 } from '../ui/theme'

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
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--bf-text)' }}>Mieter</div>
          <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>{mieter.length} Mieter gesamt</div>
        </div>
        <button onClick={() => oeffnen()} style={{ ...btnPrimary, padding: '10px 20px', fontSize: 13 }}>
          + Neuer Mieter
        </button>
      </div>

      {/* Suche */}
      <input value={suche} onChange={e => setSuche(e.target.value)} placeholder='Mieter suchen...'
        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bf-input-border)', background: 'var(--bf-input-bg)', color: 'var(--bf-text)', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)', padding: 40 }}>Laden...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--bf-text)' }}>Keine Mieter gefunden</div>
          <div style={{ color: 'var(--bf-text-muted)', fontSize: 13 }}>Fügen Sie Ihren ersten Mieter hinzu</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', overflow: 'hidden' }}>
          {gefiltert.map((m, i) => (
            <div key={m.id} onClick={() => oeffnen(m)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < gefiltert.length - 1 ? '1px solid var(--bf-divider)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bf-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {/* Avatar */}
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                {initials(m)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bf-text)' }}>{m.vorname} {m.nachname}</div>
                <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>
                  {[m.email, m.telefon].filter(Boolean).join(' · ')}
                </div>
              </div>
              {m.aktuelles_objekt && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, background: 'var(--bf-soft)', border: '1px solid var(--bf-border)', color: 'var(--bf-text-soft)', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  {m.aktuelles_objekt}
                </span>
              )}
              <button onClick={e => { e.stopPropagation(); loeschen(m.id) }} style={{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'var(--bf-card)', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 480, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--bf-text)' }}>
              {bearbeitenId ? 'Mieter bearbeiten' : 'Neuer Mieter'}
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
              <button onClick={() => setFormOffen(false)} style={{ ...btnSecondary, flex: 1, padding: 11, fontSize: 13 }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.nachname.trim()} style={{ ...btnPrimary, flex: 2, padding: 11, fontSize: 13, opacity: speichernLaden || !form.nachname.trim() ? 0.55 : 1, cursor: speichernLaden || !form.nachname.trim() ? 'not-allowed' : 'pointer' }}>
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
