import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary, ACCENT } from '../ui/theme'

const KATEGORIEN = ['Wasser', 'Strom', 'Gas / Heizung', 'Müll / Abfall', 'Reinigung', 'Versicherung', 'Verwaltung', 'Reparaturen', 'Sonstiges']

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

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
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--bf-text)' }}>Betriebskostenabrechnung</div>
          <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>Nebenkosten je Objekt und Jahr</div>
        </div>
        <button onClick={() => oeffnen()} style={{ ...btnPrimary, padding: '10px 20px', fontSize: 13 }}>
          + Neuer Eintrag
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterObjekt} onChange={e => setFilterObjekt(e.target.value)} style={{ padding: '9px 12px', border: '1px solid var(--bf-input-border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bf-input-bg)', color: 'var(--bf-text)', minWidth: 200 }}>
          <option value=''>Alle Objekte</option>
          {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterJahr} onChange={e => setFilterJahr(e.target.value)} style={{ padding: '9px 12px', border: '1px solid var(--bf-input-border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bf-input-bg)', color: 'var(--bf-text)' }}>
          <option value=''>Alle Jahre</option>
          {jahre.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      {/* Übersichtskarten */}
      {Object.keys(kategorieMap).length > 0 && (
        <div style={{ background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--bf-text)' }}>
            Jahresübersicht {filterJahr} {filterObjekt ? `· ${objekte.find(o => o.id.toString() === filterObjekt)?.name}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
            {Object.entries(kategorieMap).map(([kat, betrag]) => (
              <div key={kat} style={{ background: 'var(--bf-soft)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--bf-text-muted)', marginBottom: 3 }}>{kat}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums' }}>€ {eur(betrag)}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--bf-border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--bf-text-muted)' }}>Gesamt {filterJahr}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums' }}>€ {eur(gesamt)}</span>
          </div>
        </div>
      )}

      {/* Tabelle */}
      {laden ? (
        <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)', padding: 40 }}>Laden...</div>
      ) : eintraege.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--bf-text)' }}>Keine Einträge</div>
          <div style={{ color: 'var(--bf-text-muted)', fontSize: 13 }}>Fügen Sie Betriebskosteneinträge für {filterJahr || 'das aktuelle Jahr'} hinzu</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bf-thead)' }}>
                {['Kategorie', 'Objekt', 'Jahr', 'Betrag', 'Notizen', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--bf-text-muted)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eintraege.map((e, i) => (
                <tr key={e.id} onClick={() => oeffnen(e)} style={{ borderTop: i > 0 ? '1px solid var(--bf-divider)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={el => (el.currentTarget.style.background = 'var(--bf-hover)')} onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--bf-text)' }}>{e.kategorie}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--bf-text-soft)' }}>{e.objekt_name || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--bf-text-soft)' }}>{e.jahr}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums' }}>€ {eur(e.betrag)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--bf-text-muted)' }}>{e.notizen || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={ev => { ev.stopPropagation(); loeschen(e.id) }} style={{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', padding: '5px 10px', fontSize: 11 }}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: 'var(--bf-card)', borderRadius: isMobile ? 0 : 16, padding: 28, width: '100%', maxWidth: isMobile ? '100%' : 480, height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--bf-text)' }}>
              {bearbeitenId ? 'Eintrag bearbeiten' : 'Neuer BK-Eintrag'}
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
                    <button key={k} onClick={() => f('kategorie', k)} style={{ padding: '5px 10px', borderRadius: 16, border: `1.5px solid ${form.kategorie === k ? ACCENT : 'var(--bf-border)'}`, background: form.kategorie === k ? 'var(--bf-soft)' : 'var(--bf-card)', color: form.kategorie === k ? 'var(--bf-text)' : 'var(--bf-text-soft)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {k}
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
              <button onClick={() => setFormOffen(false)} style={{ ...btnSecondary, flex: 1, padding: 11, fontSize: 13 }}>Abbrechen</button>
              <button onClick={speichern} disabled={speichernLaden || !form.betrag || !form.jahr} style={{ ...btnPrimary, flex: 2, padding: 11, fontSize: 13, opacity: !form.betrag || !form.jahr ? 0.55 : 1, cursor: !form.betrag || !form.jahr ? 'not-allowed' : 'pointer' }}>
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
