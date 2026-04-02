import React, { useState, useEffect } from 'react'
import api from '../services/api'

let _uidSeq = 0
const newUid = () => ++_uidSeq

interface Position {
  uid?: number
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

interface RechnungenProps {
  onTransferBeleg?: (datei: File, vorschlag: any) => void
}

export default function Rechnungen({ onTransferBeleg }: RechnungenProps = {}) {
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

  const [zahlungsModus, setZahlungsModus] = useState('standard')
  const [zahlungsEigenText, setZahlungsEigenText] = useState('')
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [bezahltModal, setBezahltModal] = useState<any>(null)
  const [bezahltDatum, setBezahltDatum] = useState(new Date().toISOString().split('T')[0])
  const [mahnungModal, setMahnungModal] = useState<any>(null)
  const [mahnungFrist1, setMahnungFrist1] = useState(14)
  const [mahnungFrist2, setMahnungFrist2] = useState(7)
  const [mahnungFrist3, setMahnungFrist3] = useState(5)
  const [formKey, setFormKey] = useState(0)
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [autocomplete, setAutocomplete] = useState<{idx: number; items: any[]} | null>(null)
  const [vorlagenPickerOffen, setVorlagenPickerOffen] = useState(false)
  const [kiTextLaden, setKiTextLaden] = useState(false)

  useEffect(() => {
    if (formOffen) {
      api.get('/vorlagen').then(r => setVorlagen(r.data)).catch(() => {})
      setVorlagenPickerOffen(false)
      setAutocomplete(null)
    }
  }, [formOffen])

  useEffect(() => {
    api.get('/kunden').then(r => setKunden(r.data))
    api.get('/einstellungen').then(r => {
      const d = r.data
      setMahnungFrist1(d.mahnungFrist1 || 14)
      setMahnungFrist2(d.mahnungFrist2 || 7)
      setMahnungFrist3(d.mahnungFrist3 || 5)
    }).catch(() => {})
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
    setPositionen([{ uid: newUid(), typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
    setFormKey(k => k + 1)
    setRabattProzent(0)
    setSkontoAktiv(false)
    setSkontoProzent(2)
    setSkontoTage(7)
    setZahlungsModus('standard')
    setZahlungsEigenText('')
    setBearbeitenId(null)
  }

  const zahlungsModusErkennen = (wert: string | null) => {
    if (!wert) return { modus: 'standard', eigen: '' }
    if (wert === '__ausblenden__') return { modus: 'ausblenden', eigen: '' }
    if (wert === 'Zahlbar innerhalb von 7 Tagen nach Rechnungserhalt.') return { modus: '7tage', eigen: '' }
    if (wert === 'Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt.') return { modus: '14tage', eigen: '' }
    if (wert === 'Zahlbar innerhalb von 30 Tagen nach Rechnungserhalt.') return { modus: '30tage', eigen: '' }
    if (wert === 'Sofort zahlbar ohne Abzug.') return { modus: 'sofort', eigen: '' }
    return { modus: 'eigen', eigen: wert }
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
      const zm = zahlungsModusErkennen(r.zahlungshinweis)
      setZahlungsModus(zm.modus)
      setZahlungsEigenText(zm.eigen)
      setPositionen(posRes.data.length > 0
        ? posRes.data.map((p: any) => ({ uid: newUid(), ...p, menge: parseFloat(p.menge) || 0, einzelpreis: parseFloat(p.einzelpreis) || 0 }))
        : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
      setFormKey(k => k + 1)
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
      setPositionen(posRes.data.length > 0
        ? posRes.data.map((p: any) => ({ uid: newUid(), ...p, menge: parseFloat(p.menge) || 0, einzelpreis: parseFloat(p.einzelpreis) || 0 }))
        : [{ typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
      setFormKey(k => k + 1)
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
      setPositionen(posRes.data.length > 0 ? posRes.data.map((p: any) => ({ uid: newUid(), ...p })) : [{ uid: newUid(), typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
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

  const mahnungPdfOeffnen = (id: number, stufe: number) => {
    const token = localStorage.getItem('token')
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
    window.open(`${baseUrl}/api/pdf/${id}?token=${token}&mahnung=${stufe}`, '_blank')
  }

  const alsBeleg = async (r: any) => {
    if (!onTransferBeleg) return
    try {
      const token = localStorage.getItem('token')
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://scanpro-backend-production.up.railway.app'
      const res = await fetch(`${baseUrl}/api/pdf/${r.id}?token=${token}&download=1`)
      const blob = await res.blob()
      const datei = new File([blob], `Rechnung_${r.rechnungsnummer || r.id}.pdf`, { type: 'application/pdf' })
      const kunde = kunden.find(k => k.id === r.kundeId)
      const vorschlag = {
        beschreibung: `Rechnung ${r.rechnungsnummer || ''}${r.projektName ? ' – ' + r.projektName : ''}`,
        betrag: r.gesamt ? String(parseFloat(r.gesamt).toFixed(2)) : '',
        datum: r.datum ? r.datum.split('T')[0] : '',
        rechnungsnummer: r.rechnungsnummer || '',
        kategorie: 'Ausgangsrechnungen',
        lieferant: kunde ? `${kunde.vorname} ${kunde.nachname}${kunde.firma ? ' / ' + kunde.firma : ''}`.trim() : ''
      }
      onTransferBeleg(datei, vorschlag)
    } catch { alert('Fehler beim Übertragen des PDFs') }
  }

  const mahnungErstellen = async (stufe: number) => {
    const statusMap: any = { 1: 'Mahnung 1', 2: 'Mahnung 2', 3: 'Inkasso' }
    const id = mahnungModal.id  // vor setMahnungModal(null) sichern
    // window.open MUSS synchron aufgerufen werden (Browser blockiert Popups nach await)
    mahnungPdfOeffnen(id, stufe)
    setMahnungModal(null)
    try {
      await api.put(`/rechnungen/${id}/status`, { status: statusMap[stufe] })
      rechnungenLaden()
    } catch (e) {
      alert('Fehler beim Erstellen der Mahnung!')
    }
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
    setPositionen([...positionen, { uid: newUid(), typ: 'Normal', beschreibung: '', menge: 1, einheit: 'PA', einzelpreis: 0 }])
  }

  const positionAendern = (idx: number, feld: string, wert: any) => {
    const neu = [...positionen]
    ;(neu[idx] as any)[feld] = wert
    setPositionen(neu)
  }

  const positionLoeschen = (idx: number) => {
    setPositionen(positionen.filter((_, i) => i !== idx))
  }

  const positionVerschieben = (idx: number, richtung: 'hoch' | 'runter') => {
    const neu = [...positionen]
    const ziel = richtung === 'hoch' ? idx - 1 : idx + 1
    if (ziel < 0 || ziel >= neu.length) return
    ;[neu[idx], neu[ziel]] = [neu[ziel], neu[idx]]
    setPositionen(neu)
  }

  const vorlageEinfuegen = (idx: number, v: any) => {
    const neu = [...positionen]
    // Neue uid → Inputs remounten mit korrekten defaultValues aus der Vorlage
    neu[idx] = { uid: newUid(), ...neu[idx], beschreibung: v.beschreibung || v.name, menge: parseFloat(v.menge) || 1, einheit: v.einheit || 'PA', einzelpreis: parseFloat(v.einzelpreis) || 0 }
    setPositionen(neu)
    setAutocomplete(null)
  }

  const vorlageAlsPositionHinzufuegen = (v: any) => {
    setPositionen([...positionen, { uid: newUid(), typ: 'Normal', beschreibung: v.beschreibung || v.name, menge: parseFloat(v.menge) || 1, einheit: v.einheit || 'PA', einzelpreis: parseFloat(v.einzelpreis) || 0 }])
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
          uid: newUid(), typ: 'Normal', beschreibung: p.beschreibung,
          menge: p.menge || 1, einheit: p.einheit || 'PA', einzelpreis: p.einzelpreis || 0
        }))])
      }
    } catch { alert('KI-Positionen konnten nicht generiert werden') }
    setKiTextLaden(false)
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
        zahlungshinweis: zahlungsModus === 'standard' ? '' :
          zahlungsModus === 'ausblenden' ? '__ausblenden__' :
          zahlungsModus === '7tage' ? 'Zahlbar innerhalb von 7 Tagen nach Rechnungserhalt.' :
          zahlungsModus === '14tage' ? 'Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt.' :
          zahlungsModus === '30tage' ? 'Zahlbar innerhalb von 30 Tagen nach Rechnungserhalt.' :
          zahlungsModus === 'sofort' ? 'Sofort zahlbar ohne Abzug.' :
          zahlungsEigenText,
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
                      <div style={{display:'flex', gap:4}}>
                        <button title="Bearbeiten" onClick={() => rechnungBearbeiten(r)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #e5e0d8',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#555'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button title="Duplizieren" onClick={() => rechnungDuplizieren(r)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #dbeafe',background:'#f0f7ff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#1e40af'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button title="PDF öffnen" onClick={() => pdfOeffnen(r.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #d1f5e0',background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2d6a4f'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                        </button>
                        <button title="PDF speichern" onClick={() => pdfHerunterladen(r.id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #d1f5e0',background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2d6a4f'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        <button title="Mahnung erstellen" onClick={() => setMahnungModal(r)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #fef3c7',background:'#fffbeb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#92400e'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </button>
                        {onTransferBeleg && (
                          <button title="Als Beleg zum Belegscanner übertragen" onClick={() => alsBeleg(r)}
                            style={{width:32,height:32,borderRadius:8,border:'1px solid #bfdbfe',background:'#eff6ff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#1d4ed8'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>
                          </button>
                        )}
                        {r.status === 'Bezahlt' && (
                          <button title="Zu G&V übertragen" onClick={async () => {
                            try {
                              await api.post(`/guv/von-rechnung/${r.id}`, {})
                              alert('✅ Rechnung wurde zur G&V übertragen!')
                            } catch (e: any) {
                              alert(e?.response?.data?.fehler || 'Fehler beim Übertragen')
                            }
                          }} style={{width:32,height:32,borderRadius:8,border:'1px solid #c8a96e44',background:'#fdf8f0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#c8a96e'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                          </button>
                        )}
                        <button title="Löschen" onClick={() => rechnungLoeschen(r.id)}
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

      {/* MAHNUNG MODAL */}
      {mahnungModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300}}>
          <div style={{background:'white', borderRadius:14, width:420, padding:28, boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, marginBottom:4}}>⚠️ Mahnung erstellen</div>
            <div style={{fontSize:13, color:'#888', marginBottom:24}}>Rechnung {mahnungModal.nummer} · € {parseFloat(mahnungModal.gesamt).toFixed(2)}</div>

            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:24}}>
              <button onClick={() => mahnungErstellen(1)}
                style={{padding:'14px 16px', borderRadius:10, border:'2px solid #fef3c7', background:'#fffbeb', cursor:'pointer', textAlign:'left'}}>
                <div style={{fontWeight:700, fontSize:14, color:'#92400e'}}>📩 Zahlungserinnerung</div>
                <div style={{fontSize:12, color:'#a16207', marginTop:3}}>Freundliche Erinnerung · Frist: {mahnungFrist1} Tage</div>
              </button>
              <button onClick={() => mahnungErstellen(2)}
                style={{padding:'14px 16px', borderRadius:10, border:'2px solid #fed7aa', background:'#fff7ed', cursor:'pointer', textAlign:'left'}}>
                <div style={{fontWeight:700, fontSize:14, color:'#c2410c'}}>⚠️ Mahnung</div>
                <div style={{fontSize:12, color:'#ea580c', marginTop:3}}>Formelle Mahnung · Frist: {mahnungFrist2} Tage</div>
              </button>
              <button onClick={() => mahnungErstellen(3)}
                style={{padding:'14px 16px', borderRadius:10, border:'2px solid #fecaca', background:'#fff5f5', cursor:'pointer', textAlign:'left'}}>
                <div style={{fontWeight:700, fontSize:14, color:'#c0392b'}}>🔴 Letzte Mahnung</div>
                <div style={{fontSize:12, color:'#e74c3c', marginTop:3}}>Letzte Mahnung vor rechtlichen Schritten · Frist: {mahnungFrist3} Tage</div>
              </button>
            </div>

            <button onClick={() => setMahnungModal(null)}
              style={{width:'100%', padding:12, background:'#f0ede8', color:'#888', border:'none', borderRadius:8, cursor:'pointer', fontSize:13}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* FORMULAR MODAL */}
      {formOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:100, overflowY:'auto', padding:'20px 0'}}>
          <div style={{background:'white', borderRadius:14, width:'min(900px, 96vw)', minWidth:340, margin:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', resize:'horizontal', overflow:'auto'}}>
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
                <div style={{gridColumn:'1 / -1'}}>
                  <label style={labelStyle}>Zahlungsbedingungen im PDF</label>
                  <select style={{...inputStyle, background:'white'}}
                    value={zahlungsModus}
                    onChange={e => setZahlungsModus(e.target.value)}>
                    <option value="standard">Standard – 14 Tage nach Rechnungserhalt</option>
                    <option value="7tage">7 Tage nach Rechnungserhalt</option>
                    <option value="14tage">14 Tage nach Rechnungserhalt</option>
                    <option value="30tage">30 Tage nach Rechnungserhalt</option>
                    <option value="sofort">Sofort zahlbar ohne Abzug</option>
                    <option value="eigen">Eigener Text...</option>
                    <option value="ausblenden">Ausblenden (kein Hinweis im PDF)</option>
                  </select>
                  {zahlungsModus === 'eigen' && (
                    <textarea
                      style={{...inputStyle, marginTop:6, resize:'vertical', height:60}}
                      placeholder="z.B. Zahlbar innerhalb von 10 Tagen nach Rechnungserhalt."
                      value={zahlungsEigenText}
                      onChange={e => setZahlungsEigenText(e.target.value)}
                    />
                  )}
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
                <div style={{display:'grid', gridTemplateColumns:'22px 1fr 70px 90px 110px 32px', gap:8, marginBottom:4}}>
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
                        style={{...inputStyle, resize:'vertical', overflow:'auto', lineHeight:'20px', minHeight:38, display:'block', fontWeight:700, background:'#f5f3ef', borderColor:'#e5e0d8', color:'#3a2e1e'}}
                        placeholder="Zwischentitel / Abschnittsbezeichnung..."
                        rows={1}
                        value={pos.beschreibung}
                        onChange={e => { positionAendern(idx, 'beschreibung', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                        onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} />
                      <button onClick={() => positionLoeschen(idx)}
                        style={{background:'#fde8e6', border:'none', borderRadius:6, width:32, height:36, cursor:'pointer', color:'#c0392b', fontSize:14}}>✕</button>
                    </div>
                  ) : (
                    /* ── Normale Position ── */
                    <div key={idx} style={{display:'grid', gridTemplateColumns:'22px 1fr 70px 90px 110px 32px', gap:8, marginBottom:8, alignItems:'center'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:2}}>
                        <button onClick={() => positionVerschieben(idx, 'hoch')} disabled={idx === 0} title="Nach oben"
                          style={{background: idx === 0 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▲</button>
                        <button onClick={() => positionVerschieben(idx, 'runter')} disabled={idx === positionen.length - 1} title="Nach unten"
                          style={{background: idx === positionen.length - 1 ? '#f5f3ef' : '#f0ede8', border:'none', borderRadius:4, height:17, cursor: idx === positionen.length - 1 ? 'default' : 'pointer', color: idx === positionen.length - 1 ? '#ccc' : '#666', fontSize:9, lineHeight:1, padding:0}}>▼</button>
                      </div>
                      <div style={{position:'relative'}}>
                        <textarea style={{...inputStyle, resize:'vertical', overflow:'auto', lineHeight:'20px', minHeight:38, display:'block'}}
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
                        key={`${pos.uid ?? idx}-menge`}
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
                        key={`${pos.uid ?? idx}-preis`}
                        defaultValue={pos.einzelpreis || ''}
                        onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10) }}
                        onBlur={e => positionAendern(idx, 'einzelpreis', parseFloat(e.target.value.replace(',', '.')) || 0)} />
                      <button onClick={() => positionLoeschen(idx)}
                        style={{background:'#fde8e6', border:'none', borderRadius:6, width:32, height:36, cursor:'pointer', color:'#c0392b', fontSize:14}}>✕</button>
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
                  <button onClick={() => setPositionen([...positionen, { uid: newUid(), typ: 'Text', beschreibung: '', menge: 0, einheit: '', einzelpreis: 0 }])}
                    style={{padding:'9px 14px', border:'2px dashed #c8a96e', borderRadius:8, background:'#fdf8f0', color:'#b8922a', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap'}}>
                    + Textzeile
                  </button>
                  <button onClick={kiTextGenerieren} disabled={kiTextLaden}
                    style={{padding:'9px 14px', border:'2px dashed #6366f1', borderRadius:8, background: kiTextLaden ? '#f0f0ff' : 'white', color:'#6366f1', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:700, cursor: kiTextLaden ? 'not-allowed' : 'pointer', whiteSpace:'nowrap'}}>
                    {kiTextLaden ? '⏳ KI denkt...' : '✨ KI-Positionen'}
                  </button>
                </div>
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