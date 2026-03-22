import React, { useState, useEffect, useRef } from 'react'
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

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

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
  // Rabatt & Sonderangebot
  const [rabattProzent, setRabattProzent] = useState(0)
  const [rabattBeschreibung, setRabattBeschreibung] = useState('Rabatt')
  const [sonderangebot, setSonderangebot] = useState(false)

  const [zahlungsModus, setZahlungsModus] = useState('standard')
  const [zahlungsEigenText, setZahlungsEigenText] = useState('')
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [autocomplete, setAutocomplete] = useState<{idx: number; items: any[]} | null>(null)
  const [vorlagenPickerOffen, setVorlagenPickerOffen] = useState(false)
  const [kiTextLaden, setKiTextLaden] = useState(false)
  const [kiVorschlag, setKiVorschlag]       = useState<Record<number, string>>({})
  const [kiVerbLaden, setKiVerbLaden]       = useState<Record<number, boolean>>({})
  const [kiVorlageLaden, setKiVorlageLaden] = useState<Record<number, boolean>>({})
  const [kiHinweis, setKiHinweis]           = useState<Record<number, string>>({})
  const [abschlusstext, setAbschlusstext] = useState('')
  const [abschlusstextVorlagen, setAbschlusstextVorlagen] = useState<any[]>([])
  const [atPickerOffen, setAtPickerOffen] = useState(false)
  const [kiAbschlussVorschlag, setKiAbschlussVorschlag] = useState('')
  const [kiAbschlussHinweis,   setKiAbschlussHinweis]   = useState('')
  const [kiAbschlussVerbLaden, setKiAbschlussVerbLaden] = useState(false)
  const [kiAbschlussVorlageLaden, setKiAbschlussVorlageLaden] = useState(false)
  const [vorlagenNameOffen, setVorlagenNameOffen] = useState(false)
  const [vorlagenNameText, setVorlagenNameText]   = useState('')

  useEffect(() => {
    if (formOffen) {
      api.get('/vorlagen').then(r => setVorlagen(r.data)).catch(() => {})
      api.get('/abschlusstexte').then(r => setAbschlusstextVorlagen(r.data)).catch(() => {})
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
    setRabattProzent(0)
    setRabattBeschreibung('Rabatt')
    setSonderangebot(false)
    setZahlungsModus('standard')
    setZahlungsEigenText('')
    setAbschlusstext('')
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
  const rabattBetrag = rabattProzent > 0 ? zwischensumme * (rabattProzent / 100) : 0
  const nachRabatt = zwischensumme - rabattBetrag
  const mwst = istKleinunternehmer ? 0 : nachRabatt * 0.20
  const gesamt = nachRabatt + mwst

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

  const kiTextGenerieren = async () => {
    setKiTextLaden(true)
    try {
      const res = await api.post('/einstellungen/ki-text', {
        projektName,
        firmaName: '',
        anzahl: 3
      })
      if (res.data.positionen?.length > 0) {
        const nichtLeer = positionen.filter((p: Position) => p.beschreibung.trim())
        setPositionen([...nichtLeer, ...res.data.positionen.map((p: any) => ({
          typ: 'Normal', beschreibung: p.beschreibung,
          menge: p.menge || 1, einheit: p.einheit || 'PA', einzelpreis: p.einzelpreis || 0
        }))])
        setFormKey(k => k + 1)
      }
    } catch { alert('KI-Positionen konnten nicht generiert werden') }
    setKiTextLaden(false)
  }

  const kiTextVerbessern = async (idx: number) => {
    const text = stripHtml(positionen[idx].beschreibung)
    if (!text) return
    setKiVerbLaden(p => ({ ...p, [idx]: true }))
    try {
      const hinweis = kiHinweis[idx]?.trim() || ''
      const res = await api.post('/einstellungen/ki-verbessern', { text, hinweis })
      setKiVorschlag(p => ({ ...p, [idx]: res.data.text }))
      setKiHinweis(p => { const n = { ...p }; delete n[idx]; return n })
    } catch { alert('KI-Verbesserung fehlgeschlagen') }
    setKiVerbLaden(p => ({ ...p, [idx]: false }))
  }

  const kiVorschlagUebernehmen = (idx: number) => {
    const text = kiVorschlag[idx]
    if (!text) return
    positionAendern(idx, 'beschreibung', text)
    setKiVorschlag(p => { const n = { ...p }; delete n[idx]; return n })
    setFormKey(k => k + 1) // RichEditor auf plain text zurücksetzen
  }

  const kiVorschlagAlsVorlage = async (idx: number) => {
    const text = kiVorschlag[idx] || positionen[idx].beschreibung
    if (!text.trim()) return
    setKiVorlageLaden(p => ({ ...p, [idx]: true }))
    try {
      await api.post('/vorlagen', {
        name: text.substring(0, 60),
        beschreibung: text,
        menge: positionen[idx].menge || 1,
        einheit: positionen[idx].einheit || 'PA',
        einzelpreis: positionen[idx].einzelpreis || 0,
      })
      // Vorlagenliste aktualisieren
      const res = await api.get('/vorlagen')
      setVorlagen(res.data)
      alert('✅ Als Vorlage gespeichert!')
    } catch { alert('Vorlage konnte nicht gespeichert werden') }
    setKiVorlageLaden(p => ({ ...p, [idx]: false }))
  }

  const kiAbschlusstextVerbessern = async () => {
    const text = abschlusstext.trim()
    if (!text) return
    setKiAbschlussVerbLaden(true)
    try {
      const res = await api.post('/einstellungen/ki-verbessern', { text, hinweis: kiAbschlussHinweis.trim() })
      setKiAbschlussVorschlag(res.data.text)
      setKiAbschlussHinweis('')
    } catch { alert('KI-Verbesserung fehlgeschlagen') }
    setKiAbschlussVerbLaden(false)
  }

  const abschlusstextAlsVorlage = async (text: string, name: string) => {
    if (!text.trim() || !name.trim()) return
    setKiAbschlussVorlageLaden(true)
    try {
      await api.post('/abschlusstexte', { name: name.trim(), text: text.trim() })
      const res = await api.get('/abschlusstexte')
      setAbschlusstextVorlagen(res.data)
      setVorlagenNameOffen(false)
      setVorlagenNameText('')
      alert('✅ Als Abschlusstext-Vorlage gespeichert!')
    } catch { alert('Fehler beim Speichern der Vorlage') }
    setKiAbschlussVorlageLaden(false)
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
        rabattProzent: rabattProzent || 0,
        rabattBeschreibung: rabattBeschreibung || 'Rabatt',
        sonderangebot,
        zahlungshinweis: zahlungsModus === 'standard' ? '' :
          zahlungsModus === 'ausblenden' ? '__ausblenden__' :
          zahlungsModus === '7tage' ? 'Zahlbar innerhalb von 7 Tagen nach Rechnungserhalt.' :
          zahlungsModus === '14tage' ? 'Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt.' :
          zahlungsModus === 'eigen' ? zahlungsEigenText : '',
        abschlusstext,
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
      setRabattProzent(parseFloat(a.rabattProzent) || 0)
      setRabattBeschreibung(a.rabattBeschreibung || 'Rabatt')
      setSonderangebot(!!a.sonderangebot)
      setAbschlusstext(a.abschlusstext || '')
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
                        <button title="PDF öffnen" onClick={() => pdfOeffnen(a.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #d1f5e0',background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2d6a4f'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
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
                  pos.typ === 'Text' ? (
                    /* ── Textzeile (keine Berechnung) ── */
                    <div key={idx} style={{display:'grid', gridTemplateColumns:'22px 1fr 32px', gap:8, marginBottom:6, alignItems:'center'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:2}}>
                        <button onClick={() => positionVerschieben(idx, 'hoch')} disabled={idx === 0} title="Nach oben"
                          style={{background: idx === 0 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▲</button>
                        <button onClick={() => positionVerschieben(idx, 'runter')} disabled={idx === positionen.length - 1} title="Nach unten"
                          style={{background: idx === positionen.length - 1 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === positionen.length - 1 ? 'default' : 'pointer', color: idx === positionen.length - 1 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▼</button>
                      </div>
                      <textarea
                        style={{...inputStyle, resize:'none', overflow:'hidden', lineHeight:'20px', minHeight:38, display:'block', fontWeight:700, background:'#f5f3ef', borderColor:'#e5e0d8', color:'#3a2e1e'}}
                        placeholder="Zwischentitel / Abschnittsbezeichnung..."
                        rows={1}
                        value={pos.beschreibung}
                        onChange={e => { positionAendern(idx, 'beschreibung', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                        onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} />
                      <button onClick={() => positionLoeschen(idx)}
                        style={{background:'#fde8e6', border:'none', borderRadius:6, width:32, height:36, cursor:'pointer', color:'#c0392b', fontSize:14}}>✕</button>
                    </div>
                  ) : (
                    /* ── Normale / Eventualposition ── */
                    <div key={idx} style={{marginBottom:8, background: pos.typ === 'Eventualposition' ? '#fffbeb' : 'transparent', borderRadius:8, border: pos.typ === 'Eventualposition' ? '1.5px dashed #f59e0b' : 'none', padding: pos.typ === 'Eventualposition' ? '6px 8px 4px' : '0'}}>
                    <div style={{display:'grid', gridTemplateColumns:'22px 1fr 80px 100px 100px 32px', gap:8, alignItems:'center'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:2}}>
                        <button onClick={() => positionVerschieben(idx, 'hoch')} disabled={idx === 0} title="Nach oben"
                          style={{background: idx === 0 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▲</button>
                        <button onClick={() => positionVerschieben(idx, 'runter')} disabled={idx === positionen.length - 1} title="Nach unten"
                          style={{background: idx === positionen.length - 1 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === positionen.length - 1 ? 'default' : 'pointer', color: idx === positionen.length - 1 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▼</button>
                      </div>
                      <div style={{position:'relative'}}>
                        <RichEditor
                          value={pos.beschreibung}
                          formKey={formKey}
                          placeholder="Beschreibung..."
                          onChange={html => {
                            positionAendern(idx, 'beschreibung', html)
                            const q = stripHtml(html).toLowerCase()
                            if (q.length >= 1) {
                              const matches = vorlagen.filter(v => v.name.toLowerCase().includes(q) || (v.beschreibung||'').toLowerCase().includes(q))
                              setAutocomplete(matches.length > 0 ? {idx, items: matches.slice(0,6)} : null)
                            } else { setAutocomplete(null) }
                          }}
                          onBlur={() => setTimeout(() => setAutocomplete(null), 200)}
                          onKiClick={() => kiTextVerbessern(idx)}
                          kiLaden={!!kiVerbLaden[idx]}
                          onVorlageClick={() => kiVorschlagAlsVorlage(idx)}
                          vorlageLaden={!!kiVorlageLaden[idx]}
                        />
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
                    </div>{/* Ende Grid */}

                    {/* ── KI-Vorschlagsbox – volle Breite UNTER der Zeile ── */}
                    {kiVorschlag[idx] && (
                      <div style={{marginTop:6, background:'white', border:'1.5px solid #a78bfa', borderRadius:10, overflow:'hidden', boxShadow:'0 4px 16px rgba(124,58,237,0.12)'}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#7c3aed,#6366f1)', padding:'6px 12px'}}>
                          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:0.8}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 5.4L19 9l-5.2 2.6L12 17l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="rgba(255,255,255,0.95)"/></svg>
                            KI-Vorschlag
                          </div>
                          <button onMouseDown={e => { e.preventDefault(); setKiVorschlag(p => { const n={...p}; delete n[idx]; return n }); setKiHinweis(p => { const n={...p}; delete n[idx]; return n }) }}
                            style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:4, width:20, height:20, cursor:'pointer', color:'white', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
                        </div>
                        <div style={{padding:'10px 12px', fontSize:13, color:'#1a2a3a', lineHeight:1.7, borderBottom:'1px solid #ede9fe', fontWeight:400, whiteSpace:'pre-wrap'}}>
                          {kiVorschlag[idx]}
                        </div>
                        <div style={{display:'flex', gap:6, padding:'8px 10px', background:'#faf9ff', alignItems:'center', flexWrap:'wrap'}}>
                          <input type="text" value={kiHinweis[idx] || ''}
                            onChange={e => setKiHinweis(p => ({ ...p, [idx]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); kiTextVerbessern(idx) } }}
                            placeholder='"kürzer", "formeller", "mit Garantie"...'
                            style={{flex:1, border:'1px solid #e5e0d8', borderRadius:6, padding:'5px 9px', fontSize:11, fontFamily:'DM Sans, sans-serif', outline:'none', background:'white', minWidth:120}} />
                          <button onMouseDown={e => { e.preventDefault(); kiTextVerbessern(idx) }} disabled={!!kiVerbLaden[idx]}
                            style={{background: kiVerbLaden[idx] ? '#e5e0d8' : '#6366f1', color:'white', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>
                            {kiVerbLaden[idx] ? '⏳' : '🔄 Neu'}
                          </button>
                          <button onMouseDown={e => { e.preventDefault(); kiVorschlagAlsVorlage(idx) }} disabled={!!kiVorlageLaden[idx]}
                            style={{background: kiVorlageLaden[idx] ? '#e5e0d8' : '#1a2a3a', color:'white', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>
                            {kiVorlageLaden[idx] ? '⏳' : '📁 Vorlage'}
                          </button>
                          <button onMouseDown={e => { e.preventDefault(); kiVorschlagUebernehmen(idx) }}
                            style={{background:'linear-gradient(135deg,#10b981,#059669)', color:'white', border:'none', borderRadius:6, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 2px 6px rgba(16,185,129,0.35)'}}>
                            ✓ Übernehmen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Eventualposition Checkbox */}
                    <label style={{display:'flex', alignItems:'center', gap:6, marginTop:5, marginLeft:30, cursor:'pointer', userSelect:'none'}}>
                      <input type="checkbox"
                        checked={pos.typ === 'Eventualposition'}
                        onChange={e => positionAendern(idx, 'typ', e.target.checked ? 'Eventualposition' : 'Normal')}
                        style={{width:14, height:14, accentColor:'#f59e0b', cursor:'pointer'}} />
                      <span style={{fontSize:11, fontWeight: pos.typ === 'Eventualposition' ? 700 : 400, color: pos.typ === 'Eventualposition' ? '#b45309' : '#aaa'}}>
                        Eventualposition – Preis sichtbar, nicht in Gesamtsumme
                      </span>
                    </label>
                    </div>
                  )
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
                  <button onClick={() => { setPositionen([...positionen, { typ: 'Text', beschreibung: '', menge: 0, einheit: '', einzelpreis: 0 }]); setFormKey(k => k + 1) }}
                    style={{padding:'9px 14px', border:'2px dashed #c8a96e', borderRadius:8, background:'#fdf8f0', color:'#b8922a', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap'}}>
                    + Textzeile
                  </button>
                  <button onClick={kiTextGenerieren} disabled={kiTextLaden}
                    style={{padding:'9px 14px', border:'2px dashed #6366f1', borderRadius:8, background: kiTextLaden ? '#f0f0ff' : 'white', color:'#6366f1', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:700, cursor: kiTextLaden ? 'not-allowed' : 'pointer', whiteSpace:'nowrap'}}>
                    {kiTextLaden ? '⏳ KI denkt...' : '✨ KI-Positionen'}
                  </button>
                </div>
              </div>

              <div style={{background:'#f5f3ef', borderRadius:10, padding:16, marginBottom:20}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#888'}}>
                  <span>Zwischensumme</span><span>€ {zwischensumme.toFixed(2)}</span>
                </div>
                {rabattProzent > 0 && (
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#c0392b', fontWeight:600}}>
                    <span>{rabattBeschreibung || 'Rabatt'} ({rabattProzent}%)</span>
                    <span>− € {rabattBetrag.toFixed(2)}</span>
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
              </div>

              {/* SONDERANGEBOT & RABATT */}
              <div style={{marginBottom:20}}>
                {/* Sonderangebot Toggle */}
                <label style={{display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, background: sonderangebot ? '#fff1f1' : '#f9f6f1', border: sonderangebot ? '1.5px solid #dc2626' : '1.5px solid #e5e0d8', cursor:'pointer', marginBottom:12, userSelect:'none'}}>
                  <input type="checkbox" checked={sonderangebot} onChange={e => setSonderangebot(e.target.checked)}
                    style={{width:16, height:16, accentColor:'#dc2626', cursor:'pointer'}} />
                  <div>
                    <div style={{fontSize:13, fontWeight:700, color: sonderangebot ? '#dc2626' : '#555'}}>
                      🏷️ Sonderangebot – "SONDERANGEBOT" Badge im PDF anzeigen
                    </div>
                    <div style={{fontSize:11, color:'#aaa', marginTop:1}}>Hebt das Angebot als zeitlich limitiertes Sonderangebot hervor</div>
                  </div>
                </label>

                {/* Rabatt Sektion */}
                <div style={{background:'#fdf8f0', border:'1px solid #e8d9b8', borderRadius:10, padding:16}}>
                  <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:12, color:'#92400e'}}>🏷️ Rabatt</div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                    <div>
                      <label style={labelStyle}>Rabatt in %</label>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input style={{...inputStyle, textAlign:'right'}} type="number" min={0} max={100} step={0.5}
                          value={rabattProzent || ''}
                          placeholder="0"
                          onChange={e => setRabattProzent(parseFloat(e.target.value) || 0)} />
                        <span style={{fontSize:13, color:'#888', flexShrink:0}}>%</span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Bezeichnung (im PDF)</label>
                      <input style={inputStyle} type="text" placeholder="z.B. Treuerabatt, Aktionsrabatt"
                        value={rabattBeschreibung}
                        onChange={e => setRabattBeschreibung(e.target.value)} />
                    </div>
                  </div>
                  {rabattProzent > 0 && (
                    <div style={{marginTop:10, display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'white', borderRadius:8, border:'1px solid #e8d9b8'}}>
                      <span style={{fontSize:12, color:'#888'}}>{rabattBeschreibung || 'Rabatt'} ({rabattProzent}%)</span>
                      <span style={{fontSize:14, fontWeight:800, color:'#c0392b'}}>− € {rabattBetrag.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Schnell-Rabatt Buttons */}
                  <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
                    {[5, 10, 15, 20, 25, 30].map(p => (
                      <button key={p} onClick={() => setRabattProzent(rabattProzent === p ? 0 : p)}
                        style={{padding:'4px 12px', borderRadius:20, border:'none', background: rabattProzent === p ? '#c0392b' : '#f0ede8', color: rabattProzent === p ? 'white' : '#555', fontSize:12, fontWeight:700, cursor:'pointer'}}>
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ABSCHLUSSTEXT */}
              <div style={{marginBottom:20}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700}}>Abschlusstext (optional)</div>
                  <div style={{position:'relative'}}>
                    <button onClick={() => setAtPickerOffen(!atPickerOffen)}
                      style={{padding:'6px 12px', border:'1px solid #c8a96e', borderRadius:7, background:'#fdf8f0', color:'#b8922a', fontFamily:'DM Sans, sans-serif', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Vorlage wählen
                    </button>
                    {atPickerOffen && (
                      <>
                        <div style={{position:'fixed', inset:0, zIndex:199}} onClick={() => setAtPickerOffen(false)} />
                        <div style={{position:'absolute', bottom:'100%', right:0, background:'white', border:'1px solid #e5e0d8', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', zIndex:200, minWidth:300, maxHeight:220, overflowY:'auto', marginBottom:4}}>
                          {abschlusstextVorlagen.length === 0
                            ? <div style={{padding:'12px 16px', fontSize:12, color:'#888', textAlign:'center'}}>Keine Abschlusstexte gespeichert.<br/><span style={{fontSize:11}}>Erstelle welche unter Vorlagen → Abschlusstexte</span></div>
                            : abschlusstextVorlagen.map((t, i) => (
                                <div key={i} onClick={() => { setAbschlusstext(t.text); setAtPickerOffen(false) }}
                                  style={{padding:'10px 14px', cursor:'pointer', borderBottom: i < abschlusstextVorlagen.length-1 ? '1px solid #f0ede8' : 'none'}}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <div style={{fontSize:12, fontWeight:600, color:'#1a1a1a', marginBottom:2}}>{t.name}</div>
                                  <div style={{fontSize:11, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.text}</div>
                                </div>
                              ))
                          }
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <textarea
                  style={{...inputStyle, resize:'vertical', minHeight:90, lineHeight:'1.7', fontFamily:'DM Sans, sans-serif'}}
                  placeholder="Abschlusstext eingeben oder aus Vorlage wählen..."
                  value={abschlusstext}
                  onChange={e => { setAbschlusstext(e.target.value); setKiAbschlussVorschlag('') }} />

                {/* ── KI + Vorlage Buttons ── */}
                {abschlusstext.trim().length >= 5 && !kiAbschlussVorschlag && (
                  <div style={{display:'flex', gap:6, justifyContent:'flex-end', marginTop:4}}>
                    <button
                      onMouseDown={e => { e.preventDefault(); setVorlagenNameText(abschlusstext.substring(0,50)); setVorlagenNameOffen(true) }}
                      disabled={kiAbschlussVorlageLaden}
                      title="Als Abschlusstext-Vorlage speichern"
                      style={{background:'#fef9e7', border:'1px solid #fde68a', borderRadius:5, padding:'2px 10px', fontSize:10, fontWeight:700, color:'#92400e', cursor:'pointer', lineHeight:'18px'}}>
                      {kiAbschlussVorlageLaden ? '⏳' : '📁 Als Vorlage'}
                    </button>
                    <button
                      onMouseDown={e => { e.preventDefault(); kiAbschlusstextVerbessern() }}
                      disabled={kiAbschlussVerbLaden}
                      title="Text bautechnisch verbessern"
                      style={{background: kiAbschlussVerbLaden ? '#f0f0ff' : '#ede9fe', border:'1px solid #c4b5fd', borderRadius:5, padding:'2px 10px', fontSize:10, fontWeight:700, color:'#6366f1', cursor: kiAbschlussVerbLaden ? 'not-allowed' : 'pointer', lineHeight:'18px'}}>
                      {kiAbschlussVerbLaden ? '⏳ KI...' : '✨ KI verbessern'}
                    </button>
                  </div>
                )}

                {/* ── KI-Vorschlagsbox Abschlusstext ── */}
                {kiAbschlussVorschlag && (
                  <div style={{marginTop:5, background:'white', border:'1.5px solid #a78bfa', borderRadius:10, overflow:'hidden', boxShadow:'0 4px 16px rgba(124,58,237,0.12)'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#7c3aed,#6366f1)', padding:'5px 10px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:0.8}}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 5.4L19 9l-5.2 2.6L12 17l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="rgba(255,255,255,0.95)"/></svg>
                        KI-Vorschlag
                      </div>
                      <button onMouseDown={e => { e.preventDefault(); setKiAbschlussVorschlag(''); setKiAbschlussHinweis('') }}
                        style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:4, width:18, height:18, cursor:'pointer', color:'white', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
                    </div>
                    <div style={{padding:'7px 10px', fontSize:12, color:'#1a2a3a', lineHeight:1.65, maxHeight:90, overflowY:'auto', borderBottom:'1px solid #ede9fe', fontWeight:400, whiteSpace:'pre-wrap'}}>
                      {kiAbschlussVorschlag}
                    </div>
                    <div style={{display:'flex', gap:5, padding:'5px 7px', background:'#faf9ff', alignItems:'center'}}>
                      <input type="text" value={kiAbschlussHinweis}
                        onChange={e => setKiAbschlussHinweis(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); kiAbschlusstextVerbessern() } }}
                        placeholder='"kürzer", "formeller", "mit Garantie"...'
                        style={{flex:1, border:'1px solid #e5e0d8', borderRadius:5, padding:'3px 7px', fontSize:10, fontFamily:'DM Sans, sans-serif', outline:'none', background:'white', minWidth:0}} />
                      <button onMouseDown={e => { e.preventDefault(); kiAbschlusstextVerbessern() }} disabled={kiAbschlussVerbLaden}
                        style={{background: kiAbschlussVerbLaden ? '#e5e0d8' : '#6366f1', color:'white', border:'none', borderRadius:5, padding:'3px 8px', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>
                        {kiAbschlussVerbLaden ? '⏳' : '🔄'}
                      </button>
                      <button onMouseDown={e => { e.preventDefault(); setVorlagenNameText(kiAbschlussVorschlag.substring(0,50)); setVorlagenNameOffen(true) }} disabled={kiAbschlussVorlageLaden}
                        style={{background: kiAbschlussVorlageLaden ? '#e5e0d8' : '#1a2a3a', color:'white', border:'none', borderRadius:5, padding:'3px 8px', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>
                        {kiAbschlussVorlageLaden ? '⏳' : '📁'}
                      </button>
                      <button onMouseDown={e => { e.preventDefault(); setAbschlusstext(kiAbschlussVorschlag); setKiAbschlussVorschlag('') }}
                        style={{background:'linear-gradient(135deg,#10b981,#059669)', color:'white', border:'none', borderRadius:5, padding:'3px 10px', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 2px 5px rgba(16,185,129,0.35)'}}>
                        ✓ Übernehmen
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Vorlagen-Name Dialog ── */}
                {vorlagenNameOffen && (
                  <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <div style={{background:'white', borderRadius:12, padding:24, width:360, boxShadow:'0 16px 48px rgba(0,0,0,0.2)'}}>
                      <div style={{fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, marginBottom:14}}>📁 Vorlage benennen</div>
                      <input
                        autoFocus
                        type="text"
                        value={vorlagenNameText}
                        onChange={e => setVorlagenNameText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') abschlusstextAlsVorlage(kiAbschlussVorschlag || abschlusstext, vorlagenNameText) }}
                        placeholder="Name der Vorlage..."
                        style={{...inputStyle, marginBottom:14}}
                      />
                      <div style={{display:'flex', gap:8}}>
                        <button onClick={() => { setVorlagenNameOffen(false); setVorlagenNameText('') }}
                          style={{flex:1, padding:10, border:'1px solid #e5e0d8', borderRadius:7, background:'white', cursor:'pointer', fontSize:13}}>
                          Abbrechen
                        </button>
                        <button onClick={() => abschlusstextAlsVorlage(kiAbschlussVorschlag || abschlusstext, vorlagenNameText)}
                          disabled={!vorlagenNameText.trim() || kiAbschlussVorlageLaden}
                          style={{flex:2, padding:10, border:'none', borderRadius:7, background: !vorlagenNameText.trim() ? '#e5e0d8' : '#1a2a3a', color: !vorlagenNameText.trim() ? '#aaa' : 'white', cursor:'pointer', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700}}>
                          {kiAbschlussVorlageLaden ? '⏳ Speichern...' : '💾 Speichern'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {abschlusstext && !kiAbschlussVorschlag && (
                  <button onClick={() => setAbschlusstext('')}
                    style={{marginTop:4, background:'none', border:'none', color:'#aaa', fontSize:11, cursor:'pointer', padding:'2px 0'}}>
                    ✕ Text entfernen
                  </button>
                )}
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

// ── RichEditor – contentEditable mit Formatierungsleiste ─────────────────────
function RichEditor({ value, onChange, onBlur, placeholder, formKey, onKiClick, kiLaden, onVorlageClick, vorlageLaden }: {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  formKey?: number
  onKiClick?: () => void
  kiLaden?: boolean
  onVorlageClick?: () => void
  vorlageLaden?: boolean
}) {
  const ref      = useRef<HTMLDivElement>(null)
  const internal = useRef(false)
  const lastKey  = useRef<number | undefined>(formKey)
  const [toolbar, setToolbar] = useState(false)
  const hasActions = !!(onKiClick || onVorlageClick)
  const textLen = stripHtml(value).length

  useEffect(() => {
    if (!ref.current) return
    const reset = formKey !== lastKey.current
    lastKey.current = formKey
    if (reset || !internal.current) ref.current.innerHTML = value || ''
    internal.current = false
  }, [value, formKey])

  const fmt = (cmd: string, val?: string) => {
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(cmd, false, val)
    ref.current?.focus()
    internal.current = true
    onChange(ref.current?.innerHTML || '')
  }

  const SIZES = [
    { label: 'S', val: '1', title: 'Klein' },
    { label: 'M', val: '3', title: 'Normal' },
    { label: 'L', val: '5', title: 'Groß' },
  ]

  return (
    <div style={{ border: '1px solid #e5e0d8', borderRadius: 7, overflow: 'hidden', background: 'white', position: 'relative' }}
      onFocus={() => setToolbar(true)}
      onBlur={() => { setToolbar(false); onBlur?.() }}>

      {/* Formatierungs-Toolbar */}
      <div style={{
        display: 'flex', gap: 2, padding: '3px 6px',
        background: '#f8f6f2', borderBottom: toolbar ? '1px solid #e5e0d8' : '1px solid transparent',
        transition: 'border-color 0.15s'
      }}>
        {[
          { label: <b>B</b>, cmd: 'bold',   title: 'Fett (Strg+B)' },
          { label: <i>I</i>, cmd: 'italic', title: 'Kursiv (Strg+I)' },
        ].map((b, i) => (
          <button key={i} onMouseDown={e => { e.preventDefault(); fmt(b.cmd) }} title={b.title}
            style={{ background: 'white', border: '1px solid #e5e0d8', borderRadius: 4, width: 24, height: 22, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
            {b.label}
          </button>
        ))}
        <div style={{ width: 1, background: '#e5e0d8', margin: '2px 2px' }} />
        {SIZES.map(s => (
          <button key={s.val} onMouseDown={e => { e.preventDefault(); fmt('fontSize', s.val) }} title={s.title}
            style={{ background: 'white', border: '1px solid #e5e0d8', borderRadius: 4, width: 24, height: 22, fontSize: s.val === '1' ? 9 : s.val === '3' ? 11 : 13, fontWeight: 600, cursor: 'pointer', color: '#333' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Editierbereich */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => { internal.current = true; onChange(ref.current?.innerHTML || '') }}
        style={{
          minHeight: 42,
          padding: hasActions && textLen >= 5 ? '7px 10px 30px 10px' : '7px 10px',
          fontSize: 13, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400, lineHeight: '20px', outline: 'none', wordBreak: 'break-word',
          transition: 'padding 0.15s',
        }}
      />

      {/* ── Moderne 3D Buttons – unten rechts im Feld ── */}
      {hasActions && textLen >= 5 && (
        <div style={{ position: 'absolute', bottom: 5, right: 6, display: 'flex', gap: 5, zIndex: 10 }}>

          {onVorlageClick && (
            <button
              onMouseDown={e => { e.preventDefault(); onVorlageClick() }}
              disabled={vorlageLaden}
              title="Als Vorlage speichern"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: vorlageLaden
                  ? 'linear-gradient(145deg,#d4a847,#b8841e)'
                  : 'linear-gradient(145deg,#f5c842,#d97706)',
                border: 'none',
                borderRadius: 6,
                padding: '3px 8px 3px 5px',
                cursor: vorlageLaden ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 6px rgba(217,119,6,0.40), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.12)',
                fontSize: 10, fontWeight: 700, color: 'white',
                textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                letterSpacing: 0.3,
              }}>
              {vorlageLaden ? (
                <span style={{ fontSize: 11 }}>⏳</span>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
                    </linearGradient>
                  </defs>
                  <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" fill="url(#fg)" />
                  <path d="M3 9h18" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                </svg>
              )}
              Vorlage
            </button>
          )}

          {onKiClick && (
            <button
              onMouseDown={e => { e.preventDefault(); onKiClick() }}
              disabled={kiLaden}
              title="KI verbessert den Text bautechnisch-kaufmännisch"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: kiLaden
                  ? 'linear-gradient(145deg,#7c5bc4,#5b21b6)'
                  : 'linear-gradient(145deg,#a78bfa,#7c3aed)',
                border: 'none',
                borderRadius: 6,
                padding: '3px 8px 3px 5px',
                cursor: kiLaden ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 6px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.12)',
                fontSize: 10, fontWeight: 700, color: 'white',
                textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                letterSpacing: 0.3,
              }}>
              {kiLaden ? (
                <span style={{ fontSize: 11 }}>⏳</span>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2l1.8 5.4L19 9l-5.2 2.6L12 17l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="url(#kg)" />
                  <path d="M19 15l.9 2.6L22 18l-2.1 1-1 2.5-.9-2.5L16 18l2.1-1L19 15z" fill="rgba(255,255,255,0.75)" />
                  <path d="M5 3l.7 2L7 5.5l-1.3.7-.7 2-.7-2L3 5.5l1.3-.5L5 3z" fill="rgba(255,255,255,0.65)" />
                </svg>
              )}
              KI
            </button>
          )}
        </div>
      )}

      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #bbb;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
