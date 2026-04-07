import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const GOLD = '#c8a96e'

const THEMES = [
  { name: 'Standard', akzentFarbe: '#1e6a9e', goldFarbe: '#b8a96e', dunkelFarbe: '#1a2a3a' },
  { name: 'Modern',   akzentFarbe: '#4f46e5', goldFarbe: '#8b5cf6', dunkelFarbe: '#0f172a' },
  { name: 'Minimal',  akzentFarbe: '#64748b', goldFarbe: '#94a3b8', dunkelFarbe: '#0f172a' },
  { name: 'Premium',  akzentFarbe: '#c8a96e', goldFarbe: '#f0d080', dunkelFarbe: '#1a1a1a' },
  { name: 'Forest',   akzentFarbe: '#059669', goldFarbe: '#34d399', dunkelFarbe: '#064e3b' },
]

const DEFAULT_LAYOUT = {
  theme: 'Standard',
  akzentFarbe: '#1e6a9e',
  goldFarbe: '#b8a96e',
  dunkelFarbe: '#1a2a3a',
  logoPosition: 'links' as 'links' | 'mitte' | 'rechts',
  seitenrandMm: 12,
  akzentHoeheMm: 2.5,
  bodySchriftPt: 8,
  firmaSchriftPt: 11,
  titelSchriftPt: 20,
  ueberschriftSchriftPt: 10,
  bezeichnungSchriftPt: 8,
  fusszeileSchriftPt: 7,
  abstandMm: 4,
}

