import React, { useState, useEffect } from 'react'
import { authService } from '../services/api'
import api from '../services/api'
import Kunden from './Kunden'
import Rechnungen from './Rechnungen'
import Angebote from './Angebote'
import Einstellungen from './Einstellungen'

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const benutzer = JSON.parse(localStorage.getItem('benutzer') || '{}')
  const [aktivNav, setAktivNav] = useState('Dashboard')
  const [darkMode, setDarkMode] = useState(false)

  // Echte Daten
  const [stats, setStats] = useState({
    kunden: 0,
    rechnungen: 0,
    angebote: 0,
    offenGesamt: 0,
    umsatzJahr: 0,
    ueberfaellig: 0,
  })
  const [letzteRechnungen, setLetzteRechnungen] = useState<any[]>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [alleKundenDaten, setAlleKundenDaten] = useState<any[]>([])
  const [alleRechnungenDaten, setAlleRechnungenDaten] = useState<any[]>([])
  const [ueberfaelligeListe, setUeberfaelligeListe] = useState<any[]>([])
  const [sucheOffen, setSucheOffen] = useState(false)
  const [sucheText, setSucheText] = useState('')
  const [glockeOffen, setGlockeOffen] = useState(false)
  const sucheRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    ladeDaten()
  }, [])

  const ladeDaten = async () => {
    try {
      const [kundenRes, rechnungenRes] = await Promise.all([
        api.get('/kunden'),
        api.get('/rechnungen')
      ])

      const alleKunden = kundenRes.data
      const alleRechnungen = rechnungenRes.data

      const rechnungen = alleRechnungen.filter((r: any) => r.typ === 'Rechnung')
      const angebote = alleRechnungen.filter((r: any) => r.typ === 'Angebot')
      const heute = new Date()

      // Umsatz berechnen (vereinfacht — Summe aller bezahlten)
      const ueberfaellig = rechnungen.filter((r: any) =>
        r.faelligBis && new Date(r.faelligBis) < heute && r.status !== 'Bezahlt'
      )

      setStats({
        kunden: alleKunden.length,
        rechnungen: rechnungen.length,
        angebote: angebote.length,
        offenGesamt: rechnungen.filter((r: any) => r.status !== 'Bezahlt').length,
        umsatzJahr: 0,
        ueberfaellig: ueberfaellig.length,
      })

      setLetzteRechnungen(alleRechnungen.slice(0, 5))
      setKunden(alleKunden.slice(0, 5))
      setAlleKundenDaten(alleKunden)
      setAlleRechnungenDaten(alleRechnungen)
      setUeberfaelligeListe(ueberfaellig)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSucheOffen(true)
        setGlockeOffen(false)
      }
      if (e.key === 'Escape') {
        setSucheOffen(false)
        setSucheText('')
        setGlockeOffen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (sucheOffen && sucheRef.current) sucheRef.current.focus()
  }, [sucheOffen])

  const suchErgebnisse = sucheText.trim().length >= 1 ? [
    ...alleKundenDaten.filter(k =>
      `${k.vorname} ${k.nachname} ${k.firma || ''} ${k.kundennummer || ''}`.toLowerCase().includes(sucheText.toLowerCase())
    ).slice(0, 4).map(k => ({
      typ: 'Kunde', icon: '👥',
      label: `${k.vorname} ${k.nachname}`,
      sub: k.firma || k.kundennummer || '',
      nav: 'Kunden'
    })),
    ...alleRechnungenDaten.filter(r =>
      `${r.nummer} ${r.status || ''}`.toLowerCase().includes(sucheText.toLowerCase())
    ).slice(0, 4).map(r => ({
      typ: r.typ, icon: r.typ === 'Angebot' ? '📄' : '📋',
      label: r.nummer,
      sub: `${r.status} · € ${r.gesamt ? Number(r.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}`,
      nav: r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen'
    }))
  ] : []

  const d = darkMode ? dark : light

  return (
    <div style={{...styles.container, background: d.bg, color: d.text}}>

      {/* SIDEBAR */}
      <div style={{...styles.sidebar, background: d.sidebar}}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>📡</div>
          <div>
            <div style={styles.logoName}>ScanPro</div>
            <div style={{...styles.logoSub, color: d.muted}}>Kleinunternehmen · AT</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {[
            { gruppe: 'Übersicht', items: [{ icon: '📊', name: 'Dashboard' }] },
            { gruppe: 'Dokumente', items: [
              { icon: '📄', name: 'Angebote', badge: stats.angebote > 0 ? String(stats.angebote) : null },
              { icon: '📋', name: 'Rechnungen', badge: stats.ueberfaellig > 0 ? `${stats.ueberfaellig}!` : stats.rechnungen > 0 ? String(stats.rechnungen) : null, rot: stats.ueberfaellig > 0 },
            ]},
            { gruppe: 'Stammdaten', items: [
              { icon: '👥', name: 'Kunden', badge: stats.kunden > 0 ? String(stats.kunden) : null },
              { icon: '📚', name: 'Vorlagen' },
            ]},
            { gruppe: 'Buchhaltung', items: [
              { icon: '📊', name: 'G&V Abrechnung' },
              { icon: '🚗', name: 'KM-Buch' },
              { icon: '📸', name: 'Belegscanner', ki: true },
            ]},
            { gruppe: 'System', items: [
              { icon: '⚙️', name: 'Einstellungen' },
            ]},
          ].map((gruppe) => (
            <div key={gruppe.gruppe}>
              <div style={{...styles.navLabel, color: d.navLabel}}>{gruppe.gruppe}</div>
              {gruppe.items.map((item: any) => (
                <div key={item.name}
                  style={{...styles.navItem, background: aktivNav === item.name ? d.navAkt : 'transparent', color: aktivNav === item.name ? 'white' : d.navText}}
                  onClick={() => setAktivNav(item.name)}>
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navName}>{item.name}</span>
                  {item.ki && <span style={styles.kiBadge}>KI</span>}
                  {item.badge && (
                    <span style={{...styles.navBadge, background: item.rot ? '#c0392b' : d.badgeGray, color: item.rot ? 'white' : d.muted}}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div style={{...styles.userCard, borderTop: `1px solid ${d.border}`}}>
          <div style={styles.userAv}>{benutzer.vorname?.[0]}{benutzer.nachname?.[0]}</div>
          <div>
            <div style={{...styles.userName, color: d.text}}>{benutzer.vorname} {benutzer.nachname}</div>
            <div style={{...styles.userRole, color: d.muted}}>👑 Administrator</div>
          </div>
          <button onClick={() => { authService.logout(); onLogout(); }}
            style={{...styles.logoutBtn, color: d.muted}} title="Abmelden">🚪</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <div style={{...styles.topbar, background: d.card, borderBottom: `1px solid ${d.border}`}}>
          <div style={{...styles.topbarTitle, color: d.text}}>
            {aktivNav === 'Dashboard' ? '📊' :
             aktivNav === 'Kunden' ? '👥' :
             aktivNav === 'Rechnungen' ? '📋' :
             aktivNav === 'Angebote' ? '📄' :
             aktivNav === 'Einstellungen' ? '⚙️' : '📄'} {aktivNav}
          </div>
          <div style={{position:'relative'}}>
            <div style={{...styles.searchPill, background: d.input, border: `1px solid ${sucheOffen ? '#c8a96e' : d.border}`}}
              onClick={() => { setSucheOffen(true); setGlockeOffen(false) }}>
              <span>🔍</span>
              {sucheOffen ? (
                <input ref={sucheRef} value={sucheText} onChange={e => setSucheText(e.target.value)}
                  placeholder="Suchen..." onClick={e => e.stopPropagation()}
                  style={{background:'transparent', border:'none', outline:'none', fontSize:12, color: d.text, width:150, fontFamily:'DM Sans, sans-serif'}} />
              ) : (
                <span style={{color: d.muted, fontSize: 12}}>Suchen... (Strg+F)</span>
              )}
            </div>
            {sucheOffen && (
              <>
                <div style={{position:'fixed', inset:0, zIndex:99}} onClick={() => { setSucheOffen(false); setSucheText('') }} />
                <div style={{position:'absolute', top:'calc(100% + 6px)', left:0, width:320, background: d.card, border:`1px solid ${d.border}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', zIndex:100, overflow:'hidden'}}>
                  {suchErgebnisse.length === 0 ? (
                    <div style={{padding:'14px 16px', color: d.muted, fontSize:12, textAlign:'center'}}>
                      {sucheText.length === 0 ? '🔍 Suchbegriff eingeben...' : 'Keine Ergebnisse gefunden'}
                    </div>
                  ) : suchErgebnisse.map((r, i) => (
                    <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid ${d.border}`, cursor:'pointer'}}
                      onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => { setAktivNav(r.nav); setSucheOffen(false); setSucheText('') }}>
                      <span style={{fontSize:16}}>{r.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12, fontWeight:600, color: d.text}}>{r.label}</div>
                        <div style={{fontSize:10, color: d.muted}}>{r.sub}</div>
                      </div>
                      <span style={{fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4,
                        background: r.typ === 'Kunde' ? '#dbeafe' : r.typ === 'Angebot' ? '#fef3c7' : '#e8f5e9',
                        color: r.typ === 'Kunde' ? '#1e40af' : r.typ === 'Angebot' ? '#92400e' : '#2d6a4f'}}>
                        {r.typ}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{...styles.dmToggle, background: d.input, border: `1px solid ${d.border}`, color: d.muted}}
            onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </div>
          <div style={{position:'relative'}}>
            <div style={{...styles.bellBtn, background: glockeOffen ? '#c8a96e22' : d.input, border: `1px solid ${glockeOffen ? '#c8a96e' : d.border}`, position:'relative'}}
              onClick={() => { setGlockeOffen(!glockeOffen); setSucheOffen(false); setSucheText('') }}>
              🔔
              {stats.ueberfaellig > 0 && <div style={styles.bellDot}>{stats.ueberfaellig}</div>}
            </div>
            {glockeOffen && (
              <>
                <div style={{position:'fixed', inset:0, zIndex:99}} onClick={() => setGlockeOffen(false)} />
                <div style={{position:'absolute', top:'calc(100% + 6px)', right:0, width:300, background: d.card, border:`1px solid ${d.border}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', zIndex:100, overflow:'hidden'}}>
                  <div style={{padding:'10px 14px', borderBottom:`1px solid ${d.border}`, display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontSize:13, fontWeight:700, color: d.text, flex:1}}>🔔 Benachrichtigungen</span>
                    {stats.ueberfaellig > 0 && <span style={{fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:8, background:'#c0392b', color:'white'}}>{stats.ueberfaellig} überfällig</span>}
                  </div>
                  {ueberfaelligeListe.length === 0 ? (
                    <div style={{padding:'20px 16px', textAlign:'center', color: d.muted, fontSize:12}}>
                      <div style={{fontSize:24, marginBottom:6}}>✅</div>
                      Keine überfälligen Rechnungen
                    </div>
                  ) : ueberfaelligeListe.map((r: any, i: number) => {
                    const tage = Math.floor((new Date().getTime() - new Date(r.faelligBis).getTime()) / 86400000)
                    return (
                      <div key={i} style={{padding:'10px 14px', borderBottom:`1px solid ${d.border}`, cursor:'pointer'}}
                        onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => { setAktivNav('Rechnungen'); setGlockeOffen(false) }}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <span style={{fontSize:14, color:'#c0392b'}}>⚠️</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11, fontWeight:700, color: d.text}}>{r.nummer}</div>
                            <div style={{fontSize:10, color:'#c0392b', fontWeight:600}}>seit {tage} Tag{tage !== 1 ? 'en' : ''} überfällig</div>
                          </div>
                          {r.gesamt && <span style={{fontSize:11, fontWeight:700, color: d.text}}>€ {Number(r.gesamt).toLocaleString('de-AT', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <button style={styles.neuBtn} onClick={() => setAktivNav('Rechnungen')}>+ Neu</button>
        </div>

        <div style={styles.content}>

          {aktivNav === 'Dashboard' && (
            <>
              {/* Stats */}
              <div style={styles.statsRow}>
                {[
                  { label: 'Kunden', value: String(stats.kunden), sub: 'Gesamt', farbe: '#c8a96e' },
                  { label: 'Rechnungen', value: String(stats.rechnungen), sub: 'Gesamt', farbe: '#2d6a4f' },
                  { label: 'Überfällig', value: String(stats.ueberfaellig), sub: stats.ueberfaellig > 0 ? 'Sofort handeln!' : 'Alles ok!', farbe: stats.ueberfaellig > 0 ? '#c0392b' : '#2d6a4f', alarm: stats.ueberfaellig > 0 },
                  { label: 'Offen', value: String(stats.offenGesamt), sub: 'Nicht bezahlt', farbe: '#e07b00', alarm: stats.offenGesamt > 0 },
                  { label: 'Angebote', value: String(stats.angebote), sub: 'Aktiv', farbe: '#1e40af' },
                ].map((stat, i) => (
                  <div key={i} style={{...styles.statCard, background: d.card, border: `1px solid ${stat.alarm ? stat.farbe + '44' : d.border}`}}>
                    <div style={{...styles.statBar, background: stat.farbe}}></div>
                    <div style={{...styles.statLabel, color: d.muted}}>{stat.label}</div>
                    <div style={{...styles.statValue, color: stat.alarm ? stat.farbe : d.text}}>{stat.value}</div>
                    <div style={{...styles.statSub, color: stat.alarm ? stat.farbe : d.muted}}>{stat.sub}</div>
                    {stat.alarm && <div style={styles.statShake}>⚠️</div>}
                  </div>
                ))}
              </div>

              <div style={styles.twoCol}>
                {/* Letzte Rechnungen */}
                <div style={{...styles.card, background: d.card, border: `1px solid ${d.border}`}}>
                  <div style={{...styles.cardHeader, borderBottom: `1px solid ${d.border}`}}>
                    <div style={{...styles.cardTitle, color: d.text}}>📋 Letzte Rechnungen & Angebote</div>
                    <div style={{color: '#c8a96e', fontSize: 12, cursor: 'pointer'}}
                      onClick={() => setAktivNav('Rechnungen')}>Alle anzeigen →</div>
                  </div>
                  {letzteRechnungen.length === 0 ? (
                    <div style={{padding:40, textAlign:'center', color: d.muted}}>
                      <div style={{fontSize:32, marginBottom:8}}>📋</div>
                      <div style={{fontSize:13}}>Noch keine Rechnungen</div>
                      <button
                        style={{marginTop:12, background:'#c8a96e', color:'#0a0a0a', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, cursor:'pointer'}}
                        onClick={() => setAktivNav('Rechnungen')}>
                        + Erste Rechnung erstellen
                      </button>
                    </div>
                  ) : (
                    <table style={styles.tbl}>
                      <thead>
                        <tr style={{background: d.tblHead}}>
                          {['Nummer', 'Typ', 'Datum', 'Status'].map(h => (
                            <th key={h} style={{...styles.th, color: d.muted}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {letzteRechnungen.map((r: any, i: number) => (
                          <tr key={i} style={{borderBottom: `1px solid ${d.border}`, cursor:'pointer'}}
                            onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => setAktivNav(r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen')}>
                            <td style={{...styles.td, fontFamily:'Syne, sans-serif', fontSize:11, fontWeight:700, color: d.muted}}>{r.nummer}</td>
                            <td style={styles.td}>
                              <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                                background: r.typ === 'Rechnung' ? '#dbeafe' : '#fef3c7',
                                color: r.typ === 'Rechnung' ? '#1e40af' : '#92400e'}}>
                                {r.typ}
                              </span>
                            </td>
                            <td style={{...styles.td, fontSize:11, color: d.muted}}>
                              {new Date(r.datum).toLocaleDateString('de-AT')}
                            </td>
                            <td style={styles.td}>
                              <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                                background: r.status === 'Bezahlt' ? '#d1f5e0' : r.status === 'Offen' ? '#fde8e6' : '#f0f0f0',
                                color: r.status === 'Bezahlt' ? '#2d6a4f' : r.status === 'Offen' ? '#c0392b' : '#666'}}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Rechte Spalte */}
                <div style={styles.rightCol}>
                  {/* Kunden */}
                  <div style={{...styles.card, background: d.card, border: `1px solid ${d.border}`}}>
                    <div style={{...styles.cardHeader, borderBottom: `1px solid ${d.border}`}}>
                      <div style={{...styles.cardTitle, color: d.text}}>👥 Kunden</div>
                      <div style={{color: '#c8a96e', fontSize: 12, cursor: 'pointer'}}
                        onClick={() => setAktivNav('Kunden')}>Alle →</div>
                    </div>
                    {kunden.length === 0 ? (
                      <div style={{padding:20, textAlign:'center', color: d.muted, fontSize:12}}>
                        Noch keine Kunden
                      </div>
                    ) : (
                      kunden.map((k: any, i: number) => (
                        <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom: `1px solid ${d.border}`, cursor:'pointer'}}
                          onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => setAktivNav('Kunden')}>
                          <div style={{width:28, height:28, background:'#c8a96e', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#0a0a0a', flexShrink:0}}>
                            {k.vorname?.[0]}{k.nachname?.[0]}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12, fontWeight:500, color: d.text}}>{k.vorname} {k.nachname}</div>
                            {k.firma && <div style={{fontSize:10, color: d.muted}}>{k.firma}</div>}
                          </div>
                          <span style={{fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4,
                            background: k.typ === 'Privat' ? '#dbeafe' : '#f0f0ff',
                            color: k.typ === 'Privat' ? '#1e40af' : '#4040cc'}}>
                            {k.typ}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Schnellzugriff */}
                  <div style={{...styles.card, background: d.card, border: `1px solid ${d.border}`}}>
                    <div style={{...styles.cardHeader, borderBottom: `1px solid ${d.border}`}}>
                      <div style={{...styles.cardTitle, color: d.text}}>⚡ Schnellzugriff</div>
                    </div>
                    {[
                      { icon:'📋', label:'Neue Rechnung', nav:'Rechnungen' },
                      { icon:'📄', label:'Neues Angebot', nav:'Angebote' },
                      { icon:'👥', label:'Neuer Kunde', nav:'Kunden' },
                      { icon:'⚙️', label:'Einstellungen', nav:'Einstellungen' },
                    ].map((item, i) => (
                      <div key={i}
                        style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom: `1px solid ${d.border}`, cursor:'pointer'}}
                        onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => setAktivNav(item.nav)}>
                        <span style={{fontSize:16}}>{item.icon}</span>
                        <span style={{fontSize:12, color: d.text}}>{item.label}</span>
                        <span style={{marginLeft:'auto', color: d.muted, fontSize:12}}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {aktivNav === 'Kunden' && <div style={{flex:1, overflow:'auto'}}><Kunden /></div>}
          {aktivNav === 'Rechnungen' && <div style={{flex:1, overflow:'auto'}}><Rechnungen /></div>}
          {aktivNav === 'Angebote' && <div style={{flex:1, overflow:'auto'}}><Angebote /></div>}
          {aktivNav === 'Einstellungen' && <div style={{flex:1, overflow:'auto', padding:'4px 0'}}><Einstellungen /></div>}

        </div>
      </div>
    </div>
  )
}

const dark = {
  bg: '#0a0a0a', sidebar: '#050505', card: '#111111',
  border: '#222222', text: '#e8e8e8', muted: '#666',
  input: '#1a1a1a', navLabel: '#333', navText: '#666',
  navAkt: '#1a1a1a', tblHead: '#0d0d0d', tblHover: '#161616',
  badgeGray: '#2a2a2a'
}

const light = {
  bg: '#f5f3ef', sidebar: '#1a1814', card: '#ffffff',
  border: '#ebe6de', text: '#1a1a1a', muted: '#888',
  input: '#f0ede8', navLabel: '#555', navText: '#777',
  navAkt: '#2a2520', tblHead: '#faf8f5', tblHover: '#faf8f5',
  badgeGray: '#e8e3db'
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { display:'flex', height:'100vh', fontFamily:'DM Sans, sans-serif', overflow:'hidden' },
  sidebar: { width:220, minWidth:220, display:'flex', flexDirection:'column', height:'100vh' },
  logoWrap: { padding:'20px 18px 16px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:10 },
  logoBox: { width:34, height:34, background:'#c8a96e', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 },
  logoName: { fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, color:'white' },
  logoSub: { fontSize:9, marginTop:1 },
  nav: { padding:'12px 8px', flex:1, display:'flex', flexDirection:'column', gap:1, overflowY:'auto' },
  navLabel: { fontSize:9, textTransform:'uppercase', letterSpacing:1.2, padding:'8px 10px 3px', fontWeight:700 },
  navItem: { display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:6, cursor:'pointer', fontSize:12, transition:'all 0.15s' },
  navIcon: { fontSize:13, width:18, textAlign:'center' },
  navName: { flex:1 },
  navBadge: { fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8 },
  kiBadge: { fontSize:8, background:'#1a3a1a', color:'#4a9a4a', padding:'1px 5px', borderRadius:3 },
  userCard: { padding:'10px 8px', display:'flex', alignItems:'center', gap:9 },
  userAv: { width:28, height:28, background:'#c8a96e', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#0a0a0a', flexShrink:0 },
  userName: { fontSize:11, fontWeight:500 },
  userRole: { fontSize:9 },
  logoutBtn: { marginLeft:'auto', background:'transparent', border:'none', cursor:'pointer', fontSize:16 },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar: { height:52, display:'flex', alignItems:'center', padding:'0 20px', gap:10, flexShrink:0 },
  topbarTitle: { fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, flex:1 },
  searchPill: { display:'flex', alignItems:'center', gap:8, borderRadius:8, padding:'5px 12px', cursor:'pointer', width:200 },
  dmToggle: { width:32, height:32, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14 },
  bellBtn: { width:32, height:32, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14 },
  bellDot: { position:'absolute', top:-3, right:-3, width:14, height:14, background:'#c0392b', color:'white', borderRadius:'50%', fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' },
  neuBtn: { background:'#e8e8e8', color:'#0a0a0a', border:'none', borderRadius:7, padding:'6px 14px', fontFamily:'DM Sans, sans-serif', fontSize:12, fontWeight:600, cursor:'pointer' },
  content: { flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 },
  statCard: { borderRadius:9, padding:'14px 16px', position:'relative', overflow:'hidden', cursor:'pointer' },
  statBar: { position:'absolute', top:0, left:0, width:3, height:'100%' },
  statLabel: { fontSize:9, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6, fontWeight:600 },
  statValue: { fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, lineHeight:1 },
  statSub: { fontSize:10, marginTop:4 },
  statShake: { position:'absolute', top:12, right:12, fontSize:16 },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 280px', gap:14, flex:1, minHeight:0 },
  card: { borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' },
  cardHeader: { padding:'12px 16px', display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  cardTitle: { fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, flex:1 },
  tbl: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'8px 14px', textAlign:'left', fontSize:9, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700 },
  td: { padding:'10px 14px' },
  rightCol: { display:'flex', flexDirection:'column', gap:10, overflowY:'auto' },
}