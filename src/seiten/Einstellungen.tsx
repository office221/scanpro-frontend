import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'

export default function Einstellungen() {
  const [laden, setLaden] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

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

  // Passwort ändern
  const [pwAktuell, setPwAktuell]     = useState('')
  const [pwNeu, setPwNeu]             = useState('')
  const [pwBestaetigt, setPwBestaetigt] = useState('')
  const [pwLaden, setPwLaden]         = useState(false)
  const [pwNachricht, setPwNachricht] = useState<{ text: string; ok: boolean } | null>(null)
  const [pwSichtbar, setPwSichtbar]   = useState({ aktuell: false, neu: false, best: false })

  useEffect(() => {
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
    }).catch(() => {})
  }, [])

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
        mahnungFrist1, mahnungFrist2, mahnungFrist3, km_satz: kmSatz
      })
      setGespeichert(true)
      setTimeout(() => setGespeichert(false), 3000)
    } catch (fehler: any) {
      alert('Fehler: ' + fehler.message)
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

  return (
    <div style={{maxWidth:700, margin:'0 auto', padding:'0 4px'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', marginBottom:24}}>
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
                  // Beim Verlassen: sicherstellen dass ein gültiger Wert gesetzt ist
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