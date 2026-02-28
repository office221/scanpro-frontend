import React, { useState } from 'react'
import { authService } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Login({ onLogin }: { onLogin: () => void })  {
  const navigate = useNavigate()
  const [ansicht, setAnsicht] = useState<'login' | 'register' | 'code'>('register')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [email, setEmail] = useState('')

  // Registrierungs-Formular
  const [regDaten, setRegDaten] = useState({
    vorname: '', nachname: '', email: '', passwort: '', firma: ''
  })

  // Login-Formular
  const [loginDaten, setLoginDaten] = useState({
    email: '', passwort: ''
  })

  // Code-Felder
  const [code, setCode] = useState('')

  // Registrieren
  const handleRegistrieren = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaden(true)
    setFehler('')
    try {
      await authService.registrieren(regDaten)
      setEmail(regDaten.email)
      setAnsicht('code')
    } catch (err: any) {
      setFehler(err.response?.data?.fehler || 'Fehler!')
    }
    setLaden(false)
  }

  // Code bestätigen
  const handleBestaetigen = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaden(true)
    setFehler('')
    try {
      await authService.bestaetigen(email, code)
      navigate('/dashboard')
    } catch (err: any) {
      setFehler(err.response?.data?.fehler || 'Falscher Code!')
    }
    setLaden(false)
  }

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaden(true)
    setFehler('')
    try {
      await authService.login(loginDaten.email, loginDaten.passwort)
      onLogin()
      navigate('/dashboard')
    } catch (err: any) {
      setFehler(err.response?.data?.fehler || 'Fehler!')
    }
    setLaden(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.logo}>
          <div style={styles.logoBox}>📡</div>
          <div>
            <div style={styles.logoText}>ScanPro</div>
            <div style={styles.logoSub}>Rechnungen für Österreich 🇦🇹</div>
          </div>
        </div>

        <div style={styles.leftContent}>
          <div style={styles.tagline}>Speziell für Kleinunternehmer</div>
          <h1 style={styles.headline}>
            Rechnungen schreiben<br />
            in <span style={styles.gold}>2 Minuten</span>
          </h1>
          <p style={styles.subline}>
            Die einzige Buchhaltungslösung mit §6 UStG,
            Mahnsystem und KM-Buch. Entwickelt in Österreich.
          </p>

          <div style={styles.features}>
            {[
              '📋 Rechnungen & Angebote mit einem Klick',
              '⚠️ Automatisches Mahnsystem 3 Stufen',
              '§6 Kleinunternehmer UStG automatisch',
              '🚗 KM-Buch & G&V Jahresabrechnung',
              '📸 KI Belegscan — Foto → automatisch',
            ].map((f, i) => (
              <div key={i} style={styles.feat}>{f}</div>
            ))}
          </div>
        </div>

        <div style={styles.stats}>
          <div><div style={styles.statNum}>30</div><div style={styles.statLbl}>Tage kostenlos</div></div>
          <div style={styles.divider}></div>
          <div><div style={styles.statNum}>14,90€</div><div style={styles.statLbl}>Pro Monat</div></div>
          <div style={styles.divider}></div>
          <div><div style={styles.statNum}>∞</div><div style={styles.statLbl}>Rechnungen</div></div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formWrap}>

          {/* Fehler anzeigen */}
          {fehler && <div style={styles.errorBox}>{fehler}</div>}

          {/* REGISTRIERUNG */}
          {ansicht === 'register' && (
            <form onSubmit={handleRegistrieren}>
              <div style={styles.trialBadge}>
                🟢 30 Tage kostenlos — keine Kreditkarte
              </div>
              <div style={styles.formTitle}>Konto erstellen</div>

              <div style={styles.tabs}>
                <button type="button" style={{...styles.tab, ...styles.tabActive}}>Registrieren</button>
                <button type="button" style={styles.tab} onClick={() => setAnsicht('login')}>Anmelden</button>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Vorname</label>
                  <input style={styles.input} placeholder="Max" required
                    value={regDaten.vorname}
                    onChange={e => setRegDaten({...regDaten, vorname: e.target.value})} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Nachname</label>
                  <input style={styles.input} placeholder="Mustermann" required
                    value={regDaten.nachname}
                    onChange={e => setRegDaten({...regDaten, nachname: e.target.value})} />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" placeholder="max@mustermann.at" required
                  value={regDaten.email}
                  onChange={e => setRegDaten({...regDaten, email: e.target.value})} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Firmenname (optional)</label>
                <input style={styles.input} placeholder="Mustermann GmbH"
                  value={regDaten.firma}
                  onChange={e => setRegDaten({...regDaten, firma: e.target.value})} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Passwort</label>
                <input style={styles.input} type="password" placeholder="Mindestens 8 Zeichen" required
                  value={regDaten.passwort}
                  onChange={e => setRegDaten({...regDaten, passwort: e.target.value})} />
              </div>

              <button style={styles.submitBtn} type="submit" disabled={laden}>
                {laden ? '⏳ Wird gesendet...' : '🚀 Kostenlos starten — 30 Tage gratis'}
              </button>

              <div style={styles.trialInfo}>
                ✓ Keine Kreditkarte &nbsp; ✓ Jederzeit kündbar &nbsp; ✓ DSGVO konform
              </div>
            </form>
          )}

          {/* CODE BESTÄTIGUNG */}
          {ansicht === 'code' && (
            <form onSubmit={handleBestaetigen}>
              <div style={{textAlign:'center', marginBottom: 24}}>
                <div style={{fontSize: 48}}>📧</div>
                <div style={styles.formTitle}>Code eingeben</div>
                <p style={styles.subline}>
                  Wir haben einen Code an<br/>
                  <strong style={{color: '#c8a96e'}}>{email}</strong> gesendet.
                </p>
                <p style={{fontSize: 12, color: '#888', marginTop: 8}}>
                  ⚠️ Schau auch im Terminal nach dem Code!
                </p>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>6-stelliger Code</label>
                <input style={{...styles.input, textAlign:'center', fontSize: 24, letterSpacing: 8}}
                  placeholder="000000" maxLength={6} required
                  value={code}
                  onChange={e => setCode(e.target.value)} />
              </div>

              <button style={styles.submitBtn} type="submit" disabled={laden}>
                {laden ? '⏳ Wird geprüft...' : '✅ Bestätigen & starten'}
              </button>
            </form>
          )}

          {/* LOGIN */}
          {ansicht === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={styles.formTitle}>Willkommen zurück</div>

              <div style={styles.tabs}>
                <button type="button" style={styles.tab} onClick={() => setAnsicht('register')}>Registrieren</button>
                <button type="button" style={{...styles.tab, ...styles.tabActive}}>Anmelden</button>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" placeholder="max@mustermann.at" required
                  value={loginDaten.email}
                  onChange={e => setLoginDaten({...loginDaten, email: e.target.value})} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Passwort</label>
                <input style={styles.input} type="password" placeholder="Dein Passwort" required
                  value={loginDaten.passwort}
                  onChange={e => setLoginDaten({...loginDaten, passwort: e.target.value})} />
              </div>

              <button style={styles.submitBtn} type="submit" disabled={laden}>
                {laden ? '⏳ Wird angemeldet...' : '🔐 Anmelden'}
              </button>
            </form>
          )}

          <div style={styles.security}>
            🔒 SSL verschlüsselt · DSGVO konform · Server in Deutschland
          </div>
        </div>
      </div>
    </div>
  )
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: { display:'flex', height:'100vh', fontFamily:'DM Sans, sans-serif', background:'#0a0a0a', color:'#e8e8e8' },
  left: { width:'55%', padding:'40px', display:'flex', flexDirection:'column', justifyContent:'space-between', borderRight:'1px solid #222' },
  logo: { display:'flex', alignItems:'center', gap:12 },
  logoBox: { width:40, height:40, background:'#c8a96e', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
  logoText: { fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:'white' },
  logoSub: { fontSize:11, color:'#555' },
  leftContent: { flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 0' },
  tagline: { fontSize:11, textTransform:'uppercase', letterSpacing:2, color:'#c8a96e', fontWeight:600, marginBottom:20 },
  headline: { fontFamily:'Syne, sans-serif', fontSize:42, fontWeight:800, lineHeight:1.1, color:'white', marginBottom:20 },
  gold: { color:'#c8a96e' },
  subline: { fontSize:14, color:'#888', lineHeight:1.6, marginBottom:32 },
  features: { display:'flex', flexDirection:'column', gap:10 },
  feat: { fontSize:13, color:'#999', padding:'8px 12px', background:'rgba(200,169,110,0.05)', borderRadius:8, border:'1px solid rgba(200,169,110,0.1)' },
  stats: { display:'flex', gap:32, alignItems:'center' },
  statNum: { fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:'#c8a96e' },
  statLbl: { fontSize:11, color:'#555', marginTop:2 },
  divider: { width:1, height:40, background:'#222' },
  right: { width:'45%', display:'flex', alignItems:'center', justifyContent:'center', padding:40 },
  formWrap: { width:'100%', maxWidth:380 },
  trialBadge: { display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:50, padding:'6px 16px', fontSize:12, color:'#c8a96e', fontWeight:600, marginBottom:24 },
  formTitle: { fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:'white', marginBottom:20 },
  tabs: { display:'flex', background:'#1a1a1a', borderRadius:10, padding:4, marginBottom:20, border:'1px solid #222' },
  tab: { flex:1, padding:'8px', borderRadius:7, border:'none', background:'transparent', color:'#666', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:500, cursor:'pointer' },
  tabActive: { background:'#0a0a0a', color:'white' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  field: { marginBottom:14 },
  label: { display:'block', fontSize:11, textTransform:'uppercase', letterSpacing:0.8, color:'#666', fontWeight:600, marginBottom:6 },
  input: { width:'100%', padding:'11px 14px', background:'#1a1a1a', border:'1px solid #333', borderRadius:8, color:'#e8e8e8', fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none' },
  submitBtn: { width:'100%', padding:13, background:'linear-gradient(135deg, #c8a96e, #e8c98e)', border:'none', borderRadius:10, color:'#0a0a0a', fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:6 },
  trialInfo: { textAlign:'center', fontSize:11, color:'#555', marginTop:12 },
  errorBox: { background:'rgba(192,57,43,0.2)', border:'1px solid #c0392b', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#ff6b6b', marginBottom:16 },
  security: { display:'flex', alignItems:'center', gap:8, marginTop:20, padding:'10px 14px', background:'rgba(200,169,110,0.05)', border:'1px solid rgba(200,169,110,0.1)', borderRadius:8, fontSize:11, color:'#666' },
}