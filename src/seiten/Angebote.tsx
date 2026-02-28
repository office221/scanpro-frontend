import React, { useState, useEffect } from 'react'
import api from '../services/api'

interface Position {
  typ: string
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
}

interface Kunde {
  id: number
  kundennummer: string
  vorname: string
  nachname: string
  firma?: string
}

export default function Angebote() {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [angebote, setAngebote] = useState<any[]>([])
  const [formOffen, setFormOffen] = useState(false)
  const [laden, setLaden] = useState(false)
  const [selectedKunde, setSelectedKunde] = useState<number | null>(null)
  const [projektName, setProjektName] = useState('')
  const [projektAdresse, setProjektAdresse] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [gueltigBis, setGueltigBis] = useState('')
  const [istKleinunternehmer, setIstKleinunternehmer] = useState(true)
  const [positionen, setPositionen] = useState<Position[]>([
    { typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }
  ])

  useEffect(() => {
    api.get('/kunden').then(r => setKunden(r.data))
    angeboteLaden()
  }, [])

  const angeboteLaden = async () => {
    const r = await api.get('/rechnungen')
    setAngebote(r.data.filter((x: any) => x.typ === 'Angebot'))
  }

  const formLeeren = () => {
    setSelectedKunde(null)
    setProjektName('')
    setProjektAdresse('')
    setGueltigBis('')
    setDatum(new Date().toISOString().split('T')[0])
    setPositionen([{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
  }

  const zwischensumme = positionen
    .filter(p => p.typ === 'Normal')
    .reduce((sum, p) => sum + (p.menge * p.einzelpreis), 0)
  const mwst = istKleinunternehmer ? 0 : zwischensumme * 0.20
  const gesamt = zwischensumme + mwst

  const positionHinzufuegen = () => {
    setPositionen([...positionen, { typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
  }

  const positionAendern = (idx: number, feld: string, wert: any) => {
    const neu = [...positionen]
    ;(neu[idx] as any)[feld] = wert
    setPositionen(neu)
  }

  const positionLoeschen = (idx: number) => {
    setPositionen(positionen.filter((_, i) => i !== idx))
  }

  const speichern = async () => {
    if (!selectedKunde) { alert('Bitte Kunde auswählen!'); return }
    setLaden(true)
    try {
      await api.post('/rechnungen', {
        typ: 'Angebot',
        kundeId: selectedKunde,
        projektName,
        projektAdresse,
        datum,
        gueltigBis: gueltigBis || null,
        faelligBis: null,
        istKleinunternehmer,
        status: 'Entwurf',
        positionen
      })
      setFormOffen(false)
      formLeeren()
      angeboteLaden()
    } catch (fehler: any) {
      alert('Fehler: ' + (fehler.response?.data?.fehler || fehler.message))
    }
    setLaden(false)
  }

  const statusAendern = async (id: number, status: string) => {
    try {
      await api.put(`/rechnungen/${id}/status`, { status })
      angeboteLaden()
    } catch (e) {
      alert('Fehler beim Status ändern!')
    }
  }

  const zuRechnungKonvertieren = async (angebot: any) => {
    if (!window.confirm(`Angebot ${angebot.nummer} zu Rechnung konvertieren?`)) return
    try {
      const posRes = await api.get(`/rechnungen/${angebot.id}/positionen`)
      await api.post('/rechnungen', {
        typ: 'Rechnung',
        kundeId: angebot.kundeId,
        projektName: angebot.projektName,
        projektAdresse: angebot.projektAdresse,
        datum: new Date().toISOString().split('T')[0],
        faelligBis: null,
        gueltigBis: null,
        istKleinunternehmer: angebot.istKleinunternehmer,
        status: 'Offen',
        positionen: posRes.data
      })
      await statusAendern(angebot.id, 'Angenommen')
      alert('✅ Rechnung wurde erstellt!')
      angeboteLaden()
    } catch (e: any) {
      alert('Fehler: ' + e.message)
    }
  }

  const angebotLoeschen = async (id: number) => {
    if (!window.confirm('Angebot wirklich löschen?')) return
    try {
      await api.delete(`/rechnungen/${id}`)
      angeboteLaden()
    } catch (e: any) {
      alert('Fehler: ' + e.message)
    }
  }

  const angebotBearbeiten = (a: any) => {
    setSelectedKunde(a.kundeId)
    setProjektName(a.projektName || '')
    setProjektAdresse(a.projektAdresse || '')
    setDatum(a.datum?.split('T')[0] || new Date().toISOString().split('T')[0])
    setGueltigBis(a.gueltigBis?.split('T')[0] || '')
    setIstKleinunternehmer(a.istKleinunternehmer)
    setFormOffen(true)
  }

  const pdfOeffnen = (id: number) => {
    const token = localStorage.getItem('token')
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
    window.open(`${baseUrl}/api/pdf/${id}?token=${token}`, '_blank')
  }

  const statusFarbe = (status: string) => {
    switch(status) {
      case 'Angenommen': return { bg: '#d1f5e0', text: '#2d6a4f' }
      case 'Abgelehnt': return { bg: '#fde8e6', text: '#c0392b' }
      case 'Gesendet': return { bg: '#dbeafe', text: '#1e40af' }
      default: return { bg: '#f0f0f0', text: '#666' }
    }
  }

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>

      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <div style={{flex:1, fontFamily:'Syne, sans-serif', fontSize:13, color:'#888'}}>Alle Angebote</div>
        <button
          style={{background:'#1a1a1a', color:'white', border:'none', borderRadius:8, padding:'9px 18px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
          onClick={() => { formLeeren(); setFormOffen(true) }}>
          + Neues Angebot
        </button>
      </div>

      <div style={{background:'white', borderRadius:10, border:'1px solid #e5e0d8', flex:1, overflow:'auto'}}>
        {angebote.length === 0 ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>
            <div style={{textAlign:'center', color:'#888'}}>
              <div style={{fontSize:48, marginBottom:16}}>📄</div>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, marginBottom:8, color:'#1a1a1a'}}>Noch keine Angebote</div>
              <button
                style={{background:'#c8a96e', color:'#0a0a0a', border:'none', borderRadius:8, padding:'10px 24px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
                onClick={() => setFormOffen(true)}>
                + Erstes Angebot erstellen
              </button>
            </div>
          </div>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#faf8f5'}}>
                {['Nummer', 'Kunde', 'Projekt', 'Gültig bis', 'Status', 'Aktionen'].map(h => (
                  <th key={h} style={{padding:'9px 14px', textAlign:'left', fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'#888', fontWeight:700, borderBottom:'1px solid #e5e0d8'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {angebote.map((a: any) => {
                const farben = statusFarbe(a.status)
                return (
                  <tr key={a.id} style={{borderBottom:'1px solid #f0ede8'}}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{padding:'10px 14px', fontFamily:'Syne, sans-serif', fontSize:11, fontWeight:700, color:'#888'}}>{a.nummer}</td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#1a1a1a'}}>
                      {kunden.find(k => k.id === a.kundeId)?.vorname} {kunden.find(k => k.id === a.kundeId)?.nachname}
                    </td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>{a.projektName || '—'}</td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>
                      {a.gueltigBis ? new Date(a.gueltigBis).toLocaleDateString('de-AT') : '—'}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <select
                        style={{fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:4, border:'none', background: farben.bg, color: farben.text, cursor:'pointer'}}
                        value={a.status}
                        onChange={e => statusAendern(a.id, e.target.value)}>
                        {['Entwurf', 'Gesendet', 'Angenommen', 'Abgelehnt'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex', gap:6}}>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #c8a96e', background:'#fdf8f0', color:'#c8a96e', fontSize:11, fontWeight:600, cursor:'pointer'}}
                          onClick={() => zuRechnungKonvertieren(a)}>
                          📋 → Rechnung
                        </button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #d1f5e0', background:'#f0fdf4', color:'#2d6a4f', fontSize:11, cursor:'pointer'}}
                          onClick={() => pdfOeffnen(a.id)}>
                          📄 PDF
                        </button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #e5e0d8', background:'white', fontSize:11, cursor:'pointer'}}
                          onClick={() => angebotBearbeiten(a)}>
                          ✏️
                        </button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #fde8e6', background:'white', color:'#c0392b', fontSize:11, cursor:'pointer'}}
                          onClick={() => angebotLoeschen(a.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {formOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:100, overflowY:'auto', padding:'20px 0'}}>
          <div style={{background:'white', borderRadius:14, width:680, margin:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>

            <div style={{padding:'20px 24px', borderBottom:'1px solid #e5e0d8', display:'flex', alignItems:'center', gap:12}}>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, flex:1}}>📄 Neues Angebot</div>
              <button onClick={() => setFormOffen(false)}
                style={{background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:'#888'}}>✕</button>
            </div>

            <div style={{padding:24}}>
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Kunde *</label>
                <select style={{...inputStyle, background:'white'}}
                  value={selectedKunde || ''}
                  onChange={e => setSelectedKunde(Number(e.target.value))}>
                  <option value="">Kunde auswählen...</option>
                  {kunden.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.kundennummer} — {k.vorname} {k.nachname} {k.firma ? `(${k.firma})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
                <div>
                  <label style={labelStyle}>Projektname</label>
                  <input style={inputStyle} placeholder="z.B. Bürogebäude Wien"
                    value={projektName} onChange={e => setProjektName(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Projektadresse</label>
                  <input style={inputStyle} placeholder="Straße, PLZ Ort"
                    value={projektAdresse} onChange={e => setProjektAdresse(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Datum</label>
                  <input style={inputStyle} type="date"
                    value={datum} onChange={e => setDatum(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Gültig bis</label>
                  <input style={inputStyle} type="date"
                    value={gueltigBis} onChange={e => setGueltigBis(e.target.value)} />
                </div>
              </div>

              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'10px 14px', background:'#f5f3ef', borderRadius:8}}>
                <input type="checkbox" checked={istKleinunternehmer}
                  onChange={e => setIstKleinunternehmer(e.target.checked)}
                  style={{width:16, height:16, cursor:'pointer'}} />
                <div>
                  <div style={{fontSize:13, fontWeight:500}}>§6 Kleinunternehmer</div>
                  <div style={{fontSize:11, color:'#888'}}>Keine MwSt. — Pflichttext wird automatisch hinzugefügt</div>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:10}}>Positionen</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 80px 100px 100px 32px', gap:8, marginBottom:4}}>
                  {['Beschreibung', 'Menge', 'Einheit', '€ Preis', ''].map(h => (
                    <div key={h} style={{fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'#aaa', fontWeight:700}}>{h}</div>
                  ))}
                </div>
                {positionen.map((pos, idx) => (
                  <div key={idx} style={{display:'grid', gridTemplateColumns:'1fr 80px 100px 100px 32px', gap:8, marginBottom:8, alignItems:'center'}}>
                    <input style={inputStyle} placeholder="Beschreibung..."
                      value={pos.beschreibung}
                      onChange={e => positionAendern(idx, 'beschreibung', e.target.value)} />
                    <input style={{...inputStyle, textAlign:'right'}} type="number"
                      value={pos.menge}
                      onChange={e => positionAendern(idx, 'menge', parseFloat(e.target.value) || 0)} />
                    <select style={{...inputStyle, background:'white'}}
                      value={pos.einheit}
                      onChange={e => positionAendern(idx, 'einheit', e.target.value)}>
                      {['PA', 'M2', 'M3', 'LFM', 'STD', 'OBJ'].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <input style={{...inputStyle, textAlign:'right'}} type="number"
                      value={pos.einzelpreis}
                      onChange={e => positionAendern(idx, 'einzelpreis', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => positionLoeschen(idx)}
                      style={{background:'#fde8e6', border:'none', borderRadius:6, width:32, height:36, cursor:'pointer', color:'#c0392b', fontSize:14}}>✕</button>
                  </div>
                ))}
                <button onClick={positionHinzufuegen}
                  style={{width:'100%', padding:'9px', border:'2px dashed #e5e0d8', borderRadius:8, background:'transparent', color:'#888', fontFamily:'DM Sans, sans-serif', fontSize:13, cursor:'pointer', marginTop:4}}>
                  + Position hinzufügen
                </button>
              </div>

              <div style={{background:'#f5f3ef', borderRadius:10, padding:16, marginBottom:20}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#888'}}>
                  <span>Zwischensumme</span><span>€ {zwischensumme.toFixed(2)}</span>
                </div>
                {!istKleinunternehmer && (
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#888'}}>
                    <span>MwSt. 20%</span><span>€ {mwst.toFixed(2)}</span>
                  </div>
                )}
                {istKleinunternehmer && (
                  <div style={{fontSize:11, color:'#c8a96e', marginBottom:6}}>§6 UStG — keine MwSt.</div>
                )}
                <div style={{display:'flex', justifyContent:'space-between', fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, borderTop:'1px solid #e5e0d8', paddingTop:10}}>
                  <span>Gesamt</span><span>€ {gesamt.toFixed(2)}</span>
                </div>
              </div>

              <div style={{display:'flex', gap:10}}>
                <button
                  style={{flex:1, padding:13, background:'#1a1a1a', color:'white', border:'none', borderRadius:9, fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer'}}
                  onClick={speichern} disabled={laden}>
                  {laden ? '⏳ Wird gespeichert...' : '✅ Angebot speichern'}
                </button>
                <button
                  style={{padding:13, background:'#f0ede8', color:'#888', border:'none', borderRadius:9, cursor:'pointer'}}
                  onClick={() => setFormOffen(false)}>
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
  display:'block', fontSize:11, textTransform:'uppercase',
  letterSpacing:0.8, color:'#888', fontWeight:600, marginBottom:5
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'9px 12px', border:'1px solid #e5e0d8',
  borderRadius:7, fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none'
}