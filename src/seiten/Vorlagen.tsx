import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary } from '../ui/theme'

const EINHEITEN = ['PA', 'M2', 'M3', 'LFM', 'STD', 'OBJ', 'KG', 'L', 'ST']

export default function Vorlagen() {
  const [reiter, setReiter] = useState<'positionen' | 'abschlusstexte'>('positionen')

  // ── Positions-Vorlagen ────────────────────────────────────────────────
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [laden, setLaden] = useState(false)
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState('PA')
  const [einzelpreis, setEinzelpreis] = useState('')

  useEffect(() => { vorlagenLaden() }, [])

  const vorlagenLaden = async () => {
    try {
      const r = await api.get('/vorlagen')
      setVorlagen(r.data)
    } catch (e) { console.error(e) }
  }

  const formLeeren = () => {
    setName(''); setBeschreibung(''); setMenge('1'); setEinheit('PA'); setEinzelpreis(''); setBearbeitenId(null)
  }

  const speichern = async () => {
    if (!name.trim()) { alert('Bitte einen Namen eingeben!'); return }
    setLaden(true)
    try {
      const daten = { name: name.trim(), beschreibung: beschreibung.trim(), menge: parseFloat(menge.replace(',', '.')) || 1, einheit, einzelpreis: parseFloat(einzelpreis.replace(',', '.')) || 0 }
      if (bearbeitenId) { await api.put(`/vorlagen/${bearbeitenId}`, daten) } else { await api.post('/vorlagen', daten) }
      setFormOffen(false); formLeeren(); vorlagenLaden()
    } catch (fehler: any) { alert('Fehler: ' + (fehler.response?.data?.fehler || fehler.message)) }
    setLaden(false)
  }

  const vorlageBearbeiten = (v: any) => {
    setBearbeitenId(v.id); setName(v.name || ''); setBeschreibung(v.beschreibung || '')
    setMenge(String(parseFloat(v.menge) || 1)); setEinheit(v.einheit || 'PA'); setEinzelpreis(String(parseFloat(v.einzelpreis) || ''))
    setFormOffen(true)
  }

  const vorlageLoeschen = async (id: number) => {
    if (!window.confirm('Vorlage wirklich löschen?')) return
    try { await api.delete(`/vorlagen/${id}`); vorlagenLaden() } catch (e: any) { alert('Fehler: ' + e.message) }
  }

  // ── Abschlusstexte ────────────────────────────────────────────────────
  const [abschlusstexte, setAbschlusstexte] = useState<any[]>([])
  const [atFormOffen, setAtFormOffen] = useState(false)
  const [atBearbeitenId, setAtBearbeitenId] = useState<number | null>(null)
  const [atLaden, setAtLaden] = useState(false)
  const [atName, setAtName] = useState('')
  const [atText, setAtText] = useState('')

  useEffect(() => { abschlusstexteLaden() }, [])

  const abschlusstexteLaden = async () => {
    try {
      const r = await api.get('/abschlusstexte')
      setAbschlusstexte(r.data)
    } catch (e) { console.error(e) }
  }

  const atFormLeeren = () => { setAtName(''); setAtText(''); setAtBearbeitenId(null) }

  const atSpeichern = async () => {
    if (!atName.trim()) { alert('Bitte einen Namen eingeben!'); return }
    if (!atText.trim()) { alert('Bitte einen Text eingeben!'); return }
    setAtLaden(true)
    try {
      if (atBearbeitenId) {
        await api.put(`/abschlusstexte/${atBearbeitenId}`, { name: atName.trim(), text: atText.trim() })
      } else {
        await api.post('/abschlusstexte', { name: atName.trim(), text: atText.trim() })
      }
      setAtFormOffen(false); atFormLeeren(); abschlusstexteLaden()
    } catch (fehler: any) { alert('Fehler: ' + (fehler.response?.data?.fehler || fehler.message)) }
    setAtLaden(false)
  }

  const atBearbeiten = (t: any) => {
    setAtBearbeitenId(t.id); setAtName(t.name || ''); setAtText(t.text || ''); setAtFormOffen(true)
  }

  const atLoeschen = async (id: number) => {
    if (!window.confirm('Abschlusstext wirklich löschen?')) return
    try { await api.delete(`/abschlusstexte/${id}`); abschlusstexteLaden() } catch (e: any) { alert('Fehler: ' + e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Reiter ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bf-soft)', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'positionen',    label: 'Positionsvorlagen' },
          { key: 'abschlusstexte', label: 'Abschlusstexte' },
        ] as const).map(r => (
          <button key={r.key} onClick={() => setReiter(r.key)}
            style={{ flex: 1, padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: reiter === r.key ? 700 : 400, background: reiter === r.key ? 'var(--bf-card)' : 'transparent', color: reiter === r.key ? 'var(--bf-text)' : 'var(--bf-text-muted)', boxShadow: reiter === r.key ? 'var(--bf-shadow)' : 'none', transition: 'all 0.15s' }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* ══════════════ POSITIONSVORLAGEN ══════════════ */}
      {reiter === 'positionen' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 13, color: 'var(--bf-text-muted)' }}>
              Gespeicherte Positionen – wiederverwendbar in Angeboten &amp; Rechnungen
            </div>
            <button style={{ ...btnPrimary }}
              onClick={() => { formLeeren(); setFormOffen(true) }}>
              + Neue Vorlage
            </button>
          </div>

          <div style={{ background: 'var(--bf-card)', borderRadius: 10, border: '1px solid var(--bf-border)', flex: 1, overflow: 'auto' }}>
            {vorlagen.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--bf-text)' }}>Noch keine Vorlagen</div>
                  <div style={{ fontSize: 13, marginBottom: 20, color: 'var(--bf-text-muted)' }}>Speichere häufig verwendete Positionen,<br />um sie schnell einzufügen.</div>
                  <button style={{ ...btnPrimary, padding: '10px 24px' }}
                    onClick={() => setFormOffen(true)}>
                    + Erste Vorlage erstellen
                  </button>
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bf-thead)' }}>
                    {['Name', 'Beschreibung', 'Menge', 'Einheit', 'Preis (€)', 'Aktionen'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--bf-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--bf-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vorlagen.map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--bf-divider)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bf-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 14px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--bf-text)', maxWidth: 160 }}>{v.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--bf-text-soft)', maxWidth: 260 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.beschreibung || <span style={{ color: 'var(--bf-text-muted)' }}>—</span>}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--bf-text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(v.menge).toLocaleString('de-AT')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--bf-text-muted)' }}>{v.einheit}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--bf-text)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {parseFloat(v.einzelpreis) > 0 ? `€ ${parseFloat(v.einzelpreis).toFixed(2)}` : <span style={{ color: 'var(--bf-text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button title="Bearbeiten" onClick={() => vorlageBearbeiten(v)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bf-border)', background: 'var(--bf-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bf-text-soft)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button title="Löschen" onClick={() => vorlageLoeschen(v.id)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'var(--bf-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Positionsvorlage */}
          {formOffen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '40px 20px' }}>
              <div style={{ background: 'var(--bf-card)', borderRadius: 14, width: 520, margin: 'auto', boxShadow: 'var(--bf-shadow)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bf-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, flex: 1, color: 'var(--bf-text)' }}>{bearbeitenId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</div>
                  <button onClick={() => { setFormOffen(false); formLeeren() }} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--bf-text-muted)' }}>✕</button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Name (Bezeichnung) *</label>
                    <input style={inputStyle} placeholder="z.B. Malerarbeiten Innenbereich" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Beschreibung (optional)</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', height: 70 }} placeholder="Detailbeschreibung..." value={beschreibung} onChange={e => setBeschreibung(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>Menge</label>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="text" inputMode="decimal" value={menge} onChange={e => setMenge(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Einheit</label>
                      <select style={{ ...inputStyle, background: 'var(--bf-input-bg)' }} value={einheit} onChange={e => setEinheit(e.target.value)}>
                        {EINHEITEN.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Preis (€)</label>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="text" inputMode="decimal" placeholder="0,00" value={einzelpreis} onChange={e => setEinzelpreis(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={{ ...btnPrimary, flex: 1, padding: 13, fontSize: 14 }} onClick={speichern} disabled={laden}>
                      {laden ? 'Wird gespeichert...' : bearbeitenId ? 'Änderungen speichern' : 'Vorlage speichern'}
                    </button>
                    <button style={{ ...btnSecondary, padding: 13 }} onClick={() => { setFormOffen(false); formLeeren() }}>Abbrechen</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════ ABSCHLUSSTEXTE ══════════════ */}
      {reiter === 'abschlusstexte' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 13, color: 'var(--bf-text-muted)' }}>
              Gespeicherte Abschlusstexte – für den unteren Teil von Angeboten &amp; Rechnungen
            </div>
            <button style={{ ...btnPrimary }}
              onClick={() => { atFormLeeren(); setAtFormOffen(true) }}>
              + Neuer Abschlusstext
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
            {abschlusstexte.length === 0 ? (
              <div style={{ background: 'var(--bf-card)', borderRadius: 10, border: '1px solid var(--bf-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <div style={{ textAlign: 'center', color: 'var(--bf-text-muted)' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--bf-text)' }}>Noch keine Abschlusstexte</div>
                  <div style={{ fontSize: 13, marginBottom: 20, color: 'var(--bf-text-muted)' }}>Erstelle Vorlagen für Grußformeln und Abschlusstexte.</div>
                  <button style={{ ...btnPrimary, padding: '10px 24px' }}
                    onClick={() => setAtFormOffen(true)}>
                    + Ersten Abschlusstext erstellen
                  </button>
                </div>
              </div>
            ) : (
              abschlusstexte.map((t: any) => (
                <div key={t.id} style={{ background: 'var(--bf-card)', borderRadius: 10, border: '1px solid var(--bf-border)', padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--bf-text)', marginBottom: 8 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--bf-text-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bf-soft)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--bf-divider)' }}>{t.text}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <button title="Bearbeiten" onClick={() => atBearbeiten(t)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bf-border)', background: 'var(--bf-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bf-text-soft)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button title="Löschen" onClick={() => atLoeschen(t.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'var(--bf-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Abschlusstext */}
          {atFormOffen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '40px 20px' }}>
              <div style={{ background: 'var(--bf-card)', borderRadius: 14, width: 580, margin: 'auto', boxShadow: 'var(--bf-shadow)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bf-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, flex: 1, color: 'var(--bf-text)' }}>{atBearbeitenId ? 'Abschlusstext bearbeiten' : 'Neuer Abschlusstext'}</div>
                  <button onClick={() => { setAtFormOffen(false); atFormLeeren() }} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--bf-text-muted)' }}>✕</button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Name (interne Bezeichnung) *</label>
                    <input style={inputStyle} placeholder="z.B. Standard Angebotsabschluss" value={atName} onChange={e => setAtName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Text *</label>
                    <textarea
                      style={{ ...inputStyle, resize: 'vertical', height: 160, lineHeight: '1.7' }}
                      placeholder="Abschlusstext eingeben..."
                      value={atText}
                      onChange={e => setAtText(e.target.value)} />
                    <div style={{ fontSize: 11, color: 'var(--bf-text-muted)', marginTop: 4 }}>Neue Zeile = Zeilenumbruch im PDF. Leerzeile = Absatz.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={{ ...btnPrimary, flex: 1, padding: 13, fontSize: 14 }} onClick={atSpeichern} disabled={atLaden}>
                      {atLaden ? 'Wird gespeichert...' : atBearbeitenId ? 'Änderungen speichern' : 'Abschlusstext speichern'}
                    </button>
                    <button style={{ ...btnSecondary, padding: 13 }} onClick={() => { setAtFormOffen(false); atFormLeeren() }}>Abbrechen</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: 0.8, color: 'var(--bf-text-muted)', fontWeight: 600, marginBottom: 5
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--bf-input-border)',
  background: 'var(--bf-input-bg)', color: 'var(--bf-text)',
  borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
  boxSizing: 'border-box'
}
