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

const STATUS_OPTIONEN = [
  { wert: 'Entwurf',   label: '📝 Entwurf',    bg: '#f0f0f0', text: '#666' },
  { wert: 'Gesendet',  label: '📬 Gesendet',   bg: '#dbeafe', text: '#1e40af' },
  { wert: 'Bezahlt',   label: '✅ Bezahlt',    bg: '#d1f5e0', text: '#2d6a4f' },
  { wert: 'Mahnung 1', label: '⚠️ Mahnung 1',  bg: '#fef3c7', text: '#92400e' },
  { wert: 'Mahnung 2', label: '🔴 Mahnung 2',  bg: '#fde8e6', text: '#c0392b' },
  { wert: 'Inkasso',   label: '⛔ Inkasso',    bg: '#1a1a1a', text: 'white' },
  { wert: 'Storniert', label: '❌ Storniert',  bg: '#e5e5e5', text: '#999' },
]

function statusFarbe(status: string, ueberfaellig?: boolean) {
  if (ueberfaellig && status === 'Gesendet') return { bg: '#fde8e6', text: '#c0392b' }
  return STATUS_OPTIONEN.find(s => s.wert === status) || { bg: '#f0f0f0', text: '#666' }
}

export default function Rechnungen() {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [rechnungen, setRechnungen] = useState<any[]>([])
  const [angebote, setAngebote] = useState<any[]>([])
  const [formOffen, setFormOffen] = useState(false)
  const [angebotWaehlenOffen, setAngebotWaehlenOffen] = useState(false)
  const [laden, setLaden] = useState(false)
  const [selectedKunde, setSelectedKunde] = useState<number | null>(null)
  const [projektName, setProjektName] = useState('')
  const [projektAdresse, setProjektAdresse] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [faelligBis, setFaelligBis] = useState('')
  const [istKleinunternehmer, setIstKleinunternehmer] = useState(true)
  const [positionen, setPositionen] = useState<Position[]>([
    { typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }
  ])
  // Rabatt & Skonto
  const [rabattProzent, setRabattProzent] = useState(0)
  const [skontoAktiv, setSkontoAktiv] = useState(false)
  const [skontoProzent, setSkontoProzent] = useState(2)
  const [skontoTage, setSkontoTage] = useState(7)

  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [bezahltModal, setBezahltModal] = useState<any>(null)
  const [bezahltDatum, setBezahltDatum] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    api.get('/kunden').then(r => setKunden(r.data))
    rechnungenLaden()
  }, [])

  const rechnungenLaden = async () => {
    const r = await api.get('/rechnungen')
    setRechnungen(r.data.filter((x: any) => x.typ === 'Rechnung'))
    setAngebote(r.data.filter((x: any) => x.typ === 'Angebot'))
  }

  const formLeeren = () => {
    setSelectedKunde(null)
    setProjektName('')
    setProjektAdresse('')
    setFaelligBis('')
    setDatum(new Date().toISOString().split('T')[0])
    setPositionen([{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
    setRabattProzent(0)
    setSkontoAktiv(false)
    setSkontoProzent(2)
    setSkontoTage(7)
    setBearbeitenId(null)
  }

  const rechnungBearbeiten = async (r: any) => {
    try {
      const posRes = await api.get(`/rechnungen/${r.id}/positionen`)
      setBearbeitenId(r.id)
      setSelectedKunde(r.kundeId)
      setProjektName(r.projektName || '')
      setProjektAdresse(r.projektAdresse || '')
      setDatum(r.datum?.split('T')[0] || new Date().toISOString().split('T')[0])
      setFaelligBis(r.faelligBis?.split('T')[0] || '')
      setIstKleinunternehmer(r.istKleinunternehmer)
      setRabattProzent(r.rabattProzent || 0)
      setSkontoAktiv(r.skontoProzent > 0)
      setSkontoProzent(r.skontoProzent || 2)
      setSkontoTage(r.skontoTage || 7)
      setPositionen(posRes.data.length > 0 ? posRes.data : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
      setFormOffen(true)
    } catch (e) {
      alert('Fehler beim Laden der Rechnung!')
    }
  }

  const rechnungDuplizieren = async (rechnung: any) => {
    if (!window.confirm(`Rechnung ${rechnung.nummer} duplizieren?`)) return
    try {
      const posRes = await api.get(`/rechnungen/${rechnung.id}/positionen`)
      setSelectedKunde(rechnung.kundeId)
      setProjektName(rechnung.projektName || '')
      setProjektAdresse(rechnung.projektAdresse || '')
      setIstKleinunternehmer(rechnung.istKleinunternehmer)
      setDatum(new Date().toISOString().split('T')[0])
      setFaelligBis('')
      setRabattProzent(rechnung.rabattProzent || 0)
      setSkontoAktiv(rechnung.skontoProzent > 0)
      setSkontoProzent(rechnung.skontoProzent || 2)
      setSkontoTage(rechnung.skontoTage || 7)
      setPositionen(posRes.data.length > 0 ? posRes.data : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
      setFormOffen(true)
    } catch (e) {
      alert('Fehler beim Duplizieren!')
    }
  }

  const angebotUebernehmen = async (angebot: any) => {
    try {
      const posRes = await api.get(`/rechnungen/${angebot.id}/positionen`)
      setSelectedKunde(angebot.kundeId)
      setProjektName(angebot.projektName || '')
      setProjektAdresse(angebot.projektAdresse || '')
      setIstKleinunternehmer(angebot.istKleinunternehmer)
      setDatum(new Date().toISOString().split('T')[0])
      setFaelligBis('')
      setPositionen(posRes.data.length > 0 ? posRes.data : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
      setAngebotWaehlenOffen(false)
    } catch (e) {
      alert('Fehler beim Laden der Positionen!')
    }
  }

  const rechnungLoeschen = async (id: number) => {
    if (!window.confirm('Rechnung wirklich löschen?')) return
    try {
      await api.delete(`/rechnungen/${id}`)
      rechnungenLaden()
    } catch (e: any) {
      alert('Fehler: ' + e.message)
    }
  }

  const statusAendern = async (id: number, status: string) => {
    if (status === 'Bezahlt') {
      const r = rechnungen.find(r => r.id === id)
      setBezahltModal(r)
      return
    }
    try {
      await api.put(`/rechnungen/${id}/status`, { status })
      rechnungenLaden()
    } catch (e) {
      alert('Fehler beim Status ändern!')
    }
  }

  const alsBezahltSpeichern = async () => {
    try {
      await api.put(`/rechnungen/${bezahltModal.id}/bezahlt`, { datum: bezahltDatum })
      setBezahltModal(null)
      rechnungenLaden()
    } catch (e) {
      alert('Fehler!')
    }
  }

  const pdfOeffnen = (id: number) => {
    const token = localStorage.getItem('token')
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
    window.open(`${baseUrl}/api/pdf/${id}?token=${token}`, '_blank')
  }

  // BERECHNUNGEN mit Rabatt & Skonto
  const zwischensumme = positionen
    .filter(p => p.typ === 'Normal')
    .reduce((sum, p) => sum + (p.menge * p.einzelpreis), 0)
  const rabattBetrag = rabattProzent > 0 ? zwischensumme * (rabattProzent / 100) : 0
  const nachRabatt = zwischensumme - rabattBetrag
  const mwst = istKleinunternehmer ? 0 : nachRabatt * 0.20
  const gesamt = nachRabatt + mwst
  const skontoBetrag = skontoAktiv ? gesamt * (skontoProzent / 100) : 0
  const gesamtNachSkonto = gesamt - skontoBetrag

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
      const daten = {
        typ: 'Rechnung',
        kundeId: selectedKunde,
        projektName,
        projektAdresse,
        datum,
        faelligBis: faelligBis || null,
        gueltigBis: null,
        istKleinunternehmer,
        status: 'Entwurf',
        rabattProzent: rabattProzent || 0,
        skontoProzent: skontoAktiv ? skontoProzent : 0,
        skontoTage: skontoAktiv ? skontoTage : 0,
        positionen
      }
      if (bearbeitenId) {
        await api.put(`/rechnungen/${bearbeitenId}`, daten)
      } else {
        await api.post('/rechnungen', daten)
      }
      setFormOffen(false)
      formLeeren()
      rechnungenLaden()
    } catch (fehler: any) {
      alert('Fehler: ' + (fehler.response?.data?.fehler || fehler.message))
    }
    setLaden(false)
  }

  const heute = new Date()

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>

      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <div style={{flex:1, fontFamily:'Syne, sans-serif', fontSize:13, color:'#888'}}>Alle Rechnungen</div>
        <button
          style={{background:'#1a1a1a', color:'white', border:'none', borderRadius:8, padding:'9px 18px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
          onClick={() => { formLeeren(); setFormOffen(true) }}>
          + Neue Rechnung
        </button>
      </div>

      <div style={{background:'white', borderRadius:10, border:'1px solid #e5e0d8', flex:1, overflow:'auto'}}>
        {rechnungen.length === 0 ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>
            <div style={{textAlign:'center', color:'#888'}}>
              <div style={{fontSize:48, marginBottom:16}}>📋</div>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, marginBottom:8, color:'#1a1a1a'}}>Noch keine Rechnungen</div>
              <button
                style={{background:'#c8a96e', color:'#0a0a0a', border:'none', borderRadius:8, padding:'10px 24px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
                onClick={() => setFormOffen(true)}>
                + Erste Rechnung erstellen
              </button>
            </div>
          </div>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#faf8f5'}}>
                {['Nummer', 'Kunde', 'Projekt', 'Datum', 'Fällig', 'Betrag', 'Status', 'Aktionen'].map(h => (
                  <th key={h} style={{padding:'9px 14px', textAlign:'left', fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'#888', fontWeight:700, borderBottom:'1px solid #e5e0d8'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rechnungen.map((r: any) => {
                const ueberfaellig = r.faelligBis && new Date(r.faelligBis) < heute && r.status !== 'Bezahlt' && r.status !== 'Storniert'
                const farbe = statusFarbe(r.status, ueberfaellig)
                return (
                  <tr key={r.id}
                    style={{borderBottom:'1px solid #f0ede8', background: ueberfaellig ? '#fff8f8' : 'transparent'}}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = ueberfaellig ? '#fff8f8' : 'transparent')}>
                    <td style={{padding:'10px 14px', fontFamily:'Syne, sans-serif', fontSize:11, fontWeight:700, color:'#888'}}>{r.nummer}</td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#1a1a1a'}}>
                      {kunden.find(k => k.id === r.kundeId)?.vorname} {kunden.find(k => k.id === r.kundeId)?.nachname}
                    </td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>{r.projektName || '—'}</td>
                    <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>{new Date(r.datum).toLocaleDateString('de-AT')}</td>
                    <td style={{padding:'10px 14px', fontSize:12, fontWeight: ueberfaellig ? 700 : 400, color: ueberfaellig ? '#c0392b' : '#888'}}>
                      {r.faelligBis ? new Date(r.faelligBis).toLocaleDateString('de-AT') : '—'}
                      {ueberfaellig && <span style={{marginLeft:4}}>⚠️</span>}
                    </td>
                    <td style={{padding:'10px 14px', fontSize:12, fontWeight:600, color:'#1a1a1a'}}>
                      € {r.gesamt ? parseFloat(r.gesamt).toFixed(2) : '—'}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <select
                        style={{fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:4, border:'none', background: farbe.bg, color: farbe.text, cursor:'pointer'}}
                        value={r.status}
                        onChange={e => statusAendern(r.id, e.target.value)}>
                        {STATUS_OPTIONEN.map(s => (
                          <option key={s.wert} value={s.wert}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex', gap:6}}>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #e5e0d8', background:'white', fontSize:11, cursor:'pointer'}}
                          onClick={() => rechnungBearbeiten(r)}>✏️</button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #dbeafe', background:'#f0f7ff', color:'#1e40af', fontSize:11, cursor:'pointer'}}
                          onClick={() => rechnungDuplizieren(r)}
                          title="Duplizieren">📋</button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #d1f5e0', background:'#f0fdf4', color:'#2d6a4f', fontSize:11, cursor:'pointer'}}
                          onClick={() => pdfOeffnen(r.id)}>📄 PDF</button>
                        <button
                          style={{padding:'4px 10px', borderRadius:6, border:'1px solid #fde8e6', background:'white', color:'#c0392b', fontSize:11, cursor:'pointer'}}
                          onClick={() => rechnungLoeschen(r.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* BEZAHLT MODAL */}
      {bezahltModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300}}>
          <div style={{background:'white', borderRadius:14, width:380, padding:28, boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, marginBottom:6}}>✅ Als bezahlt markieren</div>
            <div style={{fontSize:13, color:'#888', marginBottom:20}}>Rechnung {bezahltModal.nummer}</div>
            <label style={labelStyle}>Zahlungsdatum</label>
            <input style={{...inputStyle, marginBottom:20}} type="date"
              value={bezahltDatum} onChange={e => setBezahltDatum(e.target.value)} />
            <div style={{display:'flex', gap:10}}>
              <button
                style={{flex:1, padding:12, background:'#2d6a4f', color:'white', border:'none', borderRadius:8, fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
                onClick={alsBezahltSpeichern}>✅ Bestätigen</button>
              <button
                style={{padding:12, background:'#f0ede8', color:'#888', border:'none', borderRadius:8, cursor:'pointer'}}
                onClick={() => setBezahltModal(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAR MODAL */}
      {formOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:100, overflowY:'auto', padding:'20px 0'}}>
          <div style={{background:'white', borderRadius:14, width:680, margin:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{padding:'20px 24px', borderBottom:'1px solid #e5e0d8', display:'flex', alignItems:'center', gap:12}}>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, flex:1}}>{bearbeitenId ? '✏️ Rechnung bearbeiten' : '📋 Neue Rechnung'}</div>
              <button
                style={{padding:'6px 14px', borderRadius:7, border:'1px solid #c8a96e', background:'#fdf8f0', color:'#c8a96e', fontFamily:'DM Sans, sans-serif', fontSize:12, fontWeight:600, cursor:'pointer'}}
                onClick={() => setAngebotWaehlenOffen(true)}>
                📄 Aus Angebot übernehmen
              </button>
              <button onClick={() => setFormOffen(false)}
                style={{background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:'#888'}}>✕</button>
            </div>

            <div style={{padding:24}}>

              {/* KUNDE */}
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

              {/* PROJEKT + DATUM */}
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
                  <label style={labelStyle}>Fällig bis</label>
                  <input style={inputStyle} type="date"
                    value={faelligBis} onChange={e => setFaelligBis(e.target.value)} />
                </div>
              </div>

              {/* KLEINUNTERNEHMER */}
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'10px 14px', background:'#f5f3ef', borderRadius:8}}>
                <input type="checkbox" checked={istKleinunternehmer}
                  onChange={e => setIstKleinunternehmer(e.target.checked)}
                  style={{width:16, height:16, cursor:'pointer'}} />
                <div>
                  <div style={{fontSize:13, fontWeight:500}}>§6 Kleinunternehmer</div>
                  <div style={{fontSize:11, color:'#888'}}>Keine MwSt. — Pflichttext wird automatisch hinzugefügt</div>
                </div>
              </div>

              {/* POSITIONEN */}
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

              {/* RABATT */}
              <div style={{background:'#fdf8f0', border:'1px solid #e8d9b8', borderRadius:10, padding:16, marginBottom:12}}>
                <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:12, color:'#92400e'}}>
                  🏷️ Rabatt
                </div>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{flex:1}}>
                    <label style={labelStyle}>Rabatt in %</label>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input
                        style={{...inputStyle, textAlign:'right', width:100}}
                        type="number" min={0} max={100} step={0.5}
                        value={rabattProzent}
                        onChange={e => setRabattProzent(parseFloat(e.target.value) || 0)}
                      />
                      <span style={{fontSize:13, color:'#888'}}>%</span>
                    </div>
                  </div>
                  {rabattProzent > 0 && (
                    <div style={{textAlign:'right', padding:'8px 12px', background:'white', borderRadius:8, border:'1px solid #e8d9b8'}}>
                      <div style={{fontSize:10, color:'#aaa', textTransform:'uppercase', letterSpacing:0.5}}>Ersparnis</div>
                      <div style={{fontSize:16, fontWeight:800, color:'#c0392b'}}>− € {rabattBetrag.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* SKONTO */}
              <div style={{background:'#f0f7ff', border:'1px solid #bdd8f5', borderRadius:10, padding:16, marginBottom:20}}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom: skontoAktiv ? 14 : 0}}>
                  <input type="checkbox" checked={skontoAktiv}
                    onChange={e => setSkontoAktiv(e.target.checked)}
                    style={{width:16, height:16, cursor:'pointer'}} />
                  <div>
                    <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, color:'#1e40af'}}>
                      ⚡ Skonto anbieten
                    </div>
                    <div style={{fontSize:11, color:'#888'}}>Nachlass bei früher Zahlung</div>
                  </div>
                </div>

                {skontoAktiv && (
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                    <div>
                      <label style={labelStyle}>Skonto %</label>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input
                          style={{...inputStyle, textAlign:'right'}}
                          type="number" min={0.5} max={10} step={0.5}
                          value={skontoProzent}
                          onChange={e => setSkontoProzent(parseFloat(e.target.value) || 2)}
                        />
                        <span style={{fontSize:13, color:'#888', whiteSpace:'nowrap'}}>% Nachlass</span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Innerhalb von</label>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input
                          style={{...inputStyle, textAlign:'right'}}
                          type="number" min={1} max={30} step={1}
                          value={skontoTage}
                          onChange={e => setSkontoTage(parseInt(e.target.value) || 7)}
                        />
                        <span style={{fontSize:13, color:'#888', whiteSpace:'nowrap'}}>Tagen</span>
                      </div>
                    </div>
                    {/* Skonto Vorschau */}
                    <div style={{gridColumn:'1 / -1', background:'white', borderRadius:8, padding:'10px 14px', border:'1px solid #bdd8f5', fontSize:12, color:'#1e40af'}}>
                      💡 Bei Zahlung innerhalb von <strong>{skontoTage} Tagen</strong> erhalten Sie <strong>{skontoProzent}% Skonto</strong> = <strong>€ {skontoBetrag.toFixed(2)}</strong> Nachlass → Zahlung nur <strong>€ {gesamtNachSkonto.toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SUMMEN */}
              <div style={{background:'#f5f3ef', borderRadius:10, padding:16, marginBottom:20}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#888'}}>
                  <span>Zwischensumme</span><span>€ {zwischensumme.toFixed(2)}</span>
                </div>
                {rabattProzent > 0 && (
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#c0392b'}}>
                    <span>Rabatt ({rabattProzent}%)</span><span>− € {rabattBetrag.toFixed(2)}</span>
                  </div>
                )}
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
                {skontoAktiv && (
                  <div style={{marginTop:8, padding:'8px 10px', background:'#dbeafe', borderRadius:6, fontSize:12, color:'#1e40af', fontWeight:500}}>
                    ⚡ Bei Zahlung binnen {skontoTage} Tagen: <strong>€ {gesamtNachSkonto.toFixed(2)}</strong> ({skontoProzent}% Skonto)
                  </div>
                )}
              </div>

              <div style={{display:'flex', gap:10}}>
                <button
                  style={{flex:1, padding:13, background:'#1a1a1a', color:'white', border:'none', borderRadius:9, fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer'}}
                  onClick={speichern} disabled={laden}>
                  {laden ? '⏳ Wird gespeichert...' : '✅ Rechnung speichern'}
                </button>
                <button
                  style={{padding:13, background:'#f0ede8', color:'#888', border:'none', borderRadius:9, cursor:'pointer'}}
                  onClick={() => setFormOffen(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANGEBOT WÄHLEN MODAL */}
      {angebotWaehlenOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200}}>
          <div style={{background:'white', borderRadius:14, width:560, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{padding:'20px 24px', borderBottom:'1px solid #e5e0d8', display:'flex', alignItems:'center'}}>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:800, flex:1}}>📄 Angebot auswählen</div>
              <button onClick={() => setAngebotWaehlenOffen(false)}
                style={{background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:'#888'}}>✕</button>
            </div>
            <div style={{overflowY:'auto', flex:1}}>
              {angebote.length === 0 ? (
                <div style={{padding:40, textAlign:'center', color:'#888'}}>
                  <div style={{fontSize:32, marginBottom:12}}>📄</div>
                  <div>Noch keine Angebote vorhanden</div>
                </div>
              ) : (
                angebote.map((a: any) => (
                  <div key={a.id}
                    style={{padding:'14px 20px', borderBottom:'1px solid #f0ede8', cursor:'pointer', display:'flex', alignItems:'center', gap:12}}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => angebotUebernehmen(a)}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, color:'#1a1a1a'}}>{a.nummer}</div>
                      <div style={{fontSize:11, color:'#888', marginTop:2}}>
                        {kunden.find(k => k.id === a.kundeId)?.vorname} {kunden.find(k => k.id === a.kundeId)?.nachname}
                        {a.projektName ? ` — ${a.projektName}` : ''}
                      </div>
                    </div>
                    <div style={{fontSize:11, color:'#c8a96e', fontWeight:600}}>Übernehmen →</div>
                  </div>
                ))
              )}
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