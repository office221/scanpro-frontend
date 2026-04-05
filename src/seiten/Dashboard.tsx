import React, { useState, useEffect, useMemo, useRef } from 'react'
import { authService } from '../services/api'
import api from '../services/api'
import Kunden from './Kunden'
import Rechnungen from './Rechnungen'
import Angebote from './Angebote'
import Einstellungen from './Einstellungen'
import Vorlagen from './Vorlagen'
import Belegscanner from './Belegscanner'
import GUV from './GUV'
import KMBuch from './KMBuch'
import KMGuvDashboard from './KMGuvDashboard'
import Reisekosten from './Reisekosten'
import ImmoObjekte from './ImmoObjekte'
import ImmoMieter from './ImmoMieter'
import ImmoVertraege from './ImmoVertraege'
import ImmoBetriebskosten from './ImmoBetriebskosten'
import ImmoObjektDetail from './ImmoObjektDetail'
import Stunden from './Stunden'

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
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
  Reisekosten:      <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M12 22V12 M3.27 6.96L12 12.01l8.73-5.05 M12 2.1v9.91" />,
  BuchDashboard:     <Icon d="M18 20V10 M12 20V4 M6 20v-6 M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5" />,
  Belegscanner:     <Icon d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  Einstellungen:    <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />,
  // Immobilien
  ImmoHub:          <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  Objekte:          <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  Mieter:           <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  'Mietverträge':   <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
  Betriebskosten:   <Icon d="M18 20V10 M12 20V4 M6 20v-6 M2 20h20" />,
  Stunden:          <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" />,
}

// ── Constants ──────────────────────────────────────────────────────────────
const GOLD     = '#c8a96e'
const GOLD_DIM = 'rgba(200,169,110,0.14)'
const INDIGO   = '#6366f1'
const PURPLE   = '#8b5cf6'

// ── Nav structure ──────────────────────────────────────────────────────────
const NAV_GRUPPEN = [
  { gruppe: 'Übersicht', items: [{ name: 'Dashboard', badge: null, rot: false, ki: false, children: [] }] },
  { gruppe: 'Dokumente', items: [
    { name: 'Angebote',   badge: null, rot: false, ki: false, children: [] },
    { name: 'Rechnungen', badge: null, rot: false, ki: false, children: [] },
    { name: 'Stunden',    badge: null, rot: false, ki: false, children: [] },
  ]},
  { gruppe: 'Stammdaten', items: [
    { name: 'Kunden',   badge: null, rot: false, ki: false, children: [] },
    { name: 'Vorlagen', badge: null, rot: false, ki: false, children: [{ name: 'Positionsvorlagen' }] },
  ]},
  { gruppe: 'Buchhaltung', items: [
    { name: 'BuchDashboard', label: 'Dashboard', badge: null, rot: false, ki: false, children: [] },
    { name: 'G&V Abrechnung', badge: null, rot: false, ki: false, children: [] },
    { name: 'KM-Buch',        badge: null, rot: false, ki: false, children: [] },
    { name: 'Reisekosten',    badge: null, rot: false, ki: false, children: [] },
    { name: 'Belegscanner',   badge: null, rot: false, ki: true,  children: [] },
  ]},
  { gruppe: 'Immobilien', items: [
    { name: 'ImmoHub', label: 'Immobilien', badge: null, rot: false, ki: false, children: [
      { name: 'Objekte' },
      { name: 'Mieter' },
      { name: 'Mietverträge' },
      { name: 'Betriebskosten' },
    ]},
  ]},
  { gruppe: 'System', items: [{ name: 'Einstellungen', badge: null, rot: false, ki: false, children: [] }] },
]

