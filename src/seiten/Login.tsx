import React, { useState, useEffect, useRef } from 'react'
import { authService } from '../services/api'
import { useNavigate } from 'react-router-dom'

// Animated floating particle
function Particle({ delay, x, y, size, dur }: { delay: number; x: number; y: number; size: number; dur: number }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(200,169,110,0.6), transparent)',
      animation: `floatUp ${dur}s ${delay}s ease-in-out infinite`,
      pointerEvents: 'none', zIndex: 0,
    }} />
  )
}

// Animated receipt that "types" itself
function AnimatedReceipt() {
  const lines = [
    { w: '60%', gold: true, h: 10 },
    { w: '40%', gold: false, h: 6 },
    { w: '100%', gold: false, h: 1, sep: true },
    { w: '70%', gold: false, h: 6 },
    { w: '55%', gold: false, h: 6 },
    { w: '80%', gold: false, h: 6 },
    { w: '100%', gold: false, h: 1, sep: true },
    { w: '45%', gold: false, h: 6 },
    { w: '35%', gold: true, h: 8 },
  ]

  return (
    <div style={{
      position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%) rotate(-2deg)',
      width: 180, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'receiptFloat 6s ease-in-out infinite',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{
          width: l.w, height: l.sep ? 1 : l.h, borderRadius: l.sep ? 0 : 3,
          background: l.sep ? 'rgba(255,255,255,0.06)' : l.gold ? 'linear-gradient(90deg, rgba(200,169,110,0.5), rgba(200,169,110,0.1))' : 'rgba(255,255,255,0.06)',
          animation: `typeIn 0.4s ${0.8 + i * 0.15}s both`,
          opacity: 0,
        }} />
      ))}
      {/* Stamp */}
      <div style={{
        position: 'absolute', right: 12, bottom: 16,
        width: 44, height: 44, borderRadius: '50%',
        border: '2px solid rgba(74,222,128,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'stampIn 0.5s 2.5s both',
        opacity: 0, transform: 'scale(0) rotate(-20deg)',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  )
}

