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
  const [zahlungsModus, setZahlungsModus] = useState('standard')
  const [zahlungsEigenText, setZahlungsEigenText] = useState('')
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [autocomplete, setAutocomplete] = useState<{idx: number; items: any[]} | null>(null)
  const [vorlagenPickerOffen, setVorlagenPickerOffen] = useState(false)

  useEffect(() => {
    if (formOffen) {
      api.get('/vorlagen').then(r => setVorlagen(r.data)).catch(() => {})
      setVorlagenPickerOffen(false)
      setAutocomplete(null)
    }
  }, [formOffen])

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
    setZahlungsModus('standard')
    setZahlungsEigenText('')
    setBearbeitenId(null)
    setFormKey(k => k + 1)
  }

  const zahlungsModusErkennen = (wert: string | null) => {
    if (!wert) return { modus: 'standard', eigen: '' }
    if (wert === '__ausblenden__') return { modus: 'ausblenden', eigen: '' }
    if (wert === 'Zahlbar innerhalb von 7 Tagen nach Rechnungserhalt.') return { modus: '7tage', eigen: '' }
    if (wert === 'Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt.') return { modus: '14tage', eigen: '' }
    return { modus: 'eigen', eigen: wert }
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
    setFormKey(k => k + 1)
  }

  const positionVerschieben = (idx: number, richtung: 'hoch' | 'runter') => {
    const neu = [...positionen]
    const ziel = richtung === 'hoch' ? idx - 1 : idx + 1
    if (ziel < 0 || ziel >= neu.length) return
    ;[neu[idx], neu[ziel]] = [neu[ziel], neu[idx]]
    setPositionen(neu)
    setFormKey(k => k + 1)
  }

  const vorlageEinfuegen = (idx: number, v: any) => {
    const neu = [...positionen]
    neu[idx] = { ...neu[idx], beschreibung: v.beschreibung || v.name, menge: parseFloat(v.menge) || 1, einheit: v.einheit || 'PA', einzelpreis: parseFloat(v.einzelpreis) || 0 }
    setPositionen(neu)
    setFormKey(k => k + 1)
    setAutocomplete(null)
  }

  const vorlageAlsPositionHinzufuegen = (v: any) => {
    setPositionen([...positionen, { typ: 'Normal', beschreibung: v.beschreibung || v.name, menge: parseFloat(v.menge) || 1, einheit: v.einheit || 'PA', einzelpreis: parseFloat(v.einzelpreis) || 0 }])
    setFormKey(k => k + 1)
    setVorlagenPickerOffen(false)
  }

  const speichern = async () => {
    if (!selectedKunde) { alert('Bitte Kunde auswählen!'); return }
    setLaden(true)
    try {
      const daten = {
        typ: 'Angebot',
        kundeId: selectedKunde,
        projektName,
        projektAdresse,
        datum,
        gueltigBis: gueltigBis || null,
        faelligBis: null,
        istKleinunternehmer,
        status: 'Entwurf',
        zahlungshinweis: zahlungsModus === 'standard' ? '' :
          zahlungsModus === 'ausblenden' ? '__ausblenden__' :
          zahlungsModus === '7tage' ? 'Zahlbar innerhalb von 7 Tagen nach Rechnungserhalt.' :
          zahlungsModus === '14tage' ? 'Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt.' :
          zahlungsModus === 'eigen' ? zahlungsEigenText : '',
        positionen
      }
      if (bearbeitenId) {
        await api.put(`/rechnungen/${bearbeitenId}`, daten)
      } else {
        await api.post('/rechnungen', daten)
      }
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

  const angebotBearbeiten = async (a: any) => {
    try {
      const posRes = await api.get(`/rechnungen/${a.id}/positionen`)
      setBearbeitenId(a.id)
      setSelectedKunde(a.kundeId)
      setProjektName(a.projektName || '')
      setProjektAdresse(a.projektAdresse || '')
      setDatum(a.datum?.split('T')[0] || new Date().toISOString().split('T')[0])
      setGueltigBis(a.gueltigBis?.split('T')[0] || '')
      setIstKleinunternehmer(a.istKleinunternehmer)
      const zm = zahlungsModusErkennen(a.zahlungshinweis)
      setZahlungsModus(zm.modus)
      setZahlungsEigenText(zm.eigen)
      setPositionen(posRes.data.length > 0
        ? posRes.data.map((p: any) => ({ ...p, menge: parseFloat(p.menge) || 0, einzelpreis: parseFloat(p.einzelpreis) || 0 }))
        : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }]
      )
      setFormKey(k => k + 1)
      setFormOffen(true)
    } catch (e) {
      alert('Fehler beim Laden des Angebots!')
    }
  }

  const pdfOeffnen = (id: number) => {
    const token = localStorage.getItem('token')
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
    window.open(`${baseUrl}/api/pdf/${id}?token=${token}`, '_blank')
  }

  const pdfHerunterladen = async (id: number) => {
    const token = localStorage.getItem('token')
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
    try {
      const res = await fetch(`${baseUrl}/api/pdf/${id}?token=${token}&download=1`)
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match ? match[1] : `Dokument-${id}.pdf`
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch { alert('Fehler beim Herunterladen!') }
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
                      <div style={{display:'flex', gap:4}}>
                        <button title="→ Rechnung konvertieren" onClick={() => zuRechnungKonvertieren(a)}
                          style={{height:32,padding:'0 10px',borderRadius:8,border:'1px solid #c8a96e',background:'#fdf8f0',cursor:'pointer',display:'flex',alignItems:'center',gap:5,color:'#b8922a',fontSize:11,fontWeight:600}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Rechnung
                        </button>
                        <button title="PDF öffnen / drucken" onClick={() => pdfOeffnen(a.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #d1f5e0',background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2d6a4f'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        </button>
                        <button title="PDF speichern" onClick={() => pdfHerunterladen(a.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #d1f5e0',background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2d6a4f'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        <button title="Bearbeiten" onClick={() => angebotBearbeiten(a)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #e5e0d8',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#555'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button title="Löschen" onClick={() => angebotLoeschen(a.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #fde8e6',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#c0392b'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
              <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, flex:1}}>
                {bearbeitenId ? '✏️ Angebot bearbeiten' : '📄 Neues Angebot'}
              </div>
              <button onClick={() => { setFormOffen(false); formLeeren() }}
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
                <div style={{gridColumn:'1 / -1'}}>
                  <label style={labelStyle}>Zahlungsbedingungen im PDF</label>
                  <select style={{...inputStyle, background:'white'}}
                    value={zahlungsModus}
                    onChange={e => setZahlungsModus(e.target.value)}>
                    <option value="standard">Standard – Angebot gültig bis [Datum]</option>
                    <option value="7tage">7 Tage nach Rechnungserhalt</option>
                    <option value="14tage">14 Tage nach Rechnungserhalt</option>
                    <option value="eigen">Eigener Text...</option>
                    <option value="ausblenden">Ausblenden (kein Hinweis im PDF)</option>
                  </select>
                  {zahlungsModus === 'eigen' && (
                    <textarea
                      style={{...inputStyle, marginTop:6, resize:'vertical', height:60}}
                      placeholder="z.B. Dieses Angebot ist 30 Tage gültig."
                      value={zahlungsEigenText}
                      onChange={e => setZahlungsEigenText(e.target.value)}
                    />
                  )}
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
                <div style={{display:'grid', gridTemplateColumns:'22px 1fr 80px 100px 100px 32px', gap:8, marginBottom:4}}>
                  {['', 'Beschreibung', 'Menge', 'Einheit', '€ Preis', ''].map((h, i) => (
                    <div key={i} style={{fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'#aaa', fontWeight:700}}>{h}</div>
                  ))}
                </div>
                {positionen.map((pos, idx) => (
                  <div key={idx} style={{display:'grid', gridTemplateColumns:'22px 1fr 80px 100px 100px 32px', gap:8, marginBottom:8, alignItems:'center'}}>
                    {/* ↑↓ Buttons */}
                    <div style={{display:'flex', flexDirection:'column', gap:2}}>
                      <button
                        onClick={() => positionVerschieben(idx, 'hoch')}
                        disabled={idx === 0}
                        title="Nach oben"
                        style={{background: idx === 0 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▲</button>
                      <button
                        onClick={() => positionVerschieben(idx, 'runter')}
                        disabled={idx === positionen.length - 1}
                        title="Nach unten"
                        style={{background: idx === positionen.length - 1 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === positionen.length - 1 ? 'default' : 'pointer', color: idx === positionen.length - 1 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▼</button>
                    </div>
                    <div style={{position:'relative'}}>
                      <textarea style={{...inputStyle, resize:'none', overflow:'hidden', lineHeight:'20px', minHeight:38, display:'block'}}
                        placeholder="Beschreibung..."
                        rows={1}
                        value={pos.beschreibung}
                        onChange={e => {
                          positionAendern(idx, 'beschreibung', e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                          const q = e.target.value.toLowerCase()
                          if (q.length >= 1) {
                            const matches = vorlagen.filter(v => v.name.toLowerCase().includes(q) || (v.beschreibung||'').toLowerCase().includes(q))
                            setAutocomplete(matches.length > 0 ? {idx, items: matches.slice(0,6)} : null)
                          } else { setAutocomplete(null) }
                        }}
                        onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                        onBlur={() => setTimeout(() => setAutocomplete(null), 200)} />
                      {autocomplete && autocomplete.idx === idx && (
                        <div style={{position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e5e0d8', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:300, overflow:'hidden', marginTop:2}}>
                          {autocomplete.items.map((v, i) => (
                            <div key={i} onMouseDown={() => vorlageEinfuegen(idx, v)}
                              style={{padding:'7px 12px', cursor:'pointer', borderBottom: i < autocomplete.items.length-1 ? '1px solid #f0ede8' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}
                              onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <div>
                                <div style={{fontSize:12, fontWeight:600, color:'#1a1a1a'}}>{v.name}</div>
                                {v.beschreibung && <div style={{fontSize:11, color:'#888', marginTop:1}}>{v.beschreibung}</div>}
                              </div>
                              <div style={{fontSize:11, color:'#c8a96e', fontWeight:600, whiteSpace:'nowrap'}}>
                                {parseFloat(v.einzelpreis) > 0 ? `€ ${parseFloat(v.einzelpreis).toFixed(2)}` : ''} {v.einheit}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input style={{...inputStyle, textAlign:'right'}} type="text" inputMode="decimal"
                      key={`${formKey}-${idx}-menge`}
                      defaultValue={pos.menge || ''}
                      onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10) }}
                      onBlur={e => positionAendern(idx, 'menge', parseFloat(e.target.value.replace(',', '.')) || 0)} />
                    <select style={{...inputStyle, background:'white'}}
                      value={pos.einheit}
                      onChange={e => positionAendern(idx, 'einheit', e.target.value)}>
                      {['PA', 'M2', 'M3', 'LFM', 'STD', 'OBJ'].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <input style={{...inputStyle, textAlign:'right'}} type="text" inputMode="decimal"
                      key={`${formKey}-${idx}-preis`}
                      defaultValue={pos.einzelpreis || ''}
                      onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10) }}
                      onBlur={e => positionAendern(idx, 'einzelpreis', parseFloat(e.target.value.replace(',', '.')) || 0)} />
                    <button onClick={() => positionLoeschen(idx)}
                      style={{background:'#fde8e6', border:'none', borderRadius:6, width:32, height:36, cursor:'pointer', color:'#c0392b', fontSize:14}}>✕</button>
                  </div>
                ))}
                <div style={{display:'flex', gap:8, marginTop:4}}>
                  <div style={{position:'relative'}}>
                    <button onClick={() => setVorlagenPickerOffen(!vorlagenPickerOffen)}
                      style={{padding:'9px 14px', border:'1px solid #c8a96e', borderRadius:8, background:'#fdf8f0', color:'#b8922a', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                      Vorlage
                    </button>
                    {vorlagenPickerOffen && (
                      <>
                        <div style={{position:'fixed', inset:0, zIndex:199}} onClick={() => setVorlagenPickerOffen(false)} />
                        <div style={{position:'absolute', bottom:'100%', left:0, background:'white', border:'1px solid #e5e0d8', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', zIndex:200, minWidth:280, maxHeight:220, overflowY:'auto', marginBottom:4}}>
                          {vorlagen.length === 0
                            ? <div style={{padding:'12px 16px', fontSize:12, color:'#888', textAlign:'center'}}>Noch keine Vorlagen gespeichert.</div>
                            : vorlagen.map((v, i) => (
                                <div key={i} onClick={() => vorlageAlsPositionHinzufuegen(v)}
                                  style={{padding:'8px 14px', cursor:'pointer', borderBottom: i < vorlagen.length-1 ? '1px solid #f0ede8' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <div>
                                    <div style={{fontSize:12, fontWeight:600, color:'#1a1a1a'}}>{v.name}</div>
                                    {v.beschreibung && <div style={{fontSize:11, color:'#888', marginTop:1}}>{v.beschreibung}</div>}
                                  </div>
                                  <div style={{fontSize:11, color:'#c8a96e', fontWeight:600, whiteSpace:'nowrap'}}>
                                    {parseFloat(v.einzelpreis) > 0 ? `€ ${parseFloat(v.einzelpreis).toFixed(2)}` : ''} {v.einheit}
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={positionHinzufuegen}
                    style={{flex:1, padding:'9px', border:'2px dashed #e5e0d8', borderRadius:8, background:'transparent', color:'#888', fontFamily:'DM Sans, sans-serif', fontSize:13, cursor:'pointer'}}>
                    + Position hinzufügen
                  </button>
                </div>
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
                  {laden ? '⏳ Wird gespeichert...' : bearbeitenId ? '✅ Änderungen speichern' : '✅ Angebot speichern'}
                </button>
                <button
                  style={{padding:13, background:'#f0ede8', color:'#888', border:'none', borderRadius:9, cursor:'pointer'}}
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
  display:'block', fontSize:11, textTransform:'uppercase',
  letterSpacing:0.8, color:'#888', fontWeight:600, marginBottom:5
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'9px 12px', border:'1px solid #e5e0d8',
  borderRadius:7, fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none',
  boxSizing: 'border-box'
}
