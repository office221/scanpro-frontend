import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary, ACCENT } from '../ui/theme'

const STATUS_OPTIONEN = ['Aktiv', 'Gekündigt', 'Beendet']
const STATUS_FARBEN: Record<string, string> = {
  Aktiv:     '#10b981',
  Gekündigt: '#f59e0b',
  Beendet:   '#94a3b8',
}

const leer = { objektId: '', mieterId: '', mietbeginn: '', mietende: '', mietzins: '', bk_pauschale: '', kaution: '', status: 'Aktiv', notizen: '' }

const eur = (v: any) => v ? `€ ${parseFloat(v).toLocaleString('de-AT', { minimumFractionDigits: 2 })}` : '—'
const datum = (d: string | null) => d ? new Date(d).toLocaleDateString('de-AT') : 'unbefristet'

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
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--bf-text)' }}>Mietverträge</div>
          <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>{vertraege.filter(v => v.status === 'Aktiv').length} aktive Verträge</div>
        </div>
        <button onClick={() => oeffnen()} style={{ ...btnPrimary, padding: '10px 20px', fontSize: 13 }}>
          + Neuer Vertrag
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Alle', ...STATUS_OPTIONEN].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter === s ? ACCENT : 'var(--bf-border)'}`, background: statusFilter === s ? 'var(--bf-soft)' : 'var(--bf-card)', color: statusFilter === s ? 'var(--bf-text)' : 'var(--bf-text-soft)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)', padding: 40 }}>Laden...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--bf-text)' }}>Keine Verträge gefunden</div>
          <div style={{ color: 'var(--bf-text-muted)', fontSize: 13 }}>Legen Sie einen neuen Mietvertrag an</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gefiltert.map(v => {
            const sf = STATUS_FARBEN[v.status] || STATUS_FARBEN.Beendet
            const gesamt = (parseFloat(v.mietzins)||0) + (parseFloat(v.bk_pauschale)||0)
            return (
              <div key={v.id} onClick={() => oeffnen(v)} style={{ background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--bf-shadow)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--bf-text)' }}>
                      {v.objekt_name || '— kein Objekt —'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bf-soft)', border: '1px solid var(--bf-border)', color: 'var(--bf-text-soft)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: sf, flexShrink: 0 }} />
                      {v.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--bf-text-soft)', marginBottom: 4 }}>
                    {v.mieter_vorname || ''} {v.mieter_nachname || '— kein Mieter —'}
                    {v.mieter_email && <span style={{ color: 'var(--bf-text-muted)', fontSize: 12 }}> · {v.mieter_email}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bf-text-muted)' }}>
                    {datum(v.mietbeginn)} – {datum(v.mietende)}
                    {v.kaution && parseFloat(v.kaution) > 0 && <span style={{ marginLeft: 12 }}>Kaution: {eur(v.kaution)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums' }}>{eur(gesamt)}</div>
                  <div style={{ fontSize: 11, color: 'var(--bf-text-muted)' }}>/ Monat</div>
                  {parseFloat(v.bk_pauschale) > 0 && <div style={{ fontSize: 11, color: 'var(--bf-text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>incl. BK {eur(v.bk_pauschale)}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); loeschen(v.id) }} style={{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                  Löschen
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'var(--bf-card)', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 560, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--bf-text)' }}>
              {bearbeitenId ? 'Vertrag bearbeiten' : 'Neuer Mietvertrag'}
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
                      <button key={s} onClick={() => f('status', s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${form.status === s ? sf : 'var(--bf-border)'}`, background: form.status === s ? 'var(--bf-soft)' : 'var(--bf-card)', color: form.status === s ? 'var(--bf-text)' : 'var(--bf-text-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: sf, flexShrink: 0 }} />
                        {s}
                      </button>
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
                <div style={{ background: 'var(--bf-soft)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--bf-text)' }}>
                  Gesamtmiete: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>€ {((parseFloat(form.mietzins)||0) + (parseFloat(form.bk_pauschale)||0)).toLocaleString('de-AT', { minimumFractionDigits: 2 })}</strong> / Monat
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setFormOffen(false)} style={{ ...btnSecondary, flex: 1, padding: 11, fontSize: 13 }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.mietbeginn || !form.mietzins} style={{ ...btnPrimary, flex: 2, padding: 11, fontSize: 13, opacity: !form.mietbeginn || !form.mietzins ? 0.55 : 1, cursor: !form.mietbeginn || !form.mietzins ? 'not-allowed' : 'pointer' }}>
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
