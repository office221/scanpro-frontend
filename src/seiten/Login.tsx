import React, { useState, useEffect } from 'react'
import { authService } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate()
  const [ansicht, setAnsicht] = useState<'login' | 'register' | 'code'>('login')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [email, setEmail] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const [regDaten, setRegDaten] = useState({ vorname: '', nachname: '', email: '', passwort: '', firma: '' })
  const [loginDaten, setLoginDaten] = useState({ email: '', passwort: '' })
  const [code, setCode] = useState('')
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(true)

  const handleRegistrieren = async (e: React.FormEvent) => {
    e.preventDefault(); setLaden(true); setFehler('')
    try { await authService.registrieren(regDaten); setEmail(regDaten.email); setAnsicht('code') }
    catch (err: any) { setFehler(err.response?.data?.fehler || 'Fehler!') }
    setLaden(false)
  }

  const handleBestaetigen = async (e: React.FormEvent) => {
    e.preventDefault(); setLaden(true); setFehler('')
    try { await authService.bestaetigen(email, code); navigate('/dashboard') }
    catch (err: any) { setFehler(err.response?.data?.fehler || 'Falscher Code!') }
    setLaden(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLaden(true); setFehler('')
    try {
      await authService.login(loginDaten.email, loginDaten.passwort)
      if (!angemeldetBleiben) {
        const token = localStorage.getItem('token')
        const benutzer = localStorage.getItem('benutzer')
        localStorage.removeItem('token'); localStorage.removeItem('benutzer')
        sessionStorage.setItem('token', token || ''); sessionStorage.setItem('benutzer', benutzer || '')
      }
      onLogin(); navigate('/dashboard')
    } catch (err: any) { setFehler(err.response?.data?.fehler || 'Fehler!') }
    setLaden(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#f1f5f9',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1, color: 'rgba(255,255,255,0.35)',
    fontWeight: 700, marginBottom: 7,
  }

  const features = [
    { icon: '📋', text: 'Rechnungen & Angebote in Sekunden' },
    { icon: '⚡', text: 'Automatisches Mahnsystem — 3 Stufen' },
    { icon: '🇦🇹', text: '§6 Kleinunternehmer UStG automatisch' },
    { icon: '🚗', text: 'KM-Buch & G&V Jahresabrechnung' },
    { icon: '📸', text: 'KI Belegscan — Foto → Beleg automatisch' },
  ]

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif',
      background: '#080c14', color: '#e2e8f0', overflowY: isMobile ? 'auto' : 'hidden',
      flexDirection: isMobile ? 'column' : 'row', position: 'relative',
    }}>
      {/* Background glows */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,169,110,0.10) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── LEFT PANEL ── */}
      {!isMobile && (
        <div style={{
          width: '52%', padding: '48px 52px', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', position: 'relative', zIndex: 1,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #c8a96e, #a07030)',
              borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(200,169,110,0.35)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>BelegFix</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Kleinunternehmen · Österreich</div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0 32px' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: '#c8a96e', fontWeight: 700, marginBottom: 20 }}>
              Speziell für Kleinunternehmer
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 44, fontWeight: 800, lineHeight: 1.1, color: 'white', margin: '0 0 20px', letterSpacing: -1 }}>
              Rechnungen schreiben<br />
              in <span style={{ background: 'linear-gradient(135deg, #c8a96e, #e8c98e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2 Minuten</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 36, maxWidth: 400 }}>
              Die Buchhaltungslösung für österreichische Kleinunternehmer —
              mit §6 UStG, Mahnsystem und KI-Belegscan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 0,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {[
              { num: '30', lbl: 'Tage kostenlos' },
              { num: '14,90€', lbl: 'Pro Monat' },
              { num: '∞', lbl: 'Rechnungen' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: '18px 20px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#c8a96e' }}>{s.num}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '40px 20px 32px' : '48px 48px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Mobile logo */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, alignSelf: 'flex-start' }}>
            <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #c8a96e, #a07030)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(200,169,110,0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'white' }}>BelegFix</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Rechnungen für Österreich 🇦🇹</div>
            </div>
          </div>
        )}

        {/* Glass card */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24, padding: isMobile ? '28px 24px' : '36px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>

          {/* Error */}
          {fehler && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span> {fehler}
            </div>
          )}

          {/* REGISTER */}
          {ansicht === 'register' && (
            <form onSubmit={handleRegistrieren}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: 50, padding: '5px 14px', fontSize: 12, color: '#c8a96e', fontWeight: 600, marginBottom: 16 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                  30 Tage kostenlos — keine Kreditkarte
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>Konto erstellen</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Bereits registriert? <span style={{ color: '#c8a96e', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setAnsicht('login'); setFehler('') }}>Anmelden →</span></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Vorname</label>
                  <input style={inputStyle} placeholder="Max" required value={regDaten.vorname} onChange={e => setRegDaten({...regDaten, vorname: e.target.value})}
                    onFocus={e => { e.target.style.borderColor = 'rgba(200,169,110,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Nachname</label>
                  <input style={inputStyle} placeholder="Mustermann" required value={regDaten.nachname} onChange={e => setRegDaten({...regDaten, nachname: e.target.value})}
                    onFocus={e => { e.target.style.borderColor = 'rgba(200,169,110,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>

              {[
                { lbl: 'Email', type: 'email', ph: 'max@mustermann.at', key: 'email' },
                { lbl: 'Firmenname (optional)', type: 'text', ph: 'Mustermann GmbH', key: 'firma' },
                { lbl: 'Passwort', type: 'password', ph: 'Mindestens 8 Zeichen', key: 'passwort' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{f.lbl}</label>
                  <input style={inputStyle} type={f.type} placeholder={f.ph} required={f.key !== 'firma'}
                    value={(regDaten as any)[f.key]} onChange={e => setRegDaten({...regDaten, [f.key]: e.target.value})}
                    onFocus={e => { e.target.style.borderColor = 'rgba(200,169,110,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}

              <button type="submit" disabled={laden} style={{
                width: '100%', padding: '14px', marginTop: 8,
                background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                border: 'none', borderRadius: 12, color: '#0a0a0a',
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                cursor: laden ? 'default' : 'pointer',
                boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
                transition: 'all 0.2s',
              }}>
                {laden ? '⏳  Wird gesendet...' : '🚀  Kostenlos starten'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
                ✓ Keine Kreditkarte &nbsp;·&nbsp; ✓ Jederzeit kündbar &nbsp;·&nbsp; ✓ DSGVO konform
              </div>
            </form>
          )}

          {/* CODE */}
          {ansicht === 'code' && (
            <form onSubmit={handleBestaetigen}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 10 }}>Code eingeben</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Wir haben einen Code an<br/>
                  <span style={{ color: '#c8a96e', fontWeight: 600 }}>{email}</span> gesendet.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>6-stelliger Code</label>
                <input style={{ ...inputStyle, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 12, color: '#c8a96e' }}
                  placeholder="000000" maxLength={6} required value={code} onChange={e => setCode(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,169,110,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)' }} />
              </div>

              <button type="submit" disabled={laden} style={{
                width: '100%', padding: '14px',
                background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                border: 'none', borderRadius: 12, color: '#0a0a0a',
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                cursor: laden ? 'default' : 'pointer',
                boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
              }}>
                {laden ? '⏳  Wird geprüft...' : '✅  Bestätigen & starten'}
              </button>
            </form>
          )}

          {/* LOGIN */}
          {ansicht === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>Willkommen zurück</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Noch kein Konto? <span style={{ color: '#c8a96e', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setAnsicht('register'); setFehler('') }}>Kostenlos registrieren →</span></div>
              </div>

              {[
                { lbl: 'Email', type: 'email', ph: 'max@mustermann.at', key: 'email' },
                { lbl: 'Passwort', type: 'password', ph: 'Dein Passwort', key: 'passwort' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{f.lbl}</label>
                  <input style={inputStyle} type={f.type} placeholder={f.ph} required
                    value={(loginDaten as any)[f.key]} onChange={e => setLoginDaten({...loginDaten, [f.key]: e.target.value})}
                    onFocus={e => { e.target.style.borderColor = 'rgba(200,169,110,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div onClick={() => setAngemeldetBleiben(!angemeldetBleiben)} style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s',
                  border: `2px solid ${angemeldetBleiben ? '#c8a96e' : 'rgba(255,255,255,0.2)'}`,
                  background: angemeldetBleiben ? 'rgba(200,169,110,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {angemeldetBleiben && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#c8a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }} onClick={() => setAngemeldetBleiben(!angemeldetBleiben)}>
                  Angemeldet bleiben
                </span>
              </div>

              <button type="submit" disabled={laden} style={{
                width: '100%', padding: '14px',
                background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                border: 'none', borderRadius: 12, color: '#0a0a0a',
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                cursor: laden ? 'default' : 'pointer',
                boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
                transition: 'all 0.2s',
              }}>
                {laden ? '⏳  Wird angemeldet...' : '🔐  Anmelden'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, color: 'rgba(255,255,255,0.2)',
          }}>
            🔒 SSL verschlüsselt &nbsp;·&nbsp; DSGVO konform &nbsp;·&nbsp; 🇦🇹 Made in Austria
          </div>
        </div>
      </div>
    </div>
  )
}