// ── Main Component ─────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const benutzer = JSON.parse(localStorage.getItem('benutzer') || '{}')
  const [darkMode,       setDarkMode]       = useState(() => localStorage.getItem('belegfix_dark') !== 'false')
  const [aktivNav,       setAktivNav]       = useState('Dashboard')
  const [navExpanded,    setNavExpanded]    = useState<string[]>(['Vorlagen', 'ImmoHub'])
  const [activityFilter, setActivityFilter] = useState('Alle')
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 768)
  const [navOffen,       setNavOffen]       = useState(false)
  const [stats, setStats] = useState({ kunden: 0, rechnungen: 0, angebote: 0, offenGesamt: 0, umsatzJahr: 0, ueberfaellig: 0 })
  const [letzteRechnungen,    setLetzteRechnungen]    = useState<any[]>([])
  const [kunden,              setKunden]              = useState<any[]>([])
  const [alleKundenDaten,     setAlleKundenDaten]     = useState<any[]>([])
  const [alleRechnungenDaten, setAlleRechnungenDaten] = useState<any[]>([])
  const [ueberfaelligeListe,  setUeberfaelligeListe]  = useState<any[]>([])
  const [immoObjListe,    setImmoObjListe]    = useState<any[]>([])
  const [navExpObjekte,  setNavExpObjekte]  = useState(true)
  const [sharedFile,  setSharedFile]  = useState<File | null>(null)
  const [belegTransfer, setBelegTransfer] = useState<{ datei: File; vorschlag: any } | null>(null)
  const [sucheOffen,  setSucheOffen]  = useState(false)
  const [sucheText,   setSucheText]   = useState('')
  const [glockeOffen, setGlockeOffen] = useState(false)
  const sucheRef = useRef<HTMLInputElement>(null)

  const toggleDark = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('belegfix_dark', String(next))
      return next
    })
  }

  // ── Theme ──────────────────────────────────────────────────────────────
  const D = darkMode
  const theme = {
    bg:                  D ? '#0b0f19'                       : '#f1f5f9',
    sidebar:             D ? 'rgba(5,8,16,0.97)'             : 'rgba(255,255,255,0.97)',
    sidebarBorder:       D ? 'rgba(255,255,255,0.05)'        : 'rgba(0,0,0,0.07)',
    topbar:              D ? 'rgba(11,15,25,0.85)'           : 'rgba(248,250,252,0.92)',
    topbarBorder:        D ? 'rgba(255,255,255,0.05)'        : 'rgba(0,0,0,0.06)',
    glass:               (D
      ? { background: 'rgba(20,25,35,0.5)',    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',  borderRadius: 20 }
      : { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.07)',        boxShadow: '0 4px 24px rgba(0,0,0,0.07)', borderRadius: 20 }
    ) as React.CSSProperties,
    text:                D ? '#e2e8f0'                       : '#334155',
    textStrong:          D ? '#f8fafc'                       : '#0f172a',
    textMuted:           D ? '#475569'                       : '#64748b',
    textFaint:           D ? 'rgba(255,255,255,0.28)'        : 'rgba(0,0,0,0.3)',
    navText:             D ? 'rgba(255,255,255,0.5)'         : '#64748b',
    navGroupLabel:       D ? 'rgba(255,255,255,0.18)'        : 'rgba(0,0,0,0.3)',
    navHoverBg:          D ? 'rgba(255,255,255,0.04)'        : 'rgba(0,0,0,0.04)',
    navBorderChild:      D ? 'rgba(255,255,255,0.07)'        : 'rgba(0,0,0,0.08)',
    searchBg:            D ? 'rgba(20,25,35,0.7)'            : 'rgba(0,0,0,0.05)',
    searchBorder:        D ? 'rgba(255,255,255,0.08)'        : 'rgba(0,0,0,0.09)',
    searchText:          D ? '#f1f5f9'                       : '#1e293b',
    searchIcon:          D ? '#475569'                       : '#94a3b8',
    bellBg:              D ? 'rgba(20,25,35,0.7)'            : 'rgba(0,0,0,0.05)',
    bellBorder:          D ? 'rgba(255,255,255,0.08)'        : 'rgba(0,0,0,0.09)',
    bellColor:           D ? '#64748b'                       : '#94a3b8',
    bellNotifBorder:     D ? '#0b0f19'                       : '#f1f5f9',
    filterBg:            D ? 'rgba(0,0,0,0.3)'              : 'rgba(0,0,0,0.06)',
    filterActiveBg:      D ? 'rgba(255,255,255,0.1)'         : 'rgba(255,255,255,0.9)',
    filterActiveColor:   D ? '#f1f5f9'                       : '#1e293b',
    filterInactiveColor: D ? '#475569'                       : '#94a3b8',
    barEmpty:            D ? 'rgba(255,255,255,0.07)'        : 'rgba(0,0,0,0.07)',
    progressBg:          D ? 'rgba(0,0,0,0.3)'              : 'rgba(0,0,0,0.08)',
    openCardBg:          D ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))' : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
    openCardBorder:      D ? 'rgba(99,102,241,0.25)'        : 'rgba(99,102,241,0.2)',
    openCardText:        D ? '#fff'                          : '#1e293b',
    openCardSub:         D ? '#94a3b8'                       : '#64748b',
    openCardLabel:       D ? '#818cf8'                       : '#6366f1',
    schnellBg:           D ? 'rgba(255,255,255,0.02)'        : 'rgba(0,0,0,0.02)',
    schnellBorder:       D ? 'rgba(255,255,255,0.06)'        : 'rgba(0,0,0,0.07)',
    schnellText:         D ? '#e2e8f0'                       : '#334155',
    schnellArrow:        D ? '#334155'                       : '#94a3b8',
    divider:             D ? 'rgba(255,255,255,0.05)'        : 'rgba(0,0,0,0.07)',
    cardHoverShadow:     D ? '0 16px 48px rgba(0,0,0,0.4)'  : '0 12px 36px rgba(0,0,0,0.12)',
    cardHoverBorder:     D ? 'rgba(255,255,255,0.12)'        : 'rgba(0,0,0,0.14)',
    glowTop:             D ? 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)',
    glowBottom:          D ? 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 60%)': 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)',
    userCardBorder:      D ? 'rgba(255,255,255,0.05)'        : 'rgba(0,0,0,0.06)',
    userCardText:        D ? 'rgba(255,255,255,0.8)'         : '#334155',
    userCardSub:         D ? 'rgba(255,255,255,0.25)'        : '#94a3b8',
    userCardLogout:      D ? 'rgba(255,255,255,0.25)'        : '#94a3b8',
    toggleBg:            D ? 'rgba(20,25,35,0.7)'            : 'rgba(0,0,0,0.05)',
    toggleBorder:        D ? 'rgba(255,255,255,0.08)'        : 'rgba(0,0,0,0.09)',
    toggleColor:         D ? '#fbbf24'                       : '#f59e0b',
    notifBg:             D ? 'rgba(239,68,68,0.15)'          : 'rgba(239,68,68,0.1)',
    notifBorder:         D ? 'rgba(255,255,255,0.06)'        : 'rgba(0,0,0,0.06)',
    ueberfaelligBg:      D ? 'rgba(20,25,35,0.7)'            : 'rgba(255,255,255,0.8)',
    kiTag:               D ? { bg: '#0d1f0d', color: '#4ade80' } : { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    statusCfg: D ? {
      'Bezahlt':    { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7', border: 'rgba(16,185,129,0.3)'  },
      'Offen':      { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', border: 'rgba(245,158,11,0.3)'  },
      'Entwurf':    { bg: 'rgba(148,163,184,0.1)',  color: '#cbd5e1', border: 'rgba(148,163,184,0.2)' },
      'Gesendet':   { bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', border: 'rgba(99,102,241,0.3)'  },
      'Angenommen': { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7', border: 'rgba(16,185,129,0.3)'  },
      'Abgelehnt':  { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', border: 'rgba(239,68,68,0.3)'   },
      'Mahnung 1':  { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', border: 'rgba(245,158,11,0.3)'  },
      'Mahnung 2':  { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', border: 'rgba(239,68,68,0.3)'   },
      'Mahnung 3':  { bg: 'rgba(239,68,68,0.22)',   color: '#f87171', border: 'rgba(239,68,68,0.4)'   },
    } : {
      'Bezahlt':    { bg: 'rgba(16,185,129,0.1)',   color: '#059669', border: 'rgba(16,185,129,0.2)'  },
      'Offen':      { bg: 'rgba(245,158,11,0.1)',   color: '#b45309', border: 'rgba(245,158,11,0.2)'  },
      'Entwurf':    { bg: 'rgba(100,116,139,0.1)',  color: '#475569', border: 'rgba(100,116,139,0.2)' },
      'Gesendet':   { bg: 'rgba(99,102,241,0.1)',   color: '#4f46e5', border: 'rgba(99,102,241,0.2)'  },
      'Angenommen': { bg: 'rgba(16,185,129,0.1)',   color: '#059669', border: 'rgba(16,185,129,0.2)'  },
      'Abgelehnt':  { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', border: 'rgba(239,68,68,0.2)'   },
      'Mahnung 1':  { bg: 'rgba(245,158,11,0.1)',   color: '#b45309', border: 'rgba(245,158,11,0.2)'  },
      'Mahnung 2':  { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', border: 'rgba(239,68,68,0.2)'   },
      'Mahnung 3':  { bg: 'rgba(239,68,68,0.15)',   color: '#b91c1c', border: 'rgba(239,68,68,0.3)'   },
    },
  }

  const statusChip = (status: string) => {
    const s = (theme.statusCfg as any)[status] || (theme.statusCfg as any)['Entwurf']
    return (
      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' as const }}>
        {status}
      </span>
    )
  }

  // ── Data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // Web Share Target: Cache beim Start immer prüfen
  // (funktioniert auch wenn User zuerst einloggen musste und URL-Param verloren ging)
  useEffect(() => {
    // URL-Parameter bereinigen falls vorhanden
    if (window.location.search.includes('share=1')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (!('caches' in window)) return
    caches.open('belegfix-share-v1').then(async (cache) => {
      const res = await cache.match('/shared-file')
      if (!res) return
      const blob = await res.blob()
      const name = decodeURIComponent(res.headers.get('X-Filename') || 'shared-file')
      const file = new File([blob], name, { type: blob.type })
      await cache.delete('/shared-file') // einmalig – danach gelöscht
      setSharedFile(file)
      setAktivNav('Belegscanner')
    }).catch(err => console.error('Share cache error:', err))
  }, [])

  useEffect(() => { ladeDaten(); ladeImmoObjekte() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ladeDaten = async () => {
    try {
      const [kundenRes, rechnungenRes] = await Promise.all([api.get('/kunden'), api.get('/rechnungen')])
      const alleKunden     = kundenRes.data
      const alleRechnungen = rechnungenRes.data
      const rechnungen     = alleRechnungen.filter((r: any) => r.typ === 'Rechnung')
      const heute          = new Date()
      const ueberfaellig   = rechnungen.filter((r: any) => r.faelligBis && new Date(r.faelligBis) < heute && r.status !== 'Bezahlt')
      const umsatzJahr     = rechnungen
        .filter((r: any) => r.status === 'Bezahlt' && new Date(r.datum).getFullYear() === heute.getFullYear())
        .reduce((s: number, r: any) => s + (Number(r.gesamt) || 0), 0)
      setStats({ kunden: alleKunden.length, rechnungen: rechnungen.length, angebote: alleRechnungen.filter((r: any) => r.typ === 'Angebot').length, offenGesamt: rechnungen.filter((r: any) => r.status !== 'Bezahlt').length, umsatzJahr, ueberfaellig: ueberfaellig.length })
      setLetzteRechnungen(alleRechnungen.slice(0, 10))
      setKunden(alleKunden.slice(0, 5))
      setAlleKundenDaten(alleKunden)
      setAlleRechnungenDaten(alleRechnungen)
      setUeberfaelligeListe(ueberfaellig)
    } catch (e) { console.error(e) }
  }

  const ladeImmoObjekte = async () => {
    try {
      const res = await api.get('/immo/objekte')
      setImmoObjListe(res.data)
    } catch {}
  }

  // ── Computed ───────────────────────────────────────────────────────────
  const monatsDaten = useMemo(() => {
    const heute = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(heute.getFullYear(), heute.getMonth() - (6 - i), 1)
      const summe = alleRechnungenDaten
        .filter((r: any) => r.typ === 'Rechnung')
        .filter((r: any) => { const rd = new Date(r.datum); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() })
        .reduce((s: number, r: any) => s + (Number(r.gesamt) || 0), 0)
      return { label: d.toLocaleDateString('de-AT', { month: 'short' }), summe }
    })
  }, [alleRechnungenDaten])
  const maxMonat = Math.max(...monatsDaten.map(m => m.summe), 1)

  const offenBetrag = useMemo(() =>
    alleRechnungenDaten
      .filter((r: any) => r.typ === 'Rechnung' && r.status !== 'Bezahlt')
      .reduce((s: number, r: any) => s + (Number(r.gesamt) || 0), 0)
  , [alleRechnungenDaten])

  const totalJahr = useMemo(() => {
    const jahr = new Date().getFullYear()
    return alleRechnungenDaten
      .filter((r: any) => r.typ === 'Rechnung' && new Date(r.datum).getFullYear() === jahr)
      .reduce((s: number, r: any) => s + (Number(r.gesamt) || 0), 0)
  }, [alleRechnungenDaten])

  const bezahltProzent = totalJahr > 0 ? Math.min(Math.round((stats.umsatzJahr / totalJahr) * 100), 100) : 0

  const gefilterteAktivitaet = useMemo(() => {
    if (activityFilter === 'Alle') return letzteRechnungen.slice(0, 8)
    return letzteRechnungen.filter((r: any) => {
      if (activityFilter === 'Mahnung') return (r.status || '').includes('Mahnung')
      return r.status === activityFilter
    })
  }, [letzteRechnungen, activityFilter])

  // ── Search ──────────────────────────────────────────────────────────────
  const suchErgebnisse = sucheText.trim().length >= 1 ? [
    ...alleKundenDaten.filter(k => `${k.vorname} ${k.nachname} ${k.firma || ''} ${k.kundennummer || ''}`.toLowerCase().includes(sucheText.toLowerCase())).slice(0, 4).map(k => ({ typ: 'Kunde', label: `${k.vorname} ${k.nachname}`, sub: k.firma || k.kundennummer || '', nav: 'Kunden' })),
    ...alleRechnungenDaten.filter(r => `${r.nummer} ${r.status || ''}`.toLowerCase().includes(sucheText.toLowerCase())).slice(0, 4).map(r => ({ typ: r.typ, label: r.nummer, sub: `${r.status} · € ${r.gesamt ? Number(r.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}`, nav: r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen' }))
  ] : []

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSucheOffen(true); setGlockeOffen(false) }
      if (e.key === 'Escape') { setSucheOffen(false); setSucheText(''); setGlockeOffen(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  useEffect(() => { if (sucheOffen && sucheRef.current) sucheRef.current.focus() }, [sucheOffen])

  // ── Greeting ────────────────────────────────────────────────────────────
  const stunde = new Date().getHours()
  const gruss  = stunde < 12 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend'

  // ── Stat cards ──────────────────────────────────────────────────────────
  const STAT_CARDS = [
    { label: 'Kunden',     value: stats.kunden,      sub: 'Gesamt',         icon: '👥', color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   nav: 'Kunden',     alarm: false },
    { label: 'Rechnungen', value: stats.rechnungen,   sub: 'Gesamt',         icon: '🧾', color: '#10b981', bg: 'rgba(16,185,129,0.12)',   nav: 'Rechnungen', alarm: false },
    { label: 'Überfällig', value: stats.ueberfaellig, sub: stats.ueberfaellig > 0 ? 'Sofort handeln!' : 'Alles ok!', icon: '⚠️', color: stats.ueberfaellig > 0 ? '#ef4444' : '#10b981', bg: stats.ueberfaellig > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', nav: 'Rechnungen', alarm: stats.ueberfaellig > 0 },
    { label: 'Offen',      value: stats.offenGesamt,  sub: 'Nicht bezahlt',  icon: '🕐', color: stats.offenGesamt > 0 ? '#f59e0b' : '#10b981', bg: stats.offenGesamt > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', nav: 'Rechnungen', alarm: stats.offenGesamt > 0 },
    { label: 'Angebote',   value: stats.angebote,     sub: 'Aktiv',          icon: '📄', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  nav: 'Angebote',   alarm: false },
  ]

  const fmt = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', background: theme.bg, color: theme.text, transition: 'background 0.3s, color 0.3s' }}>

      {/* Atmospheric glows */}
      <div style={{ position: 'fixed', top: '-10%', left: '10%', width: '50vw', height: '50vw', borderRadius: '50%', background: theme.glowTop, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, transition: 'background 0.3s' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', background: theme.glowBottom, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, transition: 'background 0.3s' }} />

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      {isMobile && navOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} onClick={() => setNavOffen(false)} />
      )}
      <div style={{ width: 240, minWidth: 240, background: theme.sidebar, backdropFilter: 'blur(20px)', borderRight: `1px solid ${theme.sidebarBorder}`, display: 'flex', flexDirection: 'column', height: '100vh', position: isMobile ? 'fixed' : 'relative', top: 0, left: isMobile ? (navOffen ? 0 : -240) : 'auto', zIndex: isMobile ? 200 : 10, transition: 'background 0.3s, border-color 0.3s, left 0.3s' }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px 18px', borderBottom: `1px solid ${theme.sidebarBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${GOLD}, #a87c3e)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px rgba(200,169,110,0.35)` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: D ? 'white' : '#0f172a', letterSpacing: -0.3 }}>BelegFix</div>
            <div style={{ fontSize: 10, color: theme.textFaint, marginTop: 1 }}>Kleinunternehmen · AT</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {NAV_GRUPPEN.map((gruppe) => (
            <div key={gruppe.gruppe} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 1.4, padding: '10px 10px 4px', fontWeight: 700, color: theme.navGroupLabel }}>
                {gruppe.gruppe}
              </div>
              {gruppe.items.map((item: any) => {
                const istExpanded = navExpanded.includes(item.name)
                const hatKinder   = item.children && item.children.length > 0
                const istAktiv    = !hatKinder && aktivNav === item.name
                const badge = item.name === 'Rechnungen' && stats.ueberfaellig > 0 ? `${stats.ueberfaellig}!`
                            : item.name === 'Rechnungen' && stats.rechnungen > 0   ? String(stats.rechnungen)
                            : item.name === 'Angebote'   && stats.angebote > 0     ? String(stats.angebote)
                            : item.name === 'Kunden'     && stats.kunden > 0       ? String(stats.kunden)
                            : null
                const badgeRot = item.name === 'Rechnungen' && stats.ueberfaellig > 0
                return (
                  <div key={item.name}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s', background: istAktiv ? GOLD_DIM : 'transparent', color: istAktiv ? GOLD : theme.navText, position: 'relative' as const }}
                      onClick={() => {
                        if (hatKinder) {
                          setNavExpanded(prev => istExpanded ? prev.filter(n => n !== item.name) : [...prev, item.name])
                          if (!istExpanded && item.children.length > 0) setAktivNav(item.children[0].name)
                        } else { setAktivNav(item.name) }
                        if (isMobile && !hatKinder) setNavOffen(false)
                      }}
                      onMouseEnter={e => { if (!istAktiv) (e.currentTarget as HTMLElement).style.background = theme.navHoverBg }}
                      onMouseLeave={e => { if (!istAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      {istAktiv && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: GOLD, borderRadius: '0 2px 2px 0' }} />}
                      <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          {NAV_ICONS[item.name]}
                        </svg>
                      </span>
                      <span style={{ flex: 1, fontWeight: istAktiv ? 600 : 400 }}>{item.label || item.name}</span>
                      {item.ki && <span style={{ fontSize: 8, background: theme.kiTag.bg, color: theme.kiTag.color, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>KI</span>}
                      {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: badgeRot ? '#ef4444' : D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: badgeRot ? 'white' : D ? 'rgba(255,255,255,0.4)' : '#64748b', minWidth: 18, textAlign: 'center' as const }}>{badge}</span>}
                      {hatKinder && <span style={{ fontSize: 10, color: theme.navGroupLabel, display: 'inline-block', transition: 'transform 0.2s', transform: istExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>}
                    </div>
                    {hatKinder && istExpanded && (
                      <div style={{ margin: '2px 0 2px 14px' }}>
                        {item.children.map((child: any) => {
                          const childAktiv = aktivNav === child.name || (child.name === 'Objekte' && aktivNav.startsWith('ImmoObj_'))
                          if (child.name === 'Objekte') {
                            return (
                              <div key={child.name}>
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: childAktiv ? GOLD_DIM : 'transparent', color: childAktiv ? GOLD : D ? 'rgba(255,255,255,0.35)' : '#94a3b8', borderLeft: `2px solid ${childAktiv ? GOLD : theme.navBorderChild}`, marginLeft: 4, transition: 'all 0.15s' }}
                                  onClick={() => { setAktivNav('Objekte'); if (isMobile) setNavOffen(false) }}
                                  onMouseEnter={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = theme.navHoverBg }}
                                  onMouseLeave={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{NAV_ICONS['Objekte']}</svg>
                                  <span style={{ flex: 1, fontWeight: childAktiv ? 600 : 400 }}>Objekte</span>
                                  {immoObjListe.length > 0 && (
                                    <span onClick={e => { e.stopPropagation(); setNavExpObjekte(p => !p) }}
                                      style={{ fontSize: 9, color: theme.navGroupLabel, display: 'inline-block', transition: 'transform 0.2s', transform: navExpObjekte ? 'rotate(90deg)' : 'none' }}>▶</span>
                                  )}
                                </div>
                                {navExpObjekte && immoObjListe.length > 0 && (
                                  <div style={{ margin: '1px 0 1px 14px' }}>
                                    {immoObjListe.map((o: any) => {
                                      const oAktiv = aktivNav === `ImmoObj_${o.id}`
                                      return (
                                        <div key={o.id}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 11, background: oAktiv ? GOLD_DIM : 'transparent', color: oAktiv ? GOLD : D ? 'rgba(255,255,255,0.22)' : '#94a3b8', borderLeft: `2px solid ${oAktiv ? GOLD : theme.navBorderChild}`, marginLeft: 4, transition: 'all 0.15s' }}
                                          onClick={() => { setAktivNav(`ImmoObj_${o.id}`); if (isMobile) setNavOffen(false) }}
                                          onMouseEnter={e => { if (!oAktiv) (e.currentTarget as HTMLElement).style.background = theme.navHoverBg }}
                                          onMouseLeave={e => { if (!oAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                          <span style={{ fontSize: 11, flexShrink: 0 }}>🏠</span>
                                          <span style={{ fontWeight: oAktiv ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{o.name}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div key={child.name}
                              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: childAktiv ? GOLD_DIM : 'transparent', color: childAktiv ? GOLD : D ? 'rgba(255,255,255,0.35)' : '#94a3b8', borderLeft: `2px solid ${childAktiv ? GOLD : theme.navBorderChild}`, marginLeft: 4, transition: 'all 0.15s' }}
                              onClick={() => { setAktivNav(child.name); if (isMobile) setNavOffen(false) }}
                              onMouseEnter={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = theme.navHoverBg }}
                              onMouseLeave={e => { if (!childAktiv) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{NAV_ICONS[child.name]}</svg>
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
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${theme.userCardBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${GOLD}, #a07030)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {benutzer.vorname?.[0]}{benutzer.nachname?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.userCardText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{benutzer.vorname} {benutzer.nachname}</div>
            <div style={{ fontSize: 10, color: theme.userCardSub, marginTop: 1 }}>Administrator</div>
          </div>
          <button onClick={() => { authService.logout(); onLogout() }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.userCardLogout, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Abmelden">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Topbar */}
        <div style={{ height: 58, background: theme.topbar, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${theme.topbarBorder}`, display: 'flex', alignItems: 'center', padding: isMobile ? '0 12px' : '0 24px', gap: 10, flexShrink: 0, transition: 'background 0.3s' }}>
          {isMobile && (
            <button onClick={() => setNavOffen(!navOffen)} style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: theme.toggleBg, border: `1.5px solid ${theme.toggleBorder}`, color: theme.text, flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: theme.textStrong, letterSpacing: -0.3 }}>
              {aktivNav.startsWith('ImmoObj_')
                ? (immoObjListe.find((o: any) => o.id === parseInt(aktivNav.replace('ImmoObj_', '')))?.name || 'Objekt')
                : aktivNav}
            </div>
            <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>
              {aktivNav === 'Dashboard'   ? `${gruss}, ${benutzer.vorname || 'Chef'}!  ·  ${new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` :
               aktivNav === 'Rechnungen' ? `${stats.rechnungen} Rechnungen · ${stats.ueberfaellig} überfällig` :
               aktivNav === 'Angebote'   ? `${stats.angebote} Angebote` :
               aktivNav === 'Kunden'     ? `${stats.kunden} Kunden` : 'BelegFix'}
            </div>
          </div>

          {/* Search */}
          {!isMobile && <div style={{ position: 'relative' as const }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme.searchBg, border: `1.5px solid ${sucheOffen ? INDIGO + '88' : theme.searchBorder}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', width: 200, transition: 'border-color 0.15s' }}
              onClick={() => { setSucheOffen(true); setGlockeOffen(false) }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.searchIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {sucheOffen
                ? <input ref={sucheRef} value={sucheText} onChange={e => setSucheText(e.target.value)} placeholder="Suchen..." onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: theme.searchText, width: 140, fontFamily: 'DM Sans, sans-serif' }} />
                : <span style={{ color: theme.searchIcon, fontSize: 12 }}>Suchen... ⌘F</span>
              }
            </div>
            {sucheOffen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setSucheOffen(false); setSucheText('') }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 340, ...theme.glass, zIndex: 100, overflow: 'hidden' }}>
                  {suchErgebnisse.length === 0
                    ? <div style={{ padding: 16, color: theme.textMuted, fontSize: 12, textAlign: 'center' as const }}>{sucheText.length === 0 ? 'Suchbegriff eingeben...' : 'Keine Ergebnisse'}</div>
                    : suchErgebnisse.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${theme.divider}`, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => { setAktivNav(r.nav); setSucheOffen(false); setSucheText('') }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textStrong }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{r.sub}</div>
                          </div>
                          {statusChip(r.typ)}
                        </div>
                      ))
                  }
                </div>
              </>
            )}
          </div>}

          {/* Dark/Light Toggle */}
          <button onClick={toggleDark}
            style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: theme.toggleBg, border: `1.5px solid ${theme.toggleBorder}`, color: theme.toggleColor, transition: 'all 0.2s', fontSize: 15 }}
            title={D ? 'Light Mode' : 'Dark Mode'}>
            {D
              ? /* Sun icon */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              : /* Moon icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            }
          </button>

          {/* Bell */}
          <div style={{ position: 'relative' as const }}>
            <button style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: glockeOffen ? `rgba(99,102,241,0.15)` : theme.bellBg, border: `1.5px solid ${glockeOffen ? INDIGO + '66' : theme.bellBorder}`, color: theme.bellColor, position: 'relative' as const }}
              onClick={() => { setGlockeOffen(!glockeOffen); setSucheOffen(false); setSucheText('') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {stats.ueberfaellig > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${theme.bellNotifBorder}` }}>
                  {stats.ueberfaellig}
                </div>
              )}
            </button>
            {glockeOffen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setGlockeOffen(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 310, ...theme.glass, zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, flex: 1 }}>Benachrichtigungen</span>
                    {stats.ueberfaellig > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: D ? '#fca5a5' : '#dc2626' }}>{stats.ueberfaellig} überfällig</span>}
                  </div>
                  {ueberfaelligeListe.length === 0
                    ? <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: theme.textMuted, fontSize: 12 }}><div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>Keine überfälligen Rechnungen</div>
                    : ueberfaelligeListe.map((r: any, i: number) => {
                        const tage = Math.floor((new Date().getTime() - new Date(r.faelligBis).getTime()) / 86400000)
                        return (
                          <div key={i} style={{ padding: '11px 16px', borderBottom: `1px solid ${theme.divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                            onMouseEnter={e => (e.currentTarget.style.background = D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => { setAktivNav('Rechnungen'); setGlockeOffen(false) }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: theme.notifBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: theme.textStrong }}>{r.nummer}</div>
                              <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 1 }}>seit {tage} Tag{tage !== 1 ? 'en' : ''} überfällig</div>
                            </div>
                            {r.gesamt && <span style={{ fontSize: 12, fontWeight: 700, color: theme.textStrong }}>€ {Number(r.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          </div>
                        )
                      })
                  }
                </div>
              </>
            )}
          </div>

          {/* Neu button */}
          {!isMobile && <button style={{ background: `linear-gradient(135deg, ${INDIGO}, ${PURPLE})`, color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9, padding: '8px 16px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 16px rgba(99,102,241,0.35)` }}
            onClick={() => setAktivNav('Rechnungen')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Neu
          </button>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {aktivNav === 'Dashboard' && (
            <>
              {/* Greeting */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: INDIGO, boxShadow: `0 0 12px ${INDIGO}` }} />
                <span style={{ fontSize: 11, color: theme.textMuted, letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600 }}>Übersicht</span>
              </div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: -0.5, color: theme.textStrong }}>
                {gruss}, <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{benutzer.vorname || 'Chef'}</span> 👋
              </h1>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 10 : 14 }}>
                {STAT_CARDS.map((s, i) => (
                  <div key={i} onClick={() => setAktivNav(s.nav)}
                    style={{ ...theme.glass, padding: 22, cursor: 'pointer', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = theme.cardHoverShadow; el.style.borderColor = theme.cardHoverBorder }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = theme.glass.boxShadow as string; el.style.borderColor = (theme.glass.border as string).replace('1px solid ', '') }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`, opacity: 0.7 }} />
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, border: `1px solid ${s.color}33`, marginBottom: 16 }}>
                      {s.icon}
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800, lineHeight: 1, color: s.alarm ? s.color : theme.textStrong, marginBottom: 8 }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: s.alarm ? s.color : theme.textMuted, marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Main grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 18, flex: 1, minHeight: 0 }}>

                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Chart */}
                  <div style={{ ...theme.glass, padding: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: theme.textStrong, marginBottom: 4 }}>Rechnungsvolumen</div>
                        <div style={{ fontSize: 11, color: theme.textMuted }}>Letzte 7 Monate</div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#10b981' }}>
                          € {stats.umsatzJahr >= 1000 ? (stats.umsatzJahr / 1000).toFixed(1) + 'k' : fmt(stats.umsatzJahr)}
                        </div>
                        <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.12)', display: 'inline-block', padding: '2px 9px', borderRadius: 10, marginTop: 4 }}>Bezahlt {new Date().getFullYear()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                      {monatsDaten.map((m, i) => {
                        const pct    = (m.summe / maxMonat) * 100
                        const isLast = i === monatsDaten.length - 1
                        const isPrev = i === monatsDaten.length - 2
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                              <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: isLast ? `linear-gradient(180deg, #818cf8, ${INDIGO})` : isPrev ? `linear-gradient(180deg, #a78bfa, ${PURPLE})` : theme.barEmpty, borderRadius: '6px 6px 3px 3px', boxShadow: isLast ? `0 4px 20px rgba(99,102,241,0.4)` : 'none', position: 'relative' as const }}>
                                {m.summe > 0 && isLast && (
                                  <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#818cf8', fontWeight: 700, whiteSpace: 'nowrap' as const, background: 'rgba(99,102,241,0.12)', padding: '2px 7px', borderRadius: 8 }}>
                                    {m.summe >= 1000 ? '€' + (m.summe / 1000).toFixed(0) + 'k' : '€' + m.summe.toFixed(0)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 10, color: isLast ? theme.textStrong : theme.textMuted, fontWeight: isLast ? 600 : 400 }}>{m.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Activity */}
                  <div style={{ ...theme.glass, padding: 28, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: theme.textStrong }}>Letzte Aktivität</div>
                      <div style={{ display: 'flex', gap: 3, background: theme.filterBg, padding: 4, borderRadius: 24 }}>
                        {['Alle', 'Offen', 'Entwurf', 'Mahnung'].map(f => (
                          <button key={f} onClick={() => setActivityFilter(f)} style={{ padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: activityFilter === f ? theme.filterActiveBg : 'transparent', color: activityFilter === f ? theme.filterActiveColor : theme.filterInactiveColor, transition: 'all 0.15s' }}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {gefilterteAktivitaet.length === 0
                        ? <div style={{ padding: '32px', textAlign: 'center' as const, color: theme.textMuted, fontSize: 13 }}>Keine Einträge</div>
                        : gefilterteAktivitaet.map((r: any, i: number) => {
                            const kunde      = alleKundenDaten.find((k: any) => k.id === r.kundeId)
                            const kundenName = kunde ? (kunde.firma || `${kunde.vorname} ${kunde.nachname}`) : '—'
                            const sc         = (theme.statusCfg as any)[r.status] || (theme.statusCfg as any)['Entwurf']
                            const betrag     = r.gesamt ? Number(r.gesamt) : null
                            return (
                              <div key={i}
                                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 12px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', borderLeft: '3px solid transparent' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; el.style.borderLeftColor = sc.color }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderLeftColor = 'transparent' }}
                                onClick={() => setAktivNav(r.typ === 'Angebot' ? 'Angebote' : 'Rechnungen')}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                  {r.typ === 'Rechnung' ? '🧾' : '📄'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textStrong, marginBottom: 3 }}>{r.nummer}</div>
                                  <div style={{ fontSize: 11, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{kundenName} · {new Date(r.datum).toLocaleDateString('de-AT')}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                  {betrag !== null && betrag > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, fontFamily: 'Syne, sans-serif' }}>€ {fmt(betrag)}</span>}
                                  {statusChip(r.status)}
                                </div>
                              </div>
                            )
                          })
                      }
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Offen ausstehend */}
                  <div style={{ background: theme.openCardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${theme.openCardBorder}`, borderRadius: 20, padding: 26, boxShadow: D ? '0 10px 40px rgba(99,102,241,0.1)' : '0 4px 20px rgba(99,102,241,0.08)', position: 'relative' as const, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: theme.openCardLabel, boxShadow: `0 0 10px ${theme.openCardLabel}` }} />
                      <div style={{ fontSize: 10, color: theme.openCardLabel, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Offen ausstehend</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, color: theme.openCardText, marginBottom: 4, letterSpacing: -0.5 }}>€ {fmt(offenBetrag)}</div>
                    <div style={{ fontSize: 12, color: theme.openCardSub }}>aus {stats.offenGesamt} offenen Rechnungen</div>
                    <div style={{ marginTop: 22, background: theme.progressBg, borderRadius: 8, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${bezahltProzent}%`, height: '100%', background: `linear-gradient(90deg, ${INDIGO}, ${PURPLE})`, borderRadius: 8, boxShadow: '0 0 10px rgba(139,92,246,0.5)', transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: theme.openCardSub, marginTop: 7, fontWeight: 500 }}>
                      <span>{bezahltProzent}% bezahlt</span>
                      <span>Total: € {totalJahr >= 1000 ? (totalJahr / 1000).toFixed(1) + 'k' : fmt(totalJahr)}</span>
                    </div>
                  </div>

                  {/* Top Kunden */}
                  <div style={{ ...theme.glass, padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: theme.textStrong }}>Top Kunden</div>
                      <button style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }} onClick={() => setAktivNav('Kunden')}>Alle →</button>
                    </div>
                    {kunden.length === 0
                      ? <div style={{ textAlign: 'center' as const, color: theme.textMuted, fontSize: 12, padding: '16px 0' }}>Noch keine Kunden</div>
                      : kunden.map((k: any, i: number) => {
                          const cols     = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444']
                          const c        = cols[i % cols.length]
                          const initials = `${k.vorname?.[0] || ''}${k.nachname?.[0] || ''}`.toUpperCase()
                          const anzahl   = alleRechnungenDaten.filter((r: any) => r.kundeId === k.id && r.typ === 'Rechnung').length
                          return (
                            <div key={i}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              onClick={() => setAktivNav('Kunden')}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c}22`, border: `1px solid ${c}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: c, flexShrink: 0 }}>{initials}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: theme.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{k.firma || `${k.vorname} ${k.nachname}`}</div>
                                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{anzahl} Rechnung{anzahl !== 1 ? 'en' : ''}</div>
                              </div>
                            </div>
                          )
                        })
                    }
                  </div>

                  {/* Schnellzugriff */}
                  <div style={{ ...theme.glass, padding: 22 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 14, color: theme.textStrong }}>Schnellzugriff</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Neue Rechnung', icon: '🧾', color: '#6366f1', nav: 'Rechnungen' },
                        { label: 'Neues Angebot', icon: '📄', color: '#10b981', nav: 'Angebote'   },
                        { label: 'Neuer Kunde',   icon: '👤', color: '#f59e0b', nav: 'Kunden'     },
                        { label: 'Einstellungen', icon: '⚙️', color: '#64748b', nav: 'Einstellungen' },
                      ].map((item, i) => (
                        <div key={i} onClick={() => setAktivNav(item.nav)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: `1px solid ${theme.schnellBorder}`, background: theme.schnellBg, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${item.color}11`; el.style.borderColor = `${item.color}44` }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = theme.schnellBg; el.style.borderColor = theme.schnellBorder }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 17 }}>{item.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: theme.schnellText }}>{item.label}</span>
                          </div>
                          <span style={{ color: theme.schnellArrow, fontSize: 18 }}>›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {aktivNav === 'Kunden'           && <div style={{ flex: 1, overflow: 'auto' }}><Kunden /></div>}
          {aktivNav === 'Rechnungen'        && <div style={{ flex: 1, overflow: 'auto' }}><Rechnungen onTransferBeleg={(datei, vorschlag) => { setBelegTransfer({ datei, vorschlag }); setAktivNav('Belegscanner') }} /></div>}
          {aktivNav === 'Angebote'          && <div style={{ flex: 1, overflow: 'auto' }}><Angebote /></div>}
          {aktivNav === 'Stunden'           && <div style={{ flex: 1, overflow: 'auto' }}><Stunden onNavigate={seite => setAktivNav(seite)} /></div>}
          {aktivNav === 'Positionsvorlagen' && <div style={{ flex: 1, overflow: 'auto' }}><Vorlagen /></div>}
          {aktivNav === 'Belegscanner'     && <div style={{ flex: 1, overflow: 'auto' }}><Belegscanner initialDatei={sharedFile || belegTransfer?.datei || null} belegVorschlag={belegTransfer?.vorschlag || null} onSharedFileUsed={() => { setSharedFile(null); setBelegTransfer(null) }} /></div>}
          {aktivNav === 'BuchDashboard'       && <div style={{ flex: 1, overflow: 'auto' }}><KMGuvDashboard /></div>}
          {aktivNav === 'G&V Abrechnung'   && <div style={{ flex: 1, overflow: 'auto' }}><GUV /></div>}
          {aktivNav === 'KM-Buch'          && <div style={{ flex: 1, overflow: 'auto' }}><KMBuch /></div>}
          {aktivNav === 'Reisekosten'       && <div style={{ flex: 1, overflow: 'auto' }}><Reisekosten /></div>}
          {aktivNav === 'Einstellungen'     && <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}><Einstellungen /></div>}
          {aktivNav === 'Objekte'           && <div style={{ flex: 1, overflow: 'auto' }}><ImmoObjekte onChanged={ladeImmoObjekte} onNavigate={id => setAktivNav(`ImmoObj_${id}`)} /></div>}
          {aktivNav === 'Mieter'            && <div style={{ flex: 1, overflow: 'auto' }}><ImmoMieter /></div>}
          {aktivNav === 'Mietverträge'      && <div style={{ flex: 1, overflow: 'auto' }}><ImmoVertraege /></div>}
          {aktivNav === 'Betriebskosten'    && <div style={{ flex: 1, overflow: 'auto' }}><ImmoBetriebskosten /></div>}
          {aktivNav.startsWith('ImmoObj_')  && <div style={{ flex: 1, overflow: 'auto' }}><ImmoObjektDetail objektId={parseInt(aktivNav.replace('ImmoObj_', ''))} initialObjekt={immoObjListe.find((o: any) => o.id === parseInt(aktivNav.replace('ImmoObj_', '')))} onChanged={ladeImmoObjekte} /></div>}
        </div>
      </div>
    </div>
  )
}