export default function Einstellungen() {
  const [laden, setLaden] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const schriftRef = useRef<HTMLInputElement>(null)
  const bildAnalyseRef = useRef<HTMLInputElement>(null)

  // Tab navigation
  const [aktTab, setAktTab] = useState<'allgemein' | 'layout'>('allgemein')

  const [firma, setFirma] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [land, setLand] = useState('Österreich')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [uid, setUid] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')
  const [bank, setBank] = useState('')
  const [kontoinhaber, setKontoinhaber] = useState('')
  const [gerichtsstand, setGerichtsstand] = useState('')
  const [logoBase64, setLogoBase64] = useState('')
  const [logoBreite, setLogoBreite] = useState(100)
  const [logoHoehe, setLogoHoehe] = useState(100)
  const [mahnungFrist1, setMahnungFrist1] = useState(14)
  const [mahnungFrist2, setMahnungFrist2] = useState(7)
  const [mahnungFrist3, setMahnungFrist3] = useState(5)
  const [kmSatz, setKmSatz] = useState(0.42)

  // Layout & Design
  const [layout, setLayout] = useState<typeof DEFAULT_LAYOUT>({ ...DEFAULT_LAYOUT })
  const [schriftName, setSchriftName] = useState<string | null>(null)
  const [schriftLaden, setSchriftLaden] = useState(false)
  const [kiText, setKiText] = useState('')
  const [kiLaden, setKiLaden] = useState(false)
  const [kiLogoLaden, setKiLogoLaden] = useState(false)
  const [kiBildLaden, setKiBildLaden] = useState(false)

  // Layout-Presets
  interface LayoutPreset { id: number; name: string; layout: typeof DEFAULT_LAYOUT; createdAt: string }
  const [presets, setPresets] = useState<LayoutPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [presetSpeichernOffen, setPresetSpeichernOffen] = useState(false)
  const [presetLaden, setPresetLaden] = useState(false)

  // Layout-Zuordnung (welches Preset für welchen Dokumenttyp)
  const [zuordnungR, setZuordnungR] = useState<number | null>(null)
  const [zuordnungA, setZuordnungA] = useState<number | null>(null)
  const [zuordnungLaden, setZuordnungLaden] = useState(false)

  // Passwort ändern
  const [pwAktuell, setPwAktuell]     = useState('')
  const [pwNeu, setPwNeu]             = useState('')
  const [pwBestaetigt, setPwBestaetigt] = useState('')
  const [pwLaden, setPwLaden]         = useState(false)
  const [pwNachricht, setPwNachricht] = useState<{ text: string; ok: boolean } | null>(null)
  const [pwSichtbar, setPwSichtbar]   = useState({ aktuell: false, neu: false, best: false })

  const presetsLaden = () => {
    api.get('/einstellungen/presets').then(r => setPresets(r.data)).catch(() => {})
  }

  const presetSpeichern = async () => {
    if (!presetName.trim()) return
    setPresetLaden(true)
    try {
      await api.post('/einstellungen/presets', { name: presetName.trim(), layout })
      setPresetName('')
      setPresetSpeichernOffen(false)
      presetsLaden()
    } catch { alert('Fehler beim Speichern') }
    setPresetLaden(false)
  }

  const presetLoeschen = async (id: number) => {
    try {
      await api.delete(`/einstellungen/presets/${id}`)
      setPresets(prev => prev.filter(p => p.id !== id))
    } catch { alert('Fehler beim Löschen') }
  }

  const presetAnwenden = (p: LayoutPreset) => {
    setLayout(prev => ({ ...prev, ...p.layout }))
  }

  const zuordnungSpeichern = async () => {
    setZuordnungLaden(true)
    try {
      const presetR = presets.find(p => p.id === zuordnungR)
      const presetA = presets.find(p => p.id === zuordnungA)
      await api.post('/einstellungen/zuordnung', {
        preset_id_rechnung: zuordnungR,
        layout_rechnung: presetR?.layout ?? null,
        preset_id_angebot: zuordnungA,
        layout_angebot: presetA?.layout ?? null,
      })
    } catch { alert('Fehler beim Speichern der Zuordnung') }
    setZuordnungLaden(false)
  }

  useEffect(() => {
    presetsLaden()
    api.get('/einstellungen').then(r => {
      const d = r.data
      setFirma(d.firma || '')
      setStrasse(d.strasse || '')
      setPlz(d.plz || '')
      setOrt(d.ort || '')
      setLand(d.land || 'Österreich')
      setTelefon(d.telefon || '')
      setEmail(d.email || '')
      setWebsite(d.website || '')
      setUid(d.uid || '')
      setIban(d.iban || '')
      setBic(d.bic || '')
      setBank(d.bank || '')
      setKontoinhaber(d.kontoinhaber || '')
      setGerichtsstand(d.gerichtsstand || '')
      setLogoBase64(d.logoBase64 || '')
      setLogoBreite(d.logoBreite || 100)
      setLogoHoehe(d.logoHoehe || 100)
      setMahnungFrist1(d.mahnungFrist1 || 14)
      setMahnungFrist2(d.mahnungFrist2 || 7)
      setMahnungFrist3(d.mahnungFrist3 || 5)
      setKmSatz(parseFloat(d.km_satz) || 0.42)
      if (d.layout) setLayout(prev => ({ ...prev, ...d.layout }))
      if (d.schrift_name) setSchriftName(d.schrift_name)
      if (d.preset_id_rechnung) setZuordnungR(d.preset_id_rechnung)
      if (d.preset_id_angebot)  setZuordnungA(d.preset_id_angebot)
    }).catch(() => {})
  }, [])

  const schriftHochladen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSchriftLaden(true)
    const formData = new FormData()
    formData.append('schrift', file)
    try {
      const res = await api.post('/einstellungen/schrift-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSchriftName(res.data.name)
    } catch { alert('Schriftart konnte nicht hochgeladen werden') }
    setSchriftLaden(false)
    if (schriftRef.current) schriftRef.current.value = ''
  }

  const schriftLoeschen = async () => {
    try {
      await api.post('/einstellungen/schrift-loeschen')
      setSchriftName(null)
    } catch { alert('Fehler beim Löschen') }
  }

  const kiDesign = async () => {
    if (!kiText.trim()) return
    setKiLaden(true)
    try {
      const res = await api.post('/einstellungen/ki-design', { beschreibung: kiText })
      if (res.data.layout) setLayout(prev => ({ ...prev, ...res.data.layout }))
    } catch { alert('KI Design konnte nicht generiert werden') }
    setKiLaden(false)
  }

  const kiLogoFarben = async () => {
    if (!logoBase64) return
    setKiLogoLaden(true)
    try {
      const res = await api.post('/einstellungen/ki-logo-farben', { logoBase64 })
      if (res.data.layout) setLayout(prev => ({ ...prev, ...res.data.layout }))
    } catch { alert('Logo-Analyse fehlgeschlagen') }
    setKiLogoLaden(false)
  }

  const kiBildAnalyse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Bild zu groß! Max 5MB'); return }
    setKiBildLaden(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await api.post('/einstellungen/ki-design-analyse', { bildBase64: reader.result })
        if (res.data.layout) setLayout(prev => ({ ...prev, ...res.data.layout }))
      } catch { alert('Design-Analyse fehlgeschlagen') }
      setKiBildLaden(false)
    }
    reader.readAsDataURL(file)
    if (bildAnalyseRef.current) bildAnalyseRef.current.value = ''
  }

  const logoHochladen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo zu groß! Max 2MB'); return }
    const reader = new FileReader()
    reader.onload = () => setLogoBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  const speichern = async () => {
    setLaden(true)
    try {
      await api.post('/einstellungen', {
        firma, strasse, plz, ort, land, telefon, email, website,
        uid, iban, bic, bank, kontoinhaber, gerichtsstand, logoBase64, logoBreite, logoHoehe,
        mahnungFrist1, mahnungFrist2, mahnungFrist3, km_satz: kmSatz,
        layout
      })
      setGespeichert(true)
      setTimeout(() => setGespeichert(false), 3000)
    } catch (fehler: any) {
      const msg = fehler.response?.data?.fehler || fehler.message
      alert('Fehler: ' + msg)
    }
    setLaden(false)
  }

  const passwortAendern = async () => {
    if (!pwAktuell || !pwNeu || !pwBestaetigt) {
      setPwNachricht({ text: 'Bitte alle Felder ausfüllen!', ok: false }); return
    }
    if (pwNeu !== pwBestaetigt) {
      setPwNachricht({ text: 'Neues Passwort stimmt nicht überein!', ok: false }); return
    }
    if (pwNeu.length < 6) {
      setPwNachricht({ text: 'Passwort muss mindestens 6 Zeichen haben!', ok: false }); return
    }
    setPwLaden(true)
    setPwNachricht(null)
    try {
      const res = await api.post('/auth/passwort-aendern', {
        aktuellesPasswort: pwAktuell,
        neuesPasswort: pwNeu
      })
      setPwNachricht({ text: res.data.nachricht + ' Eine Bestätigungs-E-Mail wurde gesendet.', ok: true })
      setPwAktuell(''); setPwNeu(''); setPwBestaetigt('')
      setTimeout(() => setPwNachricht(null), 8000)
    } catch (e: any) {
      setPwNachricht({ text: e?.response?.data?.fehler || 'Fehler beim Ändern!', ok: false })
    }
    setPwLaden(false)
  }

  // PDF Maße: Basis 70mm breit, 30mm hoch bei 100%
  const pdfBreiteMm = Math.round((logoBreite / 100) * 70)
  const pdfHoeheMm = Math.round((logoHoehe / 100) * 30)

  // Vorschau Pixel
  const vorschauBreite = Math.round((logoBreite / 100) * 160)
  const vorschauHoehe = Math.round((logoHoehe / 100) * 80)

  // Live-Vorschau Komponente (wiederverwendbar)
  const LiveVorschau = () => (
    <div style={{width:300, height:424, overflow:'hidden', borderRadius:8,
                 boxShadow:'0 8px 32px rgba(0,0,0,0.18)', border:'1px solid #e5e0d8', background:'white'}}>
      <div style={{
        width:210, height:297,
        transformOrigin:'top left',
        transform:'scale(1.428)',
        background:'white',
        position:'relative',
        fontFamily:'Arial, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding:`3px ${layout.seitenrandMm * 0.88}px 2px`,
          display:'flex',
          flexDirection: layout.logoPosition === 'rechts' ? 'row-reverse' : 'row',
          justifyContent: layout.logoPosition === 'mitte' ? 'center' : 'space-between',
          alignItems:'center', gap:4,
        }}>
          <div style={{flexShrink:0}}>
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo" style={{width:`${Math.round((logoBreite/100)*35)}px`, height:`${Math.round((logoHoehe/100)*15)}px`, objectFit:'fill'}} />
            ) : (
              <div style={{width:35, height:15, background:'#f0ede8', borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <div style={{width:20, height:8, background:'#ddd', borderRadius:1}} />
              </div>
            )}
          </div>
          <div style={{textAlign: layout.logoPosition === 'rechts' ? 'left' : layout.logoPosition === 'mitte' ? 'center' : 'right', lineHeight:1.4}}>
            <div style={{fontSize:layout.firmaSchriftPt * 0.55, fontWeight:800, color:layout.dunkelFarbe}}>{firma || 'Ihre Firma GmbH'}</div>
            <div style={{fontSize:5, color:'#888'}}>Musterstraße 1 · 1010 Wien</div>
          </div>
        </div>
        {/* Akzentleiste */}
        <div style={{height:layout.akzentHoeheMm * 0.88, background:`linear-gradient(90deg, ${layout.akzentFarbe}, ${layout.goldFarbe})`}} />
        {/* Titel */}
        <div style={{padding:`${layout.abstandMm * 0.22}px ${layout.seitenrandMm * 0.88}px`, display:'flex', justifyContent:'space-between', marginTop:layout.abstandMm * 0.22}}>
          <div style={{fontSize:layout.titelSchriftPt * 0.55, fontWeight:800, color:layout.dunkelFarbe}}>Rechnung</div>
          <div style={{fontSize:5, color:'#aaa', textAlign:'right'}}>
            <div>Nr. 2026-001</div>
            <div>06.03.2026</div>
          </div>
        </div>
        {/* Empfänger */}
        <div style={{padding:`${layout.abstandMm * 0.22}px ${layout.seitenrandMm * 0.88}px`, borderBottom:`0.5px solid #e8f0f7`, marginTop:layout.abstandMm * 0.22}}>
          <div style={{fontSize:4.5, color:'#aaa', textTransform:'uppercase', letterSpacing:0.5}}>AN</div>
          <div style={{fontSize:layout.ueberschriftSchriftPt * 0.55, fontWeight:700, color:layout.dunkelFarbe, marginTop:1}}>Max Mustermann GmbH</div>
          <div style={{fontSize:Math.max(4, layout.ueberschriftSchriftPt * 0.55 - 1.2), color:'#888'}}>Hauptstraße 5, 8010 Graz</div>
        </div>
        {/* Tabelle */}
        <div style={{margin:`${layout.abstandMm * 0.22}px ${layout.seitenrandMm * 0.88}px`, marginTop:layout.abstandMm * 0.44}}>
          <div style={{background:layout.akzentFarbe, borderRadius:2, padding:'2px 3px', display:'flex', gap:2}}>
            <div style={{flex:1, fontSize:Math.max(3.5, layout.bezeichnungSchriftPt * 0.55 - 1), color:'white', fontWeight:700, textTransform:'uppercase'}}>Pos</div>
            <div style={{flex:4, fontSize:Math.max(3.5, layout.bezeichnungSchriftPt * 0.55 - 1), color:'white', fontWeight:700, textTransform:'uppercase'}}>Beschreibung</div>
            <div style={{flex:1, fontSize:Math.max(3.5, layout.bezeichnungSchriftPt * 0.55 - 1), color:'white', fontWeight:700, textAlign:'right'}}>Betrag</div>
          </div>
          {[['1','Beratungsleistung','€ 150,00'],['2','Implementierung','€ 200,00']].map(([pos, bez, bet]) => (
            <div key={pos} style={{display:'flex', gap:2, padding:'2px 3px', borderBottom:'0.5px solid #f0f0f0'}}>
              <div style={{flex:1, fontSize:layout.bodySchriftPt * 0.55, color:'#888'}}>{pos}</div>
              <div style={{flex:4, fontSize:layout.bezeichnungSchriftPt * 0.55, color:layout.dunkelFarbe, fontWeight:600}}>{bez}</div>
              <div style={{flex:1, fontSize:layout.bezeichnungSchriftPt * 0.55, textAlign:'right', color:layout.dunkelFarbe}}>{bet}</div>
            </div>
          ))}
        </div>
        {/* Summe */}
        <div style={{display:'flex', justifyContent:'flex-end', margin:`4px ${layout.seitenrandMm * 0.88}px`}}>
          <div style={{width:60}}>
            <div style={{display:'flex', justifyContent:'space-between', borderTop:`1px solid ${layout.dunkelFarbe}`, borderBottom:`1px solid ${layout.dunkelFarbe}`, padding:'2px 3px'}}>
              <span style={{fontSize:layout.bodySchriftPt * 0.55 + 1, fontWeight:800, color:layout.dunkelFarbe}}>Gesamt</span>
              <span style={{fontSize:layout.bodySchriftPt * 0.55 + 1, fontWeight:800, color:layout.akzentFarbe}}>€ 350,00</span>
            </div>
          </div>
        </div>
        {/* Footer-Bar */}
        <div style={{position:'absolute', bottom:0, left:0, right:0, height:6, background:layout.dunkelFarbe, display:'flex', alignItems:'center', padding:'0 6px'}}>
          <div style={{fontSize:3.5, color:'rgba(255,255,255,0.6)', flex:1}}>IBAN: AT12 3456 7890</div>
          <div style={{fontSize:3.5, color:'rgba(255,255,255,0.6)'}}>Seite 1 von 1</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{maxWidth: aktTab === 'layout' ? 920 : 700, margin:'0 auto', padding:'0 4px', transition:'max-width 0.2s'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
        <div style={{flex:1, fontFamily:'Syne, sans-serif', fontSize:13, color:'#888'}}>
          Firmendaten & PDF-Einstellungen
        </div>
        <button
          onClick={speichern}
          disabled={laden}
          style={{background: gespeichert ? '#2d6a4f' : '#1a1a1a', color:'white', border:'none', borderRadius:8, padding:'9px 20px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}>
          {laden ? '⏳ Speichern...' : gespeichert ? '✅ Gespeichert!' : '💾 Speichern'}
        </button>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div style={{display:'flex', gap:2, marginBottom:20, borderBottom:'2px solid #e5e0d8'}}>
        {(['allgemein', 'layout'] as const).map(t => (
          <button key={t} onClick={() => setAktTab(t)} style={{
            padding:'9px 20px', border:'none', background:'none', cursor:'pointer',
            fontWeight:700, fontSize:13, fontFamily:'Syne, sans-serif',
            color: aktTab === t ? '#1a2a3a' : '#aaa',
            borderBottom: aktTab === t ? '2px solid #1a2a3a' : '2px solid transparent',
            marginBottom: -2, borderRadius:'8px 8px 0 0',
            transition:'all 0.15s',
          }}>
            {t === 'allgemein' ? '⚙️ Allgemein' : '📐 Layout & Design'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: ALLGEMEIN
      ═══════════════════════════════════════════════════════════ */}
      {aktTab === 'allgemein' && <>

      {/* Logo */}
      <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:16}}>
          🖼️ Firmenlogo
        </div>

        <div style={{display:'flex', alignItems:'flex-start', gap:20, marginBottom:16}}>

          {/* Vorschau Box */}
          <div
            onClick={() => logoRef.current?.click()}
            style={{
              width: 200, height: 120,
              border:'2px dashed #e5e0d8', borderRadius:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', overflow:'hidden', background:'#faf8f5', flexShrink:0
            }}>
            {logoBase64 ? (
              <img
                src={logoBase64}
                style={{
                  width: `${vorschauBreite}px`,
                  height: `${vorschauHoehe}px`,
                  objectFit:'fill',
                  transition:'all 0.15s'
                }}
                alt="Logo"
              />
            ) : (
              <div style={{textAlign:'center', color:'#aaa'}}>
                <div style={{fontSize:28}}>📷</div>
                <div style={{fontSize:10, marginTop:4}}>Logo hochladen</div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{flex:1}}>
            <button
              onClick={() => logoRef.current?.click()}
              style={{padding:'8px 16px', border:'1px solid #e5e0d8', borderRadius:7, background:'white', fontSize:12, cursor:'pointer', marginBottom:8, display:'block', width:'100%'}}>
              📁 Logo auswählen
            </button>
            {logoBase64 && (
              <button
                onClick={() => setLogoBase64('')}
                style={{padding:'8px 16px', border:'1px solid #fde8e6', borderRadius:7, background:'white', color:'#c0392b', fontSize:12, cursor:'pointer', display:'block', width:'100%', marginBottom:8}}>
                🗑️ Logo entfernen
              </button>
            )}
            {logoBase64 && (
              <button
                onClick={() => { setLogoBreite(100); setLogoHoehe(100) }}
                style={{padding:'8px 16px', border:'1px solid #e5e0d8', borderRadius:7, background:'#f5f3ef', fontSize:12, cursor:'pointer', display:'block', width:'100%'}}>
                🔄 Zurücksetzen
              </button>
            )}
            <div style={{fontSize:10, color:'#aaa', marginTop:8}}>PNG, JPG — max. 2MB</div>
          </div>
        </div>

        {/* Versteckter File Input */}
        <input
          ref={logoRef}
          type="file"
          accept="image/png, image/jpeg"
          style={{display:'none'}}
          onChange={logoHochladen}
        />

        {/* Breite & Höhe Slider */}
        {logoBase64 && (
          <div style={{borderTop:'1px solid #f0ede8', paddingTop:16, display:'flex', flexDirection:'column', gap:16}}>

            {/* BREITE */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                <label style={{...labelStyle, marginBottom:0}}>↔️ Breite im PDF</label>
                <span style={{fontSize:12, fontWeight:700, color:'#1a1a1a', background:'#f5f3ef', padding:'2px 10px', borderRadius:6}}>
                  {logoBreite}% — {pdfBreiteMm}mm
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                value={logoBreite}
                onChange={e => setLogoBreite(Number(e.target.value))}
                style={{width:'100%', cursor:'pointer', accentColor:'#1e6a9e'}}
              />
              <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#aaa', marginTop:3}}>
                <span>Schmal</span>
                <span>Normal</span>
                <span>Sehr breit</span>
              </div>
            </div>

            {/* HÖHE */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                <label style={{...labelStyle, marginBottom:0}}>↕️ Höhe im PDF</label>
                <span style={{fontSize:12, fontWeight:700, color:'#1a1a1a', background:'#f5f3ef', padding:'2px 10px', borderRadius:6}}>
                  {logoHoehe}% — {pdfHoeheMm}mm
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                value={logoHoehe}
                onChange={e => setLogoHoehe(Number(e.target.value))}
                style={{width:'100%', cursor:'pointer', accentColor:'#1e6a9e'}}
              />
              <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#aaa', marginTop:3}}>
                <span>Flach</span>
                <span>Normal</span>
                <span>Sehr hoch</span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Firmendaten */}
      <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:16}}>
          🏢 Firmendaten
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div style={{gridColumn:'1 / -1'}}>
            <label style={labelStyle}>Firmenname</label>
            <input style={inputStyle} placeholder="z.B. 3D GebäudeScan & Plan"
              value={firma} onChange={e => setFirma(e.target.value)} />
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label style={labelStyle}>Straße & Hausnummer</label>
            <input style={inputStyle} placeholder="z.B. Musterstraße 1"
              value={strasse} onChange={e => setStrasse(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PLZ</label>
            <input style={inputStyle} placeholder="1010"
              value={plz} onChange={e => setPlz(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Ort</label>
            <input style={inputStyle} placeholder="Wien"
              value={ort} onChange={e => setOrt(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Land</label>
            <input style={inputStyle} placeholder="Österreich"
              value={land} onChange={e => setLand(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input style={inputStyle} placeholder="+43 1 234 5678"
              value={telefon} onChange={e => setTelefon(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>E-Mail</label>
            <input style={inputStyle} placeholder="office@firma.at"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} placeholder="www.firma.at"
              value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>UID-Nummer</label>
            <input style={inputStyle} placeholder="ATU12345678"
              value={uid} onChange={e => setUid(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Gerichtsstand</label>
            <input style={inputStyle} placeholder="Wien"
              value={gerichtsstand} onChange={e => setGerichtsstand(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Bankdaten */}
      <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:16}}>
          🏦 Bankverbindung
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div style={{gridColumn:'1 / -1'}}>
            <label style={labelStyle}>Kontoinhaber <span style={{color:'#c8a96e', fontSize:10}}>(für QR-Code / SEPA)</span></label>
            <input style={inputStyle} placeholder="Vorname Nachname oder Firma GmbH"
              value={kontoinhaber} onChange={e => setKontoinhaber(e.target.value)} />
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label style={labelStyle}>IBAN</label>
            <input style={inputStyle} placeholder="AT12 3456 7890 1234 5678"
              value={iban} onChange={e => setIban(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>BIC</label>
            <input style={inputStyle} placeholder="OPSKATWW"
              value={bic} onChange={e => setBic(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Bank</label>
            <input style={inputStyle} placeholder="Raiffeisenbank"
              value={bank} onChange={e => setBank(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Mahnung Fristen */}
      <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:4}}>
          ⚠️ Mahnung – Zahlungsfristen
        </div>
        <div style={{fontSize:11, color:'#888', marginBottom:16}}>
          Wie viele Tage hat der Kunde Zeit zu zahlen, nachdem eine Mahnung gesendet wurde?
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
          <div>
            <label style={labelStyle}>Zahlungserinnerung</label>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input
                type="number"
                min={1}
                max={90}
                style={{...inputStyle, width:'70px', textAlign:'center'}}
                value={mahnungFrist1}
                onChange={e => setMahnungFrist1(Number(e.target.value))}
              />
              <span style={{fontSize:12, color:'#888'}}>Tage</span>
            </div>
            <div style={{fontSize:10, color:'#aaa', marginTop:4}}>Stufe 1 – freundlich</div>
          </div>
          <div>
            <label style={labelStyle}>Mahnung</label>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input
                type="number"
                min={1}
                max={90}
                style={{...inputStyle, width:'70px', textAlign:'center'}}
                value={mahnungFrist2}
                onChange={e => setMahnungFrist2(Number(e.target.value))}
              />
              <span style={{fontSize:12, color:'#888'}}>Tage</span>
            </div>
            <div style={{fontSize:10, color:'#aaa', marginTop:4}}>Stufe 2 – formal</div>
          </div>
          <div>
            <label style={labelStyle}>Letzte Mahnung</label>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input
                type="number"
                min={1}
                max={90}
                style={{...inputStyle, width:'70px', textAlign:'center'}}
                value={mahnungFrist3}
                onChange={e => setMahnungFrist3(Number(e.target.value))}
              />
              <span style={{fontSize:12, color:'#888'}}>Tage</span>
            </div>
            <div style={{fontSize:10, color:'#aaa', marginTop:4}}>Stufe 3 – letzte Chance</div>
          </div>
        </div>
      </div>

      {/* ── KM-GELD EINSTELLUNG ───────────────────────────────────── */}
      <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:4}}>
          🚗 KM-Geld / Fahrtenbuch
        </div>
        <div style={{fontSize:11, color:'#888', marginBottom:16}}>
          Gesetzlicher km-Satz gem. § 26 EStG Österreich. Wird für die automatische Berechnung im KM-Buch und die G&V-Übertragung verwendet.
        </div>
        <div style={{display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
          <div>
            <label style={{...labelStyle, marginBottom:6}}>km-Satz (€ pro km)</label>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:14, color:'#888'}}>€</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="2.00"
                style={{...inputStyle, width:'100px', textAlign:'center', fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:16}}
                value={kmSatz}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 0) setKmSatz(v)
                }}
                onBlur={e => {
                  const v = parseFloat(e.target.value)
                  if (isNaN(v) || v <= 0) setKmSatz(0.42)
                }}
              />
              <span style={{fontSize:12, color:'#888'}}>/km</span>
            </div>
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {[
              { label: '€ 0,42 (PKW Standard AT)', val: 0.42 },
              { label: '€ 0,24 (Motorrad)', val: 0.24 },
              { label: '€ 0,38 (Fahrrad)', val: 0.38 },
            ].map(p => (
              <button key={p.val} onClick={() => setKmSatz(p.val)} style={{
                padding:'6px 12px', borderRadius:8, border:'1px solid #e5e0d8',
                background: kmSatz === p.val ? '#1a2a3a' : 'white',
                color: kmSatz === p.val ? 'white' : '#555',
                fontSize:11, fontWeight:600, cursor:'pointer',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
        <div style={{marginTop:12, padding:'10px 14px', background:'#fdf8f0', borderRadius:8, border:'1px solid #c8a96e33', fontSize:12, color:'#888'}}>
          💡 Beispiel: 100 km × € {kmSatz.toFixed(4)} = <strong style={{color:'#c8a96e'}}>€ {(100 * kmSatz).toFixed(2)}</strong> KM-Geld (steuerfrei)
        </div>
      </div>

      {/* ── PASSWORT ÄNDERN ────────────────────────────────────────── */}
      <div style={{background:'white', borderRadius:10, border:'1px solid #e5e0d8', padding:'20px 22px', marginBottom:16}}>
        <div style={{fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:800, color:'#1a1a1a', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
          🔐 Passwort ändern
        </div>
        <div style={{fontSize:12, color:'#aaa', marginBottom:18}}>Nach der Änderung wird eine Bestätigungs-E-Mail gesendet.</div>

        {/* Aktuelles Passwort */}
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Aktuelles Passwort</label>
          <div style={{position:'relative'}}>
            <input
              type={pwSichtbar.aktuell ? 'text' : 'password'}
              placeholder="Dein aktuelles Passwort"
              value={pwAktuell}
              onChange={e => setPwAktuell(e.target.value)}
              style={{...inputStyle, paddingRight:44}}
            />
            <button onClick={() => setPwSichtbar(s => ({...s, aktuell: !s.aktuell}))}
              style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:16, padding:0}}>
              {pwSichtbar.aktuell ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Neues Passwort */}
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Neues Passwort</label>
          <div style={{position:'relative'}}>
            <input
              type={pwSichtbar.neu ? 'text' : 'password'}
              placeholder="Mindestens 6 Zeichen"
              value={pwNeu}
              onChange={e => setPwNeu(e.target.value)}
              style={{
                ...inputStyle, paddingRight:44,
                borderColor: pwNeu.length > 0 && pwNeu.length < 6 ? '#ef4444' : pwNeu.length >= 6 ? '#10b981' : undefined
              }}
            />
            <button onClick={() => setPwSichtbar(s => ({...s, neu: !s.neu}))}
              style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:16, padding:0}}>
              {pwSichtbar.neu ? '🙈' : '👁️'}
            </button>
          </div>
          {/* Stärke-Anzeige */}
          {pwNeu.length > 0 && (
            <div style={{display:'flex', gap:4, marginTop:6}}>
              {[
                pwNeu.length >= 6,
                /[A-Z]/.test(pwNeu),
                /[0-9]/.test(pwNeu),
                /[^A-Za-z0-9]/.test(pwNeu),
              ].map((ok, i) => (
                <div key={i} style={{flex:1, height:3, borderRadius:2, background: ok ? '#10b981' : '#e5e0d8', transition:'background 0.3s'}} />
              ))}
            </div>
          )}
          {pwNeu.length > 0 && (
            <div style={{fontSize:10, color:'#aaa', marginTop:4}}>
              {pwNeu.length >= 6 && /[A-Z]/.test(pwNeu) && /[0-9]/.test(pwNeu) && /[^A-Za-z0-9]/.test(pwNeu)
                ? '💪 Sehr stark'
                : pwNeu.length >= 6 && (/[A-Z]/.test(pwNeu) || /[0-9]/.test(pwNeu))
                ? '✅ Gut'
                : pwNeu.length >= 6 ? '⚠️ Schwach – Groß/Kleinbuchstaben & Zahlen empfohlen'
                : '❌ Zu kurz (min. 6 Zeichen)'}
            </div>
          )}
        </div>

        {/* Bestätigen */}
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Neues Passwort bestätigen</label>
          <div style={{position:'relative'}}>
            <input
              type={pwSichtbar.best ? 'text' : 'password'}
              placeholder="Passwort wiederholen"
              value={pwBestaetigt}
              onChange={e => setPwBestaetigt(e.target.value)}
              style={{
                ...inputStyle, paddingRight:44,
                borderColor: pwBestaetigt.length > 0 ? (pwBestaetigt === pwNeu ? '#10b981' : '#ef4444') : undefined
              }}
            />
            <button onClick={() => setPwSichtbar(s => ({...s, best: !s.best}))}
              style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:16, padding:0}}>
              {pwSichtbar.best ? '🙈' : '👁️'}
            </button>
          </div>
          {pwBestaetigt.length > 0 && pwBestaetigt !== pwNeu && (
            <div style={{fontSize:11, color:'#ef4444', marginTop:4}}>❌ Passwörter stimmen nicht überein</div>
          )}
          {pwBestaetigt.length > 0 && pwBestaetigt === pwNeu && pwNeu.length >= 6 && (
            <div style={{fontSize:11, color:'#10b981', marginTop:4}}>✅ Passwörter stimmen überein</div>
          )}
        </div>

        {/* Nachricht */}
        {pwNachricht && (
          <div style={{
            padding:'10px 14px', borderRadius:8, marginBottom:14,
            background: pwNachricht.ok ? '#d1f5e0' : '#fde8e6',
            color: pwNachricht.ok ? '#2d6a4f' : '#c0392b',
            fontSize:13, fontWeight:600, border: `1px solid ${pwNachricht.ok ? '#a7f3c0' : '#fca5a5'}`
          }}>
            {pwNachricht.text}
          </div>
        )}

        <button
          onClick={passwortAendern}
          disabled={pwLaden}
          style={{
            background: pwLaden ? '#e5e0d8' : '#1a1a1a',
            color: pwLaden ? '#aaa' : 'white',
            border: 'none', borderRadius: 8, padding: '10px 22px',
            fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
            cursor: pwLaden ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', gap:8
          }}>
          {pwLaden ? '⏳ Wird geändert...' : '🔐 Passwort ändern'}
        </button>
      </div>

      {/* Vorschau */}
      {(firma || iban || logoBase64) && (
        <div style={{background:'#f5f3ef', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
          <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:12, color:'#888'}}>
            👁️ PDF Vorschau Header
          </div>
          <div style={{background:'white', borderRadius:8, border:'1px solid #e5e0d8', padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16}}>
            <div style={{flexShrink:0}}>
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  style={{
                    width: `${vorschauBreite}px`,
                    height: `${vorschauHoehe}px`,
                    objectFit:'fill'
                  }}
                  alt="Logo"
                />
              ) : (
                <div style={{width:80, height:50, background:'#f0ede8', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#aaa'}}>Kein Logo</div>
              )}
            </div>
            <div style={{textAlign:'right', fontSize:11, color:'#555', lineHeight:1.8}}>
              <div style={{fontSize:7, textTransform:'uppercase', letterSpacing:1, color:'#1e6a9e', fontWeight:700, marginBottom:4}}>Auftragnehmer</div>
              {firma && <div style={{fontWeight:800, fontSize:13, color:'#1a2a3a'}}>{firma}</div>}
              {strasse && <div>{strasse}, {plz} {ort}</div>}
              {telefon && <div>Tel: {telefon}</div>}
              {email && <div>{email}</div>}
              {uid && <div>UID: {uid}</div>}
            </div>
          </div>
          {iban && (
            <div style={{background:'#f0f6fb', border:'1px solid #1e6a9e', borderLeftWidth:3, borderRadius:6, padding:'8px 12px', marginTop:10, fontSize:11, color:'#444'}}>
              🏦 IBAN: <strong>{iban}</strong>{bic ? ` | BIC: ${bic}` : ''}{bank ? ` | ${bank}` : ''}
            </div>
          )}
        </div>
      )}

      </>}

      {/* ═══════════════════════════════════════════════════════════
          TAB: LAYOUT & DESIGN
      ═══════════════════════════════════════════════════════════ */}
      {aktTab === 'layout' && (
        <div style={{display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap'}}>

          {/* ── Linke Spalte: Steuerelemente ── */}
          <div style={{flex:1, minWidth:280}}>

            {/* ── Meine Presets ── */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, color:'#1a2a3a'}}>💾 Meine Presets</div>
                <button onClick={() => setPresetSpeichernOffen(o => !o)} style={{
                  padding:'5px 12px', borderRadius:7, border:'none',
                  background: presetSpeichernOffen ? '#e5e0d8' : layout.akzentFarbe,
                  color: presetSpeichernOffen ? '#666' : 'white',
                  fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                }}>
                  {presetSpeichernOffen ? '✕ Abbrechen' : '+ Aktuelles speichern'}
                </button>
              </div>

              {/* Speichern-Formular */}
              {presetSpeichernOffen && (
                <div style={{display:'flex', gap:8, marginBottom:12}}>
                  <input
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && presetSpeichern()}
                    placeholder='z.B. "Blau Modern" oder "Kundenvorlage"'
                    style={{...inputStyle, flex:1, padding:'7px 10px'}}
                    autoFocus
                  />
                  <button onClick={presetSpeichern} disabled={!presetName.trim() || presetLaden} style={{
                    padding:'7px 14px', borderRadius:7, border:'none', whiteSpace:'nowrap',
                    background: presetName.trim() ? layout.akzentFarbe : '#e5e0d8',
                    color: presetName.trim() ? 'white' : '#aaa',
                    fontSize:12, fontWeight:700, cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                  }}>
                    {presetLaden ? '⏳' : '💾 Speichern'}
                  </button>
                </div>
              )}

              {/* Preset-Liste */}
              {presets.length === 0 ? (
                <div style={{fontSize:11, color:'#bbb', textAlign:'center', padding:'12px 0'}}>
                  Noch keine Presets gespeichert
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {presets.map(p => (
                    <div
                      key={p.id}
                      onClick={() => presetAnwenden(p)}
                      style={{
                        display:'flex', alignItems:'center', gap:10,
                        padding:'9px 12px', borderRadius:8, cursor:'pointer',
                        border:'1.5px solid #e5e0d8', background:'#faf8f5',
                        transition:'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = layout.akzentFarbe)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e0d8')}
                    >
                      {/* Farbvorschau */}
                      <div style={{display:'flex', gap:3, flexShrink:0}}>
                        <div style={{width:13, height:13, borderRadius:'50%', background: p.layout?.akzentFarbe || '#1e6a9e', boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
                        <div style={{width:13, height:13, borderRadius:'50%', background: p.layout?.goldFarbe || '#b8a96e', boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
                        <div style={{width:13, height:13, borderRadius:'50%', background: p.layout?.dunkelFarbe || '#1a2a3a', boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
                      </div>
                      {/* Name */}
                      <span style={{flex:1, fontSize:13, fontWeight:600, color:'#1a2a3a'}}>{p.name}</span>
                      {/* Datum */}
                      <span style={{fontSize:10, color:'#bbb', flexShrink:0}}>
                        {new Date(p.createdAt).toLocaleDateString('de-AT')}
                      </span>
                      {/* Löschen */}
                      <button
                        onClick={e => { e.stopPropagation(); presetLoeschen(p.id) }}
                        style={{background:'none', border:'none', color:'#ccc', cursor:'pointer', fontSize:16, padding:'0 2px', lineHeight:1, flexShrink:0}}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Layout-Zuordnung ── */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              <div style={{...labelStyle, marginBottom:8}}>📌 Layout-Zuordnung</div>
              <div style={{fontSize:11, color:'#aaa', marginBottom:14, lineHeight:1.5}}>
                Welches Preset soll für Rechnungen bzw. Angebote verwendet werden?
              </div>

              {/* Rechnungen */}
              <div style={{marginBottom:12}}>
                <label style={labelStyle}>🧾 Rechnungen</label>
                <select
                  value={zuordnungR ?? ''}
                  onChange={e => setZuordnungR(e.target.value ? Number(e.target.value) : null)}
                  style={{...inputStyle}}
                >
                  <option value=''>— Kein Preset (Standard-Layout) —</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Angebote */}
              <div style={{marginBottom:14}}>
                <label style={labelStyle}>📋 Angebote</label>
                <select
                  value={zuordnungA ?? ''}
                  onChange={e => setZuordnungA(e.target.value ? Number(e.target.value) : null)}
                  style={{...inputStyle}}
                >
                  <option value=''>— Kein Preset (Standard-Layout) —</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={zuordnungSpeichern}
                disabled={zuordnungLaden}
                style={{
                  width:'100%', padding:'9px', borderRadius:8, border:'none',
                  background: zuordnungLaden ? '#e5e0d8' : layout.akzentFarbe,
                  color: zuordnungLaden ? '#aaa' : 'white',
                  fontWeight:700, fontSize:12, cursor: zuordnungLaden ? 'not-allowed' : 'pointer',
                  fontFamily:'Syne, sans-serif',
                }}>
                {zuordnungLaden ? '⏳ Speichern...' : '✅ Zuordnung speichern'}
              </button>
            </div>

            {/* Preset Themes */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              <div style={{...labelStyle, marginBottom:12}}>Design-Themes</div>
              <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                {THEMES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setLayout(prev => ({ ...prev, theme: t.name, akzentFarbe: t.akzentFarbe, goldFarbe: t.goldFarbe, dunkelFarbe: t.dunkelFarbe }))}
                    title={t.name}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                      border: layout.theme === t.name ? `2px solid ${t.akzentFarbe}` : '2px solid transparent',
                      borderRadius:10, padding:'8px 10px', cursor:'pointer', background:'#faf8f5',
                      transition:'all 0.15s'
                    }}>
                    <div style={{display:'flex', gap:3}}>
                      <div style={{width:18, height:18, borderRadius:'50%', background:t.akzentFarbe}} />
                      <div style={{width:18, height:18, borderRadius:'50%', background:t.goldFarbe}} />
                      <div style={{width:18, height:18, borderRadius:'50%', background:t.dunkelFarbe}} />
                    </div>
                    <div style={{fontSize:10, fontWeight:700, color: layout.theme === t.name ? t.akzentFarbe : '#888'}}>{t.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Farben + Logo-Position */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              {/* Farbpicker */}
              <div style={{marginBottom:16}}>
                <div style={{...labelStyle}}>Farben</div>
                <div style={{display:'flex', gap:12}}>
                  <div>
                    <div style={{fontSize:10, color:'#aaa', marginBottom:4}}>Akzentfarbe</div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input type="color" value={layout.akzentFarbe}
                        onChange={e => setLayout(prev => ({ ...prev, akzentFarbe: e.target.value, theme: 'Custom' }))}
                        style={{width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', padding:2, background:'none'}} />
                      <span style={{fontSize:11, color:'#666', fontFamily:'monospace'}}>{layout.akzentFarbe}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10, color:'#aaa', marginBottom:4}}>Sekundärfarbe</div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input type="color" value={layout.goldFarbe}
                        onChange={e => setLayout(prev => ({ ...prev, goldFarbe: e.target.value, theme: 'Custom' }))}
                        style={{width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', padding:2, background:'none'}} />
                      <span style={{fontSize:11, color:'#666', fontFamily:'monospace'}}>{layout.goldFarbe}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Logo Position */}
              <div>
                <div style={{...labelStyle}}>Logo-Position</div>
                <div style={{display:'flex', gap:6}}>
                  {(['links','mitte','rechts'] as const).map(pos => (
                    <button key={pos} onClick={() => setLayout(prev => ({ ...prev, logoPosition: pos }))}
                      style={{
                        flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                        border: layout.logoPosition === pos ? `2px solid ${layout.akzentFarbe}` : '1.5px solid #e5e0d8',
                        background: layout.logoPosition === pos ? layout.akzentFarbe + '15' : 'white',
                        color: layout.logoPosition === pos ? layout.akzentFarbe : '#888',
                      }}>
                      {pos === 'links' ? '⬅ Links' : pos === 'mitte' ? '↕ Mitte' : 'Rechts ➡'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Maße & Schriftgrößen */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              <div style={{...labelStyle, marginBottom:12}}>Maße & Schriftgrößen</div>

              <div style={{marginBottom:12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{...labelStyle, marginBottom:0}}>Seitenrand</span>
                  <span style={{fontSize:11, fontWeight:700, color:layout.akzentFarbe}}>{layout.seitenrandMm} mm</span>
                </div>
                <input type="range" min={8} max={20} step={1} value={layout.seitenrandMm}
                  onChange={e => setLayout(prev => ({ ...prev, seitenrandMm: +e.target.value }))}
                  style={{width:'100%', accentColor: layout.akzentFarbe}} />
              </div>

              <div style={{marginBottom:12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{...labelStyle, marginBottom:0}}>Akzentleiste</span>
                  <span style={{fontSize:11, fontWeight:700, color:layout.akzentFarbe}}>{layout.akzentHoeheMm} mm</span>
                </div>
                <input type="range" min={0} max={6} step={0.5} value={layout.akzentHoeheMm}
                  onChange={e => setLayout(prev => ({ ...prev, akzentHoeheMm: +e.target.value }))}
                  style={{width:'100%', accentColor: layout.akzentFarbe}} />
              </div>

              <div style={{marginBottom:12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{...labelStyle, marginBottom:0}}>Abstand (Sektionen)</span>
                  <span style={{fontSize:11, fontWeight:700, color:layout.akzentFarbe}}>{layout.abstandMm} mm</span>
                </div>
                <input type="range" min={1} max={8} step={0.5} value={layout.abstandMm}
                  onChange={e => setLayout(prev => ({ ...prev, abstandMm: +e.target.value }))}
                  style={{width:'100%', accentColor: layout.akzentFarbe}} />
              </div>

              <div style={{...labelStyle, marginTop:4}}>Schriftgrößen</div>
              {[
                { label: 'Dokumenttitel', key: 'titelSchriftPt' as const, min:14, max:28, step:1 },
                { label: 'Überschriften', key: 'ueberschriftSchriftPt' as const, min:7, max:16, step:1 },
                { label: 'Bezeichnung / Pos.', key: 'bezeichnungSchriftPt' as const, min:6, max:14, step:1 },
                { label: 'Fließtext', key: 'bodySchriftPt' as const, min:6, max:12, step:1 },
                { label: 'Firmenname', key: 'firmaSchriftPt' as const, min:8, max:16, step:1 },
                { label: 'Fußzeile (IBAN etc.)', key: 'fusszeileSchriftPt' as const, min:5, max:10, step:0.5 },
              ].map(s => (
                <div key={s.key} style={{marginBottom:8}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}>
                    <span style={{fontSize:11, color:'#888'}}>{s.label}</span>
                    <span style={{fontSize:11, fontWeight:700, color:layout.akzentFarbe}}>{layout[s.key]} pt</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={layout[s.key]}
                    onChange={e => setLayout(prev => ({ ...prev, [s.key]: +e.target.value }))}
                    style={{width:'100%', accentColor: layout.akzentFarbe}} />
                </div>
              ))}
            </div>

            {/* Schriftart hochladen */}
            <div style={{background:'white', borderRadius:12, border:'1px solid #e5e0d8', padding:20, marginBottom:16}}>
              <div style={{...labelStyle, marginBottom:10}}>Eigene Schriftart</div>
              <input ref={schriftRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:'none'}} onChange={schriftHochladen} />
              {schriftName ? (
                <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0'}}>
                  <span style={{fontSize:18}}>🔤</span>
                  <span style={{flex:1, fontSize:12, fontWeight:600, color:'#065f46'}}>{schriftName}</span>
                  <button onClick={schriftLoeschen} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:16, padding:0}}>✕</button>
                </div>
              ) : (
                <button onClick={() => schriftRef.current?.click()} disabled={schriftLaden}
                  style={{padding:'8px 14px', borderRadius:8, border:'1.5px dashed #e5e0d8', background:'#faf8f5', cursor:'pointer', fontSize:12, color:'#888', width:'100%', textAlign:'left'}}>
                  {schriftLaden ? '⏳ Wird hochgeladen...' : '+ TTF / OTF / WOFF hochladen'}
                </button>
              )}
              <div style={{fontSize:10, color:'#bbb', marginTop:4}}>Max 2MB · wird in alle PDFs eingebettet</div>
            </div>

            {/* KI Design */}
            <div style={{background:'#fdf8f0', borderRadius:10, padding:14, border:`1px solid ${GOLD}44`, marginBottom:16}}>
              <div style={{fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, color:GOLD, marginBottom:8}}>✨ KI Design Generator</div>
              <textarea
                value={kiText}
                onChange={e => setKiText(e.target.value)}
                placeholder='z.B. "modern, dunkel, minimalistisch" oder "freundlich, grün, nachhaltig"'
                style={{width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e8c98e', fontSize:12, resize:'none', outline:'none', fontFamily:'DM Sans, sans-serif', minHeight:56, background:'white', boxSizing:'border-box'}}
              />
              <button onClick={kiDesign} disabled={kiLaden || !kiText.trim()}
                style={{marginTop:8, width:'100%', padding:'9px', borderRadius:8, border:'none', background:kiLaden ? '#e5e0d8' : GOLD, color: kiLaden ? '#aaa' : '#0a0a0a', fontWeight:800, fontSize:12, cursor: kiLaden ? 'not-allowed' : 'pointer', fontFamily:'Syne, sans-serif'}}>
                {kiLaden ? '⏳ KI generiert...' : '✨ Design erstellen lassen'}
              </button>

              {/* Trennlinie */}
              <div style={{borderTop:'1px solid #e8c98e44', margin:'12px 0'}} />

              {/* Farben aus Logo */}
              {logoBase64 && (
                <button onClick={kiLogoFarben} disabled={kiLogoLaden}
                  style={{width:'100%', padding:'8px', borderRadius:8, border:`1px dashed ${GOLD}`, background: kiLogoLaden ? '#fdf8ef' : 'white', color:'#b8860b', fontWeight:700, fontSize:12, cursor: kiLogoLaden ? 'not-allowed' : 'pointer', marginBottom:8}}>
                  {kiLogoLaden ? '⏳ Analysiere Logo...' : '🎨 Farben aus Logo erkennen'}
                </button>
              )}

              {/* Design aus Bild */}
              <button onClick={() => bildAnalyseRef.current?.click()} disabled={kiBildLaden}
                style={{width:'100%', padding:'8px', borderRadius:8, border:'1px dashed #6366f1', background: kiBildLaden ? '#f0f0ff' : 'white', color:'#6366f1', fontWeight:700, fontSize:12, cursor: kiBildLaden ? 'not-allowed' : 'pointer'}}>
                {kiBildLaden ? '⏳ Analysiere Dokument...' : '📄 Design aus Bild übernehmen'}
              </button>
              <div style={{fontSize:10, color:'#bbb', marginTop:4}}>Screenshot einer Rechnung/Angebot hochladen</div>
              <input ref={bildAnalyseRef} type="file" accept="image/png,image/jpeg" style={{display:'none'}} onChange={kiBildAnalyse} />
            </div>

          </div>

          {/* ── Rechte Spalte: Große Live-Vorschau ── */}
          <div style={{flexShrink:0, position:'sticky', top:20, alignSelf:'flex-start'}}>
            <div style={{fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, marginBottom:10, color:'#1a2a3a'}}>
              📄 Live-Vorschau
            </div>
            <LiveVorschau />
            <div style={{fontSize:10, color:'#bbb', textAlign:'center', marginTop:8}}>Live-Vorschau (nicht druckgenau)</div>
            <button
              onClick={speichern}
              disabled={laden}
              style={{
                marginTop:12, width:'100%', padding:'11px', borderRadius:8, border:'none',
                background: gespeichert ? '#2d6a4f' : '#1a2a3a',
                color:'white', fontWeight:800, fontSize:13, cursor:'pointer',
                fontFamily:'Syne, sans-serif',
              }}>
              {laden ? '⏳ Speichern...' : gespeichert ? '✅ Gespeichert!' : '💾 Layout speichern'}
            </button>
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
  boxSizing:'border-box'
}