export default function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate()
  const [ansicht, setAnsicht] = useState<'login' | 'register' | 'code'>('login')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [email, setEmail] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    requestAnimationFrame(() => setReady(true))
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
    transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1, color: 'rgba(255,255,255,0.35)',
    fontWeight: 700, marginBottom: 7,
  }

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(200,169,110,0.5)'
    e.target.style.background = 'rgba(255,255,255,0.06)'
    e.target.style.boxShadow = '0 0 20px rgba(200,169,110,0.08)'
  }
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
    e.target.style.background = 'rgba(255,255,255,0.04)'
    e.target.style.boxShadow = 'none'
  }

  const features = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>, text: 'Rechnungen & Angebote in Sekunden' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, text: 'Automatisches Mahnsystem — 3 Stufen' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: '§6 Kleinunternehmer UStG automatisch' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, text: 'KM-Buch & G&V Jahresabrechnung' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>, text: 'KI Belegscan — Foto wird zum Beleg' },
  ]

  // Particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: 2 + Math.random() * 4, delay: Math.random() * 8,
    dur: 8 + Math.random() * 12,
  }))

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-40px) scale(1.5); opacity: 0.7; }
        }
        @keyframes typeIn {
          from { opacity: 0; transform: scaleX(0); transform-origin: left; }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes stampIn {
          from { opacity: 0; transform: scale(3) rotate(-30deg); }
          to { opacity: 1; transform: scale(1) rotate(-5deg); }
        }
        @keyframes receiptFloat {
          0%, 100% { transform: translateY(-50%) rotate(-2deg); }
          50% { transform: translateY(calc(-50% - 8px)) rotate(-1deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 6px 20px rgba(200,169,110,0.35); }
          50% { box-shadow: 0 6px 40px rgba(200,169,110,0.55), 0 0 60px rgba(200,169,110,0.15); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(200,169,110,0.15); }
          50% { border-color: rgba(200,169,110,0.35); }
        }
        @keyframes counterUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-input:focus {
          border-color: rgba(200,169,110,0.5) !important;
          background: rgba(255,255,255,0.06) !important;
          box-shadow: 0 0 20px rgba(200,169,110,0.08) !important;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(200,169,110,0.45) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .feature-row:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(200,169,110,0.15) !important;
          transform: translateX(4px);
        }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif',
        background: '#060a12', color: '#e2e8f0', overflowY: isMobile ? 'auto' : 'hidden',
        flexDirection: isMobile ? 'column' : 'row', position: 'relative',
      }}>

        {/* Animated gradient mesh background */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(200,169,110,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 80% at 80% 60%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 50% 0%, rgba(200,169,110,0.04) 0%, transparent 50%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 20s ease infinite',
        }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Floating particles */}
        {!isMobile && particles.map((p, i) => (
          <Particle key={i} x={p.x} y={p.y} size={p.size} delay={p.delay} dur={p.dur} />
        ))}

        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div style={{
            width: '52%', padding: '48px 52px', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', position: 'relative', zIndex: 1,
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Logo with glow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              animation: ready ? 'fadeSlideRight 0.8s 0.1s both' : 'none',
            }}>
              <div style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #c8a96e, #a07030)',
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'glowPulse 3s ease-in-out infinite',
                position: 'relative',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                </svg>
              </div>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
                  background: 'linear-gradient(135deg, #fff 30%, #c8a96e)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>BelegFix</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Kleinunternehmen · Österreich</div>
              </div>
            </div>

            {/* Center content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0 32px', position: 'relative' }}>
              <div style={{
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, marginBottom: 20,
                background: 'linear-gradient(90deg, #c8a96e, #e8c98e, #c8a96e)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: ready ? 'shimmer 3s linear infinite, fadeSlideUp 0.7s 0.2s both' : 'none',
              }}>
                Speziell für Kleinunternehmer
              </div>
              <h1 style={{
                fontFamily: 'Syne, sans-serif', fontSize: 46, fontWeight: 800, lineHeight: 1.08,
                color: 'white', margin: '0 0 20px', letterSpacing: -1.5,
                animation: ready ? 'fadeSlideUp 0.8s 0.35s both' : 'none',
              }}>
                Rechnungen<br />schreiben in<br />
                <span style={{
                  background: 'linear-gradient(135deg, #c8a96e 0%, #e8c98e 40%, #c8a96e 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 4s linear infinite',
                }}>2 Minuten</span>
              </h1>
              <p style={{
                fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 36, maxWidth: 380,
                animation: ready ? 'fadeSlideUp 0.8s 0.5s both' : 'none',
              }}>
                Die Buchhaltungslösung für österreichische Kleinunternehmer —
                mit §6 UStG, Mahnsystem und KI-Belegscan.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {features.map((f, i) => (
                  <div key={i} className="feature-row" style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12, transition: 'all 0.3s ease',
                    cursor: 'default',
                    animation: ready ? `fadeSlideRight 0.6s ${0.6 + i * 0.1}s both` : 'none',
                  }}>
                    <span style={{ flexShrink: 0, display: 'flex' }}>{f.icon}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Animated receipt */}
              <AnimatedReceipt />
            </div>

            {/* Stats with counter animation */}
            <div style={{
              display: 'flex', gap: 0,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, overflow: 'hidden',
              animation: ready ? 'fadeSlideUp 0.8s 1.2s both, borderGlow 4s 2s ease-in-out infinite' : 'none',
            }}>
              {[
                { num: '30', lbl: 'Tage kostenlos' },
                { num: '14,90€', lbl: 'Pro Monat' },
                { num: '∞', lbl: 'Rechnungen' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: '18px 20px', textAlign: 'center',
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800,
                    background: 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    animation: ready ? `counterUp 0.5s ${1.4 + i * 0.15}s both` : 'none',
                  }}>{s.num}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{s.lbl}</div>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, alignSelf: 'flex-start',
              animation: ready ? 'fadeSlideRight 0.6s 0.1s both' : 'none',
            }}>
              <div style={{
                width: 44, height: 44, background: 'linear-gradient(135deg, #c8a96e, #a07030)',
                borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'white' }}>BelegFix</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Rechnungen für Österreich</div>
              </div>
            </div>
          )}

          {/* Glass card with dramatic entrance */}
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, padding: isMobile ? '28px 24px' : '36px 36px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            animation: ready ? 'cardReveal 0.9s 0.15s both' : 'none',
          }}>

            {/* Error */}
            {fehler && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'fadeSlideUp 0.3s both',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {fehler}
              </div>
            )}

            {/* REGISTER */}
            {ansicht === 'register' && (
              <form onSubmit={handleRegistrieren}>
                <div style={{ marginBottom: 24, animation: 'fadeSlideUp 0.5s 0.3s both' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)',
                    borderRadius: 50, padding: '5px 14px', fontSize: 12, color: '#c8a96e', fontWeight: 600, marginBottom: 16,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'glowPulse 2s infinite' }}></span>
                    30 Tage kostenlos — keine Kreditkarte
                  </div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>Konto erstellen</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Bereits registriert? <span style={{ color: '#c8a96e', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }} onClick={() => { setAnsicht('login'); setFehler('') }}>Anmelden →</span></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14, animation: 'fadeSlideUp 0.5s 0.4s both' }}>
                  <div>
                    <label style={labelStyle}>Vorname</label>
                    <input className="login-input" style={inputStyle} placeholder="Max" required value={regDaten.vorname} onChange={e => setRegDaten({...regDaten, vorname: e.target.value})} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nachname</label>
                    <input className="login-input" style={inputStyle} placeholder="Mustermann" required value={regDaten.nachname} onChange={e => setRegDaten({...regDaten, nachname: e.target.value})} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>

                {[
                  { lbl: 'Email', type: 'email', ph: 'max@mustermann.at', key: 'email' },
                  { lbl: 'Firmenname (optional)', type: 'text', ph: 'Mustermann GmbH', key: 'firma' },
                  { lbl: 'Passwort', type: 'password', ph: 'Mindestens 8 Zeichen', key: 'passwort' },
                ].map((f, i) => (
                  <div key={f.key} style={{ marginBottom: 14, animation: `fadeSlideUp 0.5s ${0.5 + i * 0.08}s both` }}>
                    <label style={labelStyle}>{f.lbl}</label>
                    <input className="login-input" style={inputStyle} type={f.type} placeholder={f.ph} required={f.key !== 'firma'}
                      value={(regDaten as any)[f.key]} onChange={e => setRegDaten({...regDaten, [f.key]: e.target.value})} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                ))}

                <button type="submit" disabled={laden} className="login-btn" style={{
                  width: '100%', padding: '14px', marginTop: 8,
                  background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                  border: 'none', borderRadius: 12, color: '#0a0a0a',
                  fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                  cursor: laden ? 'default' : 'pointer',
                  boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
                  transition: 'all 0.3s',
                  animation: 'fadeSlideUp 0.5s 0.8s both',
                }}>
                  {laden ? 'Wird gesendet...' : 'Kostenlos starten'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16, animation: 'fadeSlideUp 0.5s 0.9s both' }}>
                  Keine Kreditkarte · Jederzeit kündbar · DSGVO konform
                </div>
              </form>
            )}

            {/* CODE */}
            {ansicht === 'code' && (
              <form onSubmit={handleBestaetigen}>
                <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeSlideUp 0.6s 0.2s both' }}>
                  <div style={{ marginBottom: 16 }}>
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'glowPulse 2s infinite' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 10 }}>Code eingeben</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    Wir haben einen Code an<br/>
                    <span style={{ color: '#c8a96e', fontWeight: 600 }}>{email}</span> gesendet.
                  </div>
                </div>

                <div style={{ marginBottom: 20, animation: 'fadeSlideUp 0.5s 0.4s both' }}>
                  <label style={labelStyle}>6-stelliger Code</label>
                  <input className="login-input" style={{ ...inputStyle, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 12, color: '#c8a96e' }}
                    placeholder="000000" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} onFocus={focusInput} onBlur={blurInput} />
                </div>

                <button type="submit" disabled={laden} className="login-btn" style={{
                  width: '100%', padding: '14px',
                  background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                  border: 'none', borderRadius: 12, color: '#0a0a0a',
                  fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                  cursor: laden ? 'default' : 'pointer',
                  boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
                  transition: 'all 0.3s', animation: 'fadeSlideUp 0.5s 0.5s both',
                }}>
                  {laden ? 'Wird geprüft...' : 'Bestätigen & starten'}
                </button>
              </form>
            )}

            {/* LOGIN */}
            {ansicht === 'login' && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 28, animation: ready ? 'fadeSlideUp 0.6s 0.3s both' : 'none' }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 4,
                    background: 'linear-gradient(135deg, #fff 40%, #c8a96e)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>Willkommen zurück</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Noch kein Konto? <span style={{ color: '#c8a96e', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }} onClick={() => { setAnsicht('register'); setFehler('') }}>Kostenlos registrieren →</span></div>
                </div>

                {[
                  { lbl: 'Email', type: 'email', ph: 'max@mustermann.at', key: 'email' },
                  { lbl: 'Passwort', type: 'password', ph: 'Dein Passwort', key: 'passwort' },
                ].map((f, i) => (
                  <div key={f.key} style={{ marginBottom: 16, animation: ready ? `fadeSlideUp 0.5s ${0.45 + i * 0.1}s both` : 'none' }}>
                    <label style={labelStyle}>{f.lbl}</label>
                    <input className="login-input" style={inputStyle} type={f.type} placeholder={f.ph} required
                      value={(loginDaten as any)[f.key]} onChange={e => setLoginDaten({...loginDaten, [f.key]: e.target.value})} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, animation: ready ? 'fadeSlideUp 0.5s 0.65s both' : 'none' }}>
                  <div onClick={() => setAngemeldetBleiben(!angemeldetBleiben)} style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', transition: 'all 0.3s',
                    border: `2px solid ${angemeldetBleiben ? '#c8a96e' : 'rgba(255,255,255,0.2)'}`,
                    background: angemeldetBleiben ? 'rgba(200,169,110,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {angemeldetBleiben && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#c8a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }} onClick={() => setAngemeldetBleiben(!angemeldetBleiben)}>
                    Angemeldet bleiben
                  </span>
                </div>

                <button type="submit" disabled={laden} className="login-btn" style={{
                  width: '100%', padding: '15px',
                  background: laden ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #e8c98e)',
                  border: 'none', borderRadius: 12, color: '#0a0a0a',
                  fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                  cursor: laden ? 'default' : 'pointer',
                  boxShadow: laden ? 'none' : '0 6px 24px rgba(200,169,110,0.35)',
                  transition: 'all 0.3s',
                  animation: ready ? 'fadeSlideUp 0.5s 0.75s both' : 'none',
                }}>
                  {laden ? 'Wird angemeldet...' : 'Anmelden'}
                </button>
              </form>
            )}

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: 11, color: 'rgba(255,255,255,0.18)',
              animation: ready ? 'fadeSlideUp 0.5s 0.9s both' : 'none',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              &nbsp;SSL verschlüsselt &nbsp;·&nbsp; DSGVO konform &nbsp;·&nbsp; Made in Austria
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
