import React, { useState, useEffect } from 'react'
import { authService } from '../services/api'
import api from '../services/api'
import Kunden from './Kunden'
import Rechnungen from './Rechnungen'
import Angebote from './Angebote'
import Einstellungen from './Einstellungen'
import Vorlagen from './Vorlagen'

// ── SVG Icons ─────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const NAV_ICONS: Record<string, React.ReactElement> = {
  Dashboard:        <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" fill="none"/></>,
  Angebote:         <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 11v6 M9 14h6" />,
  Rechnungen:       <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 12h6 M9 16h4" />,
  Kunden:           <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
  Vorlagen:         <Icon d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />,
  Positionsvorlagen:<Icon d="M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" />,
  'G&V Abrechnung': <Icon d="M18 20V10 M12 20V4 M6 20v-6 M2 20h20" />,
  'KM-Buch':        <Icon d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2h-2 M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />,
  Belegscanner:     <Icon d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  Einstellungen:    <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />,
}

const NavSvg = ({ name, size = 16 }: { name: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {NAV_ICONS[name] ?? null}
  </svg>
)

// ── Theme ──────────────────────────────────────────────────────────────
const GOLD = '#c8a96e'
const GOLD_DIM = 'rgba(200,169,110,0.14)'

const light = {
  bg: '#f4f3ef', sidebar: '#111118', card: '#ffffff',
  border: '#e9e6de', text: '#111116', muted: '#8b8ba0',
  input: '#edece7', navLabel: '#44445a', navText: '#8888aa',
  navAkt: GOLD_DIM, tblHead: '#f9f8f5', tblHover: '#f5f3ee',
  badgeGray: '#e5e2d8',
}
const dark = {
  bg: '#0c0c14', sidebar: '#07070f', card: '#13131e',
  border: '#1d1d2e', text: '#e0e0f0', muted: '#56567a',
  input: '#18182a', navLabel: '#35355a', navText: '#66668a',
  navAkt: GOLD_DIM, tblHead: '#0f0f1a', tblHover: '#18182a',
  badgeGray: '#1c1c2e',
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const benutzer = JSON.parse(localStorage.getItem('benutzer') || '{}')
  const [aktivNav, setAktivNav] = useState('Dashboard')
  const [darkMode, setDarkMode] = useState(false)
  const [navExpanded, setNavExpanded] = useState<string[]>(['Vorlagen'])

  const [stats, setStats] = useState({ kunden: 0, rechnungen: 0, angebote: 0, offenGesamt: 0, umsatzJahr: 0, ueberfaellig: 0 })
  const [letzteRechnungen, setLetzteRechnungen] = useState<any[]>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [alleKundenDaten, setAlleKundenDaten] = useState<any[]>([])
  const [alleRechnungenDaten, setAlleRechnungenDaten] = useState<any[]>([])
  const [ueberfaelligeListe, setUeberfaelligeListe] = useState<any[]>([])
  const [sucheOffen, setSucheOffen] = useState(false)
  const [sucheText, setSucheText] = useState('')
  const [glockeOffen, setGlockeOffen] = useState(false)
  const sucheRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => { ladeDaten() }, [])

  const ladeDaten = async () => {
    try {
      const [kundenRes, rechnungenRes] = await Promise.all([api.get('/kunden'), api.get('/rechnungen')])
      const alleKunden = kundenRes.data
      const alleRechnungen = rechnungenRes.data
      const rechnungen = alleRechnungen.filter((r: any) => r.typ === 'Rechnung')
      const angebote = alleRechnungen.filter((r: any) => r.typ === 'Angebot')
      const heute = new Date()
      const ueberfaellig = rechnungen.filter((r: any) => r.faelligBis && new Date(r.faelligBis) < heute && r.status !== 'Bezahlt')
      const umsatzJahr = rechnungen
        .filter((r: any) => r.status === 'Bezahlt' && new Date(r.datum).getFullYear() === heute.getFullYear())
        .reduce((s: number, r: any) => s + (Number(r.gesamt) || 0), 0)
      setStats({ kunden: alleKunden.length, rechnungen: rechnungen.length, angebote: angebote.length, offenGesamt: rechnungen.filter((r: any) => r.status !== 'Bezahlt').length, umsatzJahr, ueberfaellig: ueberfaellig.length })
      setLetzteRechnungen(alleRechnungen.slice(0, 8))
      setKunden(alleKunden.slice(0, 5))
      setAlleKundenDaten(alleKunden)
      setAlleRechnungenDaten(alleRechnungen)
      setUeberfaelligeListe(ueberfaellig)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSucheOffen(true); setGlockeOffen(false) }
      if (e.key === 'Escape') { setSucheOffen(false); setSucheText(''); setGlockeOffen(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { if (sucheOffen && sucheRef.current) sucheRef.current.focus() }, [sucheOffen])

  const suchErgebnisse = sucheText.trim().length >= 1 ? [
    ...alleKundenDaten.filter(k => `${k.vorname} ${k.nachname} ${k.firma || ''} ${k.kundennummer || ''}`.toLowerCase().includes(sucheText.toLowerCase())).slice(0, 4).map(k => ({ typ: 'Kunde', label: `${k.vorname} ${k.nachname}`, sub: k.firma || k.kundennummer || '', nav: 'Kunden' })),
    ...alleRechnungenDaten.filter(r => `${r.nummer} ${r.status || ''}`.toLowerCase().includes(sucheText.toLowerCase())).slice(0, 4).map(r => ({ typ: r.typ, label: r.nummer, sub: `${r.status} · € ${r.gesamt ? Number(r.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}`, nav: r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen' }))
  ] : []

  const d = darkMode ? dark : light

  const NAV_GRUPPEN = [
    { gruppe: 'Übersicht', items: [{ name: 'Dashboard' }] },
    { gruppe: 'Dokumente', items: [
      { name: 'Angebote', badge: stats.angebote > 0 ? String(stats.angebote) : null },
      { name: 'Rechnungen', badge: stats.ueberfaellig > 0 ? `${stats.ueberfaellig}!` : stats.rechnungen > 0 ? String(stats.rechnungen) : null, rot: stats.ueberfaellig > 0 },
    ]},
    { gruppe: 'Stammdaten', items: [
      { name: 'Kunden', badge: stats.kunden > 0 ? String(stats.kunden) : null },
      { name: 'Vorlagen', children: [{ name: 'Positionsvorlagen' }] },
    ]},
    { gruppe: 'Buchhaltung', items: [
      { name: 'G&V Abrechnung' },
      { name: 'KM-Buch' },
      { name: 'Belegscanner', ki: true },
    ]},
    { gruppe: 'System', items: [{ name: 'Einstellungen' }] },
  ]

  const STAT_CARDS = [
    { label: 'Kunden', value: stats.kunden, desc: 'Gesamt', color: '#6366f1', bg: '#eef2ff', nav: 'Kunden', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    { label: 'Rechnungen', value: stats.rechnungen, desc: 'Gesamt', color: '#2d6a4f', bg: '#d8f3dc', nav: 'Rechnungen', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 12h6 M9 16h4' },
    { label: 'Überfällig', value: stats.ueberfaellig, desc: stats.ueberfaellig > 0 ? 'Sofort handeln' : 'Alles ok!', color: stats.ueberfaellig > 0 ? '#c0392b' : '#2d6a4f', bg: stats.ueberfaellig > 0 ? '#fde8e6' : '#d8f3dc', nav: 'Rechnungen', alarm: stats.ueberfaellig > 0, icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
    { label: 'Offen', value: stats.offenGesamt, desc: 'Nicht bezahlt', color: '#d97706', bg: '#fef3c7', nav: 'Rechnungen', alarm: stats.offenGesamt > 0, icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6v6l4 2' },
    { label: 'Angebote', value: stats.angebote, desc: 'Aktiv', color: '#1e40af', bg: '#dbeafe', nav: 'Angebote', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 11v6 M9 14h6' },
  ]

  const statusChip = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      Bezahlt: { bg: '#d8f3dc', color: '#1b4332' }, Offen: { bg: '#fde8e6', color: '#7f1d1d' },
      Entwurf: { bg: '#f3f4f6', color: '#374151' }, Gesendet: { bg: '#dbeafe', color: '#1e3a8a' },
      Angenommen: { bg: '#d8f3dc', color: '#1b4332' }, Abgelehnt: { bg: '#fde8e6', color: '#7f1d1d' },
      'Mahnung 1': { bg: '#fef3c7', color: '#78350f' }, 'Mahnung 2': { bg: '#fde8e6', color: '#7f1d1d' },
    }
    const s = map[status] || { bg: '#f3f4f6', color: '#374151' }
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' as const }}>
        {status}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', background: d.bg, color: d.text }}>

      {/* ── SIDEBAR ────────────────────────────────────── */}
      <div style={{ width: 240, minWidth: 240, background: d.sidebar, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${GOLD}, #a87c3e)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px rgba(200,169,110,0.35)` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>ScanPro</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Kleinunternehmen · AT</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {NAV_GRUPPEN.map((gruppe) => (
            <div key={gruppe.gruppe} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 1.4, padding: '10px 10px 4px', fontWeight: 700, color: 'rgba(255,255,255,0.22)' }}>
                {gruppe.gruppe}
              </div>
              {gruppe.items.map((item: any) => {
                const istExpanded = navExpanded.includes(item.name)
                const hatKinder = item.children && item.children.length > 0
                const kindAktiv = hatKinder && item.children.some((c: any) => c.name === aktivNav)
                const istAktiv = !hatKinder && aktivNav === item.name
                return (
                  <div key={item.name}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                        fontSize: 13, transition: 'all 0.15s',
                        background: istAktiv || (hatKinder && kindAktiv && !istExpanded) ? GOLD_DIM : 'transparent',
                        color: istAktiv ? GOLD : hatKinder && kindAktiv && !istExpanded ? GOLD : 'rgba(255,255,255,0.55)',
                        position: 'relative' as const,
                      }}
                      onClick={() => {
                        if (hatKinder) {
                          setNavExpanded(prev => istExpanded ? prev.filter(n => n !== item.name) : [...prev, item.name])
                          if (!istExpanded && item.children.length > 0) setAktivNav(item.children[0].name)
                        } else { setAktivNav(item.name) }
                      }}
                      onMouseEnter={e => { if (!istAktiv) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!istAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      {istAktiv && (
                        <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: GOLD, borderRadius: '0 2px 2px 0' }} />
                      )}
                      <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          {NAV_ICONS[item.name]}
                        </svg>
                      </span>
                      <span style={{ flex: 1, fontWeight: istAktiv ? 600 : 400 }}>{item.name}</span>
                      {item.ki && <span style={{ fontSize: 8, background: '#1a3a1a', color: '#4a9a4a', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>KI</span>}
                      {item.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: item.rot ? '#c0392b' : 'rgba(255,255,255,0.1)', color: item.rot ? 'white' : 'rgba(255,255,255,0.45)', minWidth: 18, textAlign: 'center' as const }}>
                          {item.badge}
                        </span>
                      )}
                      {hatKinder && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', transition: 'transform 0.2s', display: 'inline-block', transform: istExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      )}
                    </div>

                    {/* Sub-items */}
                    {hatKinder && istExpanded && (
                      <div style={{ margin: '2px 0 2px 14px' }}>
                        {item.children.map((child: any) => {
                          const childAktiv = aktivNav === child.name
                          return (
                            <div key={child.name}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
                                borderRadius: 8, cursor: 'pointer', fontSize: 12,
                                background: childAktiv ? GOLD_DIM : 'transparent',
                                color: childAktiv ? GOLD : 'rgba(255,255,255,0.38)',
                                borderLeft: `2px solid ${childAktiv ? GOLD : 'rgba(255,255,255,0.08)'}`,
                                marginLeft: 4, transition: 'all 0.15s',
                              }}
                              onClick={() => setAktivNav(child.name)}
                              onMouseEnter={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                              onMouseLeave={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                {NAV_ICONS[child.name]}
                              </svg>
                              <span style={{ fontWeight: childAktiv ? 600 : 400 }}>{child.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${GOLD}, #a07030)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0, letterSpacing: -0.5 }}>
            {benutzer.vorname?.[0]}{benutzer.nachname?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{benutzer.vorname} {benutzer.nachname}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Administrator</div>
          </div>
          <button onClick={() => { authService.logout(); onLogout() }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
            title="Abmelden">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ height: 58, background: d.card, borderBottom: `1px solid ${d.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 10, flexShrink: 0, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: d.text, letterSpacing: -0.3 }}>{aktivNav}</div>
            <div style={{ fontSize: 10, color: d.muted, marginTop: 1 }}>
              {aktivNav === 'Dashboard' ? `Willkommen zurück, ${benutzer.vorname || 'Chef'}!` :
               aktivNav === 'Rechnungen' ? `${stats.rechnungen} Rechnungen · ${stats.ueberfaellig} überfällig` :
               aktivNav === 'Angebote' ? `${stats.angebote} Angebote` :
               aktivNav === 'Kunden' ? `${stats.kunden} Kunden` : 'ScanPro'}
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' as const }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: d.input, border: `1.5px solid ${sucheOffen ? GOLD : d.border}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', transition: 'border-color 0.15s', width: 200 }}
              onClick={() => { setSucheOffen(true); setGlockeOffen(false) }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={d.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {sucheOffen
                ? <input ref={sucheRef} value={sucheText} onChange={e => setSucheText(e.target.value)} placeholder="Suchen..." onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: d.text, width: 140, fontFamily: 'DM Sans, sans-serif' }} />
                : <span style={{ color: d.muted, fontSize: 12 }}>Suchen... ⌘F</span>
              }
            </div>
            {sucheOffen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setSucheOffen(false); setSucheText('') }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 340, background: d.card, border: `1px solid ${d.border}`, borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden' }}>
                  {suchErgebnisse.length === 0
                    ? <div style={{ padding: '16px', color: d.muted, fontSize: 12, textAlign: 'center' as const }}>{sucheText.length === 0 ? 'Suchbegriff eingeben...' : 'Keine Ergebnisse'}</div>
                    : suchErgebnisse.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${d.border}`, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => { setAktivNav(r.nav); setSucheOffen(false); setSucheText('') }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: d.text }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: d.muted, marginTop: 1 }}>{r.sub}</div>
                          </div>
                          {statusChip(r.typ)}
                        </div>
                      ))
                  }
                </div>
              </>
            )}
          </div>

          {/* Dark mode */}
          <button style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: d.input, border: `1px solid ${d.border}`, color: d.muted }}
            onClick={() => setDarkMode(!darkMode)}>
            {darkMode
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* Bell */}
          <div style={{ position: 'relative' as const }}>
            <button style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: glockeOffen ? GOLD_DIM : d.input, border: `1.5px solid ${glockeOffen ? GOLD : d.border}`, color: d.muted, position: 'relative' as const }}
              onClick={() => { setGlockeOffen(!glockeOffen); setSucheOffen(false); setSucheText('') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {stats.ueberfaellig > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${d.card}` }}>
                  {stats.ueberfaellig}
                </div>
              )}
            </button>
            {glockeOffen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setGlockeOffen(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 310, background: d.card, border: `1px solid ${d.border}`, borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${d.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.text, flex: 1 }}>Benachrichtigungen</span>
                    {stats.ueberfaellig > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#fde8e6', color: '#c0392b' }}>{stats.ueberfaellig} überfällig</span>}
                  </div>
                  {ueberfaelligeListe.length === 0
                    ? <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: d.muted, fontSize: 12 }}><div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>Keine überfälligen Rechnungen</div>
                    : ueberfaelligeListe.map((r: any, i: number) => {
                        const tage = Math.floor((new Date().getTime() - new Date(r.faelligBis).getTime()) / 86400000)
                        return (
                          <div key={i} style={{ padding: '11px 16px', borderBottom: `1px solid ${d.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                            onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => { setAktivNav('Rechnungen'); setGlockeOffen(false) }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fde8e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: d.text }}>{r.nummer}</div>
                              <div style={{ fontSize: 10, color: '#c0392b', fontWeight: 600, marginTop: 1 }}>seit {tage} Tag{tage !== 1 ? 'en' : ''} überfällig</div>
                            </div>
                            {r.gesamt && <span style={{ fontSize: 12, fontWeight: 700, color: d.text }}>€ {Number(r.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          </div>
                        )
                      })
                  }
                </div>
              </>
            )}
          </div>

          {/* Neu button */}
          <button style={{ background: '#111118', color: 'white', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setAktivNav('Rechnungen')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Neu
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {aktivNav === 'Dashboard' && (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {STAT_CARDS.map((s, i) => (
                  <div key={i} onClick={() => setAktivNav(s.nav)} style={{ background: d.card, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', border: `1px solid ${d.border}`, transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={s.icon}/>
                      </svg>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: s.alarm ? s.color : d.text, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: d.text, marginTop: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: s.alarm ? s.color : d.muted, marginTop: 2 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>

                {/* Letzte Aktivität */}
                <div style={{ background: d.card, borderRadius: 16, border: `1px solid ${d.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${d.border}`, display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: d.text, flex: 1 }}>Letzte Aktivität</div>
                    <span style={{ fontSize: 12, color: GOLD, cursor: 'pointer', fontWeight: 600 }} onClick={() => setAktivNav('Rechnungen')}>Alle anzeigen →</span>
                  </div>
                  {letzteRechnungen.length === 0
                    ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: d.muted }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: d.input, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={d.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: d.text, marginBottom: 4 }}>Noch keine Dokumente</div>
                        <div style={{ fontSize: 12, color: d.muted, marginBottom: 14 }}>Erstelle deine erste Rechnung</div>
                        <button style={{ background: GOLD, color: '#0a0a0a', border: 'none', borderRadius: 9, padding: '8px 18px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => setAktivNav('Rechnungen')}>+ Erste Rechnung</button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        {letzteRechnungen.map((r: any, i: number) => {
                          const kunde = alleKundenDaten.find((k: any) => k.id === r.kundeId)
                          const kundenName = kunde ? (kunde.firma || `${kunde.vorname} ${kunde.nachname}`) : ''
                          const betrag = r.gesamt ? Number(r.gesamt) : null
                          return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: `1px solid ${d.border}`, cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => setAktivNav(r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen')}>
                            {/* Typ-Icon */}
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: r.typ === 'Rechnung' ? '#dbeafe' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={r.typ === 'Rechnung' ? '#1e40af' : '#92400e'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                {r.typ === 'Rechnung'
                                  ? <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></>
                                  : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>
                                }
                              </svg>
                            </div>
                            {/* Nummer + Kunde + Datum */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: d.text, fontFamily: 'Syne, sans-serif', letterSpacing: -0.2 }}>{r.nummer}</div>
                              <div style={{ fontSize: 11, color: d.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                                {kundenName && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 160, fontWeight: 500, color: d.navLabel }}>{kundenName}</span>}
                                {kundenName && <span style={{ opacity: 0.35, flexShrink: 0 }}>·</span>}
                                <span style={{ flexShrink: 0 }}>{new Date(r.datum).toLocaleDateString('de-AT')}</span>
                              </div>
                            </div>
                            {/* Betrag + Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              {betrag !== null && betrag > 0 && (
                                <span style={{ fontSize: 13, fontWeight: 700, color: d.text, fontFamily: 'Syne, sans-serif', letterSpacing: -0.3 }}>
                                  € {betrag.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                              {statusChip(r.status)}
                            </div>
                          </div>
                        )})}

                      </div>
                    )
                  }
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Kunden */}
                  <div style={{ background: d.card, borderRadius: 16, border: `1px solid ${d.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${d.border}`, display: 'flex', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: d.text, flex: 1 }}>Kunden</div>
                      <span style={{ fontSize: 11, color: GOLD, cursor: 'pointer', fontWeight: 600 }} onClick={() => setAktivNav('Kunden')}>Alle →</span>
                    </div>
                    {kunden.length === 0
                      ? <div style={{ padding: '16px', textAlign: 'center', color: d.muted, fontSize: 12 }}>Noch keine Kunden</div>
                      : kunden.map((k: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: i < kunden.length - 1 ? `1px solid ${d.border}` : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = d.tblHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => setAktivNav('Kunden')}>
                            <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${GOLD}, #a07030)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                              {k.vorname?.[0]}{k.nachname?.[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: d.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{k.vorname} {k.nachname}</div>
                              {k.firma && <div style={{ fontSize: 10, color: d.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{k.firma}</div>}
                            </div>
                          </div>
                        ))
                    }
                  </div>

                  {/* Schnellzugriff */}
                  <div style={{ background: d.card, borderRadius: 16, border: `1px solid ${d.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${d.border}` }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: d.text }}>Schnellzugriff</div>
                    </div>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Neue Rechnung', nav: 'Rechnungen', color: '#1e40af', bg: '#dbeafe', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M12 11v6 M9 14h6' },
                        { label: 'Neues Angebot', nav: 'Angebote', color: '#92400e', bg: '#fef3c7', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 11v6 M9 14h6' },
                        { label: 'Neuer Kunde', nav: 'Kunden', color: '#4f46e5', bg: '#eef2ff', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6' },
                        { label: 'Einstellungen', nav: 'Einstellungen', color: '#374151', bg: darkMode ? '#1f2937' : '#f3f4f6', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
                      ].map((item, i) => (
                        <div key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${d.border}`, background: 'transparent' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.bg; (e.currentTarget as HTMLElement).style.borderColor = item.color + '44' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = d.border }}
                          onClick={() => setAktivNav(item.nav)}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: d.text, flex: 1 }}>{item.label}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={d.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {aktivNav === 'Kunden' && <div style={{ flex: 1, overflow: 'auto' }}><Kunden /></div>}
          {aktivNav === 'Rechnungen' && <div style={{ flex: 1, overflow: 'auto' }}><Rechnungen /></div>}
          {aktivNav === 'Angebote' && <div style={{ flex: 1, overflow: 'auto' }}><Angebote /></div>}
          {aktivNav === 'Positionsvorlagen' && <div style={{ flex: 1, overflow: 'auto' }}><Vorlagen /></div>}
          {aktivNav === 'Einstellungen' && <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}><Einstellungen /></div>}
        </div>
      </div>
    </div>
  )
}
