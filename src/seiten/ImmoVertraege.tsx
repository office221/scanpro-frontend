import React, { useState, useEffect } from 'react'
import api from '../services/api'

const STATUS_OPTIONEN = ['Aktiv', 'Gekündigt', 'Beendet']
const STATUS_FARBEN: Record<string, { bg: string; text: string }> = {
  Aktiv:     { bg: '#d1f5e0', text: '#2d6a4f' },
  Gekündigt: { bg: '#fef3c7', text: '#92400e' },
  Beendet:   { bg: '#f0f0f0', text: '#666' },
}

const leer = { objektId: '', mieterId: '', mietbeginn: '', mietende: '', mietzins: '', bk_pauschale: '', kaution: '', status: 'Aktiv', notizen: '' }

const eur = (v: any) => v ? `€ ${parseFloat(v).toLocaleString('de-AT', { minimumFractionDigits: 2 })}` : '—'
const datum = (d: string | null) => d ? new Date(d).toLocaleDateString('de-AT') : '∞ unbefristet'

export default function ImmoVertraege() {
  const [vertraege, setVertraege] = useState<any[]>([])
  const [objekte, setObjekte] = useState<any[]>([])
  const [mieter, setMieter] = useState<any[]>([])
  const [laden, setLaden] = useState(true)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...leer })
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Alle')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const laden_ = () => {
    Promise.all([
      api.get('/immo/vertraege'),
      api.get('/immo/objekte'),
      api.get('/immo/mieter'),
    ]).then(([v, o, m]) => { setVertraege(v.data); setObjekte(o.data); setMieter(m.data) }).catch(() => {}).finally(() => setLaden(false))
  }

  useEffect(() => { laden_() }, [])

  const oeffnen = (v?: any) => {
    if (v) {
      setForm({ objektId: v.objektId||'', mieterId: v.mieterId||'', mietbeginn: v.mietbeginn ? v.mietbeginn.split('T')[0] : '', mietende: v.mietende ? v.mietende.split('T')[0] : '', mietzins: v.mietzins||'', bk_pauschale: v.bk_pauschale||'', kaution: v.kaution||'', status: v.status||'Aktiv', notizen: v.notizen||'' })
      setBearbeitenId(v.id)
    } else {
      setForm({ ...leer })
      setBearbeitenId(null)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.mietbeginn || !form.mietzins) return
    setSpeichernLaden(true)
    try {
      const daten = { ...form, mietzins: parseFloat(form.mietzins), bk_pauschale: parseFloat(form.bk_pauschale)||0, kaution: parseFloat(form.kaution)||0, objektId: form.objektId ? parseInt(form.objektId) : null, mieterId: form.mieterId ? parseInt(form.mieterId) : null, mietende: form.mietende || null }
      if (bearbeitenId) await api.put(`/immo/vertraege/${bearbeitenId}`, daten)
      else await api.post('/immo/vertraege', daten)
      setFormOffen(false)
      laden_()
    } catch { alert('Fehler beim Speichern') }
    setSpeichernLaden(false)
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Vertrag wirklich löschen?')) return
    try { await api.delete(`/immo/vertraege/${id}`); laden_() } catch { alert('Fehler') }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const gefiltert = vertraege.filter(v => statusFilter === 'Alle' || v.status === statusFilter)

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>📄 Mietverträge</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{vertraege.filter(v => v.status === 'Aktiv').length} aktive Verträge</div>
        </div>
        <button onClick={() => oeffnen()} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Neuer Vertrag
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Alle', ...STATUS_OPTIONEN].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter === s ? '#1a2a3a' : '#e5e0d8'}`, background: statusFilter === s ? '#1a2a3a' : 'white', color: statusFilter === s ? 'white' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>⏳ Laden...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e0d8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Keine Verträge gefunden</div>
          <div style={{ color: '#aaa', fontSize: 13 }}>Legen Sie einen neuen Mietvertrag an</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gefiltert.map(v => {
            const sf = STATUS_FARBEN[v.status] || STATUS_FARBEN.Beendet
            const gesamt = (parseFloat(v.mietzins)||0) + (parseFloat(v.bk_pauschale)||0)
            return (
              <div key={v.id} onClick={() => oeffnen(v)} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800 }}>
                      {v.objekt_name || '— kein Objekt —'}
                    </span>
                    <span style={{ background: sf.bg, color: sf.text, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{v.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                    👤 {v.mieter_vorname || ''} {v.mieter_nachname || '— kein Mieter —'}
                    {v.mieter_email && <span style={{ color: '#aaa', fontSize: 12 }}> · {v.mieter_email}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    📅 {datum(v.mietbeginn)} – {datum(v.mietende)}
                    {v.kaution && parseFloat(v.kaution) > 0 && <span style={{ marginLeft: 12 }}>🔒 Kaution: {eur(v.kaution)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#1a2a3a' }}>{eur(gesamt)}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>/ Monat</div>
                  {parseFloat(v.bk_pauschale) > 0 && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>incl. BK {eur(v.bk_pauschale)}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); loeschen(v.id) }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0, minHeight: 40, minWidth: 40 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'white', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 560, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {bearbeitenId ? '✏️ Vertrag bearbeiten' : '📄 Neuer Mietvertrag'}
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {/* Objekt + Mieter */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Objekt</label>
                  <select style={inputStyle} value={form.objektId} onChange={e => f('objektId', e.target.value)}>
                    <option value=''>— kein Objekt —</option>
                    {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Mieter</label>
                  <select style={inputStyle} value={form.mieterId} onChange={e => f('mieterId', e.target.value)}>
                    <option value=''>— kein Mieter —</option>
                    {mieter.map(m => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
                  </select>
                </div>
              </div>

              {/* Laufzeit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mietbeginn *</label>
                  <input style={inputStyle} type='date' value={form.mietbeginn} onChange={e => f('mietbeginn', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Mietende (leer = unbefristet)</label>
                  <input style={inputStyle} type='date' value={form.mietende} onChange={e => f('mietende', e.target.value)} />
                </div>
              </div>

              {/* Beträge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mietzins (€) *</label>
                  <input style={inputStyle} type='number' value={form.mietzins} onChange={e => f('mietzins', e.target.value)} placeholder='z.B. 850' />
                </div>
                <div>
                  <label style={labelStyle}>BK-Pauschale (€)</label>
                  <input style={inputStyle} type='number' value={form.bk_pauschale} onChange={e => f('bk_pauschale', e.target.value)} placeholder='z.B. 150' />
                </div>
                <div>
                  <label style={labelStyle}>Kaution (€)</label>
                  <input style={inputStyle} type='number' value={form.kaution} onChange={e => f('kaution', e.target.value)} placeholder='z.B. 2550' />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {STATUS_OPTIONEN.map(s => {
                    const sf = STATUS_FARBEN[s]
                    return (
                      <button key={s} onClick={() => f('status', s)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${form.status === s ? sf.text : '#e5e0d8'}`, background: form.status === s ? sf.bg : 'white', color: form.status === s ? sf.text : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{s}</button>
                    )
                  })}
                </div>
              </div>

              {/* Notizen */}
              <div>
                <label style={labelStyle}>Notizen</label>
                <textarea style={{ ...inputStyle, resize: 'none', minHeight: 60 } as any} value={form.notizen} onChange={e => f('notizen', e.target.value)} placeholder='Interne Notizen...' />
              </div>

              {/* Gesamtvorschau */}
              {form.mietzins && (
                <div style={{ background: '#f0f6fb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a2a3a' }}>
                  💰 Gesamtmiete: <strong>€ {((parseFloat(form.mietzins)||0) + (parseFloat(form.bk_pauschale)||0)).toLocaleString('de-AT', { minimumFractionDigits: 2 })}</strong> / Monat
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setFormOffen(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.mietbeginn || !form.mietzins} style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: !form.mietbeginn || !form.mietzins ? '#e5e0d8' : '#1a1a1a', color: !form.mietbeginn || !form.mietzins ? '#aaa' : 'white', fontSize: 13, fontWeight: 700, cursor: !form.mietbeginn || !form.mietzins ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
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
