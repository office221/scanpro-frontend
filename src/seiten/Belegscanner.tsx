import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const GOLD = '#c8a96e'
const KATEGORIEN = [
  'Bürobedarf', 'Fahrtkosten', 'Miete & Betrieb',
  'Werkzeug & Material', 'Kommunikation', 'Verpflegung', 'Versicherung', 'Sonstiges'
]
const KAT_ICONS: Record<string, string> = {
  'Bürobedarf': '📎', 'Fahrtkosten': '🚗', 'Miete & Betrieb': '🏢',
  'Werkzeug & Material': '🔧', 'Kommunikation': '📱', 'Verpflegung': '🍽️',
  'Versicherung': '🛡️', 'Sonstiges': '📁'
}
const KAT_FARBEN: Record<string, { bg: string; text: string }> = {
  'Bürobedarf':         { bg: '#dbeafe', text: '#1e40af' },
  'Fahrtkosten':        { bg: '#d1fae5', text: '#065f46' },
  'Miete & Betrieb':    { bg: '#fef3c7', text: '#92400e' },
  'Werkzeug & Material':{ bg: '#f3e8ff', text: '#6b21a8' },
  'Kommunikation':      { bg: '#e0f2fe', text: '#0369a1' },
  'Verpflegung':        { bg: '#fce7f3', text: '#9d174d' },
  'Versicherung':       { bg: '#fef9c3', text: '#854d0e' },
  'Sonstiges':          { bg: '#f0f0f0', text: '#555' },
}

interface Beleg {
  id: number
  dateiname?: string
  datei_typ?: string
  betrag?: number
  datum?: string
  beschreibung?: string
  kategorie?: string
  lieferant?: string
  mwst?: number
  notiz?: string
  rechnungsnummer?: string
  typ?: 'einnahme' | 'ausgabe'
  buero_anteil?: number
  createdAt?: string
  in_guv?: boolean
}

// Effektiver Betrag nach Büroanteil-Abzug
const effBetrag = (b: { betrag?: number; buero_anteil?: number }) =>
  Number(b.betrag || 0) * (b.buero_anteil ?? 100) / 100

const emptyForm = () => ({
  beschreibung: '', betrag: '', datum: new Date().toISOString().split('T')[0],
  kategorie: 'Sonstiges', lieferant: '', mwst: '', notiz: '', rechnungsnummer: '', typ: 'ausgabe',
  abschreibung: false, abschreibungJahre: '3',
  buero_anteil: '100',
})

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: 0.8, color: '#888', marginBottom: 5, display: 'block'
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13,
  border: '1.5px solid #e5e0d8', background: 'white', outline: 'none',
  fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const
}

interface BelegscannerProps {
  initialDatei?: File | null
  onSharedFileUsed?: () => void
}

export default function Belegscanner({ initialDatei, onSharedFileUsed }: BelegscannerProps = {}) {
  const [belege, setBelege]               = useState<Beleg[]>([])
  const [laden, setLaden]                 = useState(false)
  const [formOffen, setFormOffen]         = useState(false)
  const [editBeleg, setEditBeleg]         = useState<Beleg | null>(null)
  const [form, setForm]                   = useState(emptyForm())
  const [datei, setDatei]                 = useState<File | null>(null)
  const [dateiVorschau, setDateiVorschau] = useState<string | null>(null)
  const [filterKat, setFilterKat]         = useState<string>('Alle')
  const [filterMonat, setFilterMonat]     = useState<string>('Alle')
  const [bildModal, setBildModal]         = useState<{ url: string; typ: string; name: string } | null>(null)
  const [dateiLaden, setDateiLaden]       = useState(false)
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [kiLaden, setKiLaden]             = useState(false)
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)
  const [toast, setToast]                 = useState<{ text: string; ok: boolean } | null>(null)
  const [detailBeleg, setDetailBeleg]     = useState<Beleg | null>(null)
  const [detailDateiUrl, setDetailDateiUrl] = useState<string | null>(null)
  const [confirmModal, setConfirmModal]     = useState<{ text: string; onJa: () => void } | null>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { ladeBelege() }, [])

  // Web Share Target: geteilte Datei automatisch in Formular laden
  useEffect(() => {
    if (!initialDatei) return
    setEditBeleg(null)
    setForm(emptyForm())
    onDatei(initialDatei)
    setFormOffen(true)
    onSharedFileUsed?.()
  }, [initialDatei]) // eslint-disable-line react-hooks/exhaustive-deps

  const ladeBelege = async () => {
    setLaden(true)
    try {
      const res = await api.get('/belege')
      setBelege(res.data)
    } catch (e) { console.error(e) }
    setLaden(false)
  }

  const onDatei = (file: File | null) => {
    setDatei(file)
    if (!file) { setDateiVorschau(null); return }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setDateiVorschau(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setDateiVorschau('pdf')
    }
  }

  const oeffnen = (beleg?: Beleg) => {
    setEditBeleg(beleg || null)
    setForm(beleg ? {
      beschreibung:    beleg.beschreibung || '',
      betrag:          beleg.betrag != null ? String(beleg.betrag) : '',
      datum:           beleg.datum ? beleg.datum.split('T')[0] : '',
      kategorie:       beleg.kategorie || 'Sonstiges',
      lieferant:       beleg.lieferant || '',
      mwst:            beleg.mwst != null ? String(beleg.mwst) : '',
      notiz:           beleg.notiz || '',
      rechnungsnummer: beleg.rechnungsnummer || '',
      typ:             beleg.typ || 'ausgabe',
      abschreibung:    false,
      abschreibungJahre: '3',
      buero_anteil:    beleg.buero_anteil != null ? String(beleg.buero_anteil) : '100',
    } : emptyForm())
    setDatei(null)
    setDateiVorschau(null)
    setFormOffen(true)
  }

  const speichern = async () => {
    setSpeichernLaden(true)
    try {
      if (editBeleg) {
        await api.put(`/belege/${editBeleg.id}`, form)
      } else if (form.abschreibung && !editBeleg) {
        // Abschreibung: Betrag auf mehrere Jahre aufteilen
        const jahre = Math.max(1, parseInt(form.abschreibungJahre) || 1)
        const gesamtBetrag = parseFloat(form.betrag) || 0
        const jahresBetrag = Math.round((gesamtBetrag / jahre) * 100) / 100
        const startJahr = new Date(form.datum).getFullYear()
        const startDatum = form.datum

        for (let i = 0; i < jahre; i++) {
          const fd = new FormData()
          const jahrDatum = startDatum.replace(String(startJahr), String(startJahr + i))
          // Letztes Jahr bekommt evtl. Rundungsdifferenz
          const betragDiesesJahr = i === jahre - 1
            ? Math.round((gesamtBetrag - jahresBetrag * (jahre - 1)) * 100) / 100
            : jahresBetrag

          const eintrag = {
            ...form,
            betrag: String(betragDiesesJahr),
            datum: jahrDatum,
            beschreibung: `${form.beschreibung} (AfA ${i + 1}/${jahre})`,
            notiz: `Abschreibung ${startJahr + i} | Gesamtbetrag: €${gesamtBetrag} auf ${jahre} Jahre${form.notiz ? ' | ' + form.notiz : ''}`,
          }
          Object.entries(eintrag).forEach(([k, v]) => {
            if (k !== 'abschreibung' && k !== 'abschreibungJahre') fd.append(k, String(v))
          })
          if (i === 0 && datei) fd.append('datei', datei) // Datei nur beim ersten Eintrag
          await api.post('/belege', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
        zeigeToast(`✅ ${jahre} AfA-Einträge erstellt (je € ${jahresBetrag.toFixed(2)}/Jahr)`)
      } else {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => {
          if (k !== 'abschreibung' && k !== 'abschreibungJahre') fd.append(k, String(v))
        })
        if (datei) fd.append('datei', datei)
        await api.post('/belege', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      await ladeBelege()
      setFormOffen(false)
    } catch (e: any) {
      alert(e?.response?.data?.fehler || 'Fehler beim Speichern')
    }
    setSpeichernLaden(false)
  }

  const kiAuslesen = async () => {
    if (!datei) return
    setKiLaden(true)
    try {
      const fd = new FormData()
      fd.append('datei', datei)
      const res = await api.post('/belege/ki-auslesen', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const d = res.data.daten
      setForm(prev => ({
        ...prev,
        betrag:          d.betrag          != null ? String(d.betrag) : prev.betrag,
        datum:           d.datum           || prev.datum,
        lieferant:       d.lieferant       || prev.lieferant,
        beschreibung:    d.beschreibung    || prev.beschreibung,
        mwst:            d.mwst            != null ? String(d.mwst)   : prev.mwst,
        kategorie:       d.kategorie       || prev.kategorie,
        rechnungsnummer: d.rechnungsnummer || prev.rechnungsnummer,
        typ:             d.typ             || prev.typ,
      }))
    } catch (e: any) {
      alert('KI-Auslesen fehlgeschlagen: ' + (e?.response?.data?.fehler || e.message))
    }
    setKiLaden(false)
  }

  const loeschen = (id: number) => {
    setConfirmModal({
      text: 'Möchten Sie diesen Beleg wirklich löschen?',
      onJa: async () => {
        setConfirmModal(null)
        await api.delete(`/belege/${id}`)
        await ladeBelege()
      }
    })
  }

  const bildOeffnen = async (b: Beleg) => {
    if (!b.datei_typ) return
    setDateiLaden(true)
    try {
      // Mit Auth-Header laden → Blob URL erstellen
      const res = await api.get(`/belege/${b.id}/datei`, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      setBildModal({ url: blobUrl, typ: b.datei_typ, name: b.dateiname || 'Beleg' })
    } catch (e) {
      alert('Datei konnte nicht geladen werden!')
    }
    setDateiLaden(false)
  }

  const bildSchliessen = () => {
    if (bildModal) URL.revokeObjectURL(bildModal.url) // Speicher freigeben
    setBildModal(null)
  }

  const drucken = () => {
    if (!bildModal) return
    const win = window.open('', '_blank')
    if (!win) return
    if (bildModal.typ === 'application/pdf') {
      win.document.write(`<html><body style="margin:0"><embed src="${bildModal.url}" type="application/pdf" width="100%" height="100%" /></body></html>`)
      setTimeout(() => win.print(), 800)
    } else {
      win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000">
        <img src="${bildModal.url}" style="max-width:100%;max-height:100vh;object-fit:contain" onload="window.print()" />
      </body></html>`)
    }
  }

  const herunterladen = () => {
    if (!bildModal) return
    const a = document.createElement('a')
    a.href = bildModal.url
    a.download = bildModal.name
    a.click()
  }

  const zeigeToast = (text: string, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const detailOeffnen = async (b: Beleg) => {
    setDetailBeleg(b)
    setDetailDateiUrl(null)
    if (b.datei_typ) {
      try {
        const res = await api.get(`/belege/${b.id}/datei`, { responseType: 'blob' })
        setDetailDateiUrl(URL.createObjectURL(res.data))
      } catch {}
    }
  }

  const detailSchliessen = () => {
    if (detailDateiUrl) URL.revokeObjectURL(detailDateiUrl)
    setDetailBeleg(null)
    setDetailDateiUrl(null)
  }

  const guvUebertragen = async (b: Beleg, aktualisieren = false) => {
    try {
      const res = await api.post(`/guv/von-beleg/${b.id}`, {})
      setBelege(prev => prev.map(x => x.id === b.id ? { ...x, in_guv: true } : x))
      if (res.data?.aktualisiert || aktualisieren) {
        zeigeToast(`🔄 G&V-Betrag für "${b.beschreibung || 'Beleg'}" aktualisiert!`)
      } else {
        zeigeToast(`✅ "${b.beschreibung || 'Beleg'}" wurde zur G&V übertragen!`)
      }
    } catch (e: any) {
      zeigeToast(e?.response?.data?.fehler || 'Fehler beim Übertragen', false)
    }
  }

  // Gefilterte Belege
  const gefilterlt = belege.filter(b => {
    if (filterKat !== 'Alle' && b.kategorie !== filterKat) return false
    if (filterMonat !== 'Alle') {
      const m = b.datum ? b.datum.substring(0, 7) : ''
      if (m !== filterMonat) return false
    }
    return true
  })

  const monate = Array.from(new Set(belege.map(b => b.datum ? b.datum.substring(0, 7) : '').filter(Boolean))).sort().reverse()
  const summeAusgaben = gefilterlt.filter(b => b.typ === 'ausgabe').reduce((s, b) => s + (Number(b.betrag) || 0), 0)
  const fmt = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Aktionen Buttons (wiederverwendbar) ────────────────────────────────────
  const ActionBtns = ({ b, size = 32 }: { b: Beleg; size?: number }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      <button onClick={() => b.datei_typ && bildOeffnen(b)} title="Datei anzeigen"
        disabled={!b.datei_typ}
        style={{ width: size, height: size, borderRadius: 8, border: '1px solid #e5e0d8', background: b.datei_typ ? '#fdf8f0' : '#fafafa', cursor: b.datei_typ ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.datei_typ ? GOLD : '#ccc', opacity: b.datei_typ ? 1 : 0.5 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <button
        onClick={() => guvUebertragen(b)}
        title={b.in_guv ? 'Bereits in G&V' : 'Zu G&V übertragen'}
        disabled={!!b.in_guv}
        style={{
          width: size, height: size, borderRadius: 8,
          border: b.in_guv ? '1px solid #a7f3d0' : `1px solid ${GOLD}44`,
          background: b.in_guv ? '#d1fae5' : '#fdf8f0',
          cursor: b.in_guv ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: b.in_guv ? '#059669' : GOLD,
        }}>
        {b.in_guv
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        }
      </button>
      <button onClick={() => oeffnen(b)} title="Bearbeiten"
        style={{ width: size, height: size, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button onClick={() => loeschen(b.id)} title="Löschen"
        style={{ width: size, height: size, borderRadius: 8, border: '1px solid #fde8e6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0392b' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Toast Benachrichtigung ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '14px 24px', borderRadius: 14,
          background: toast.ok ? '#0f172a' : '#ef4444',
          color: 'white', fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: '90vw', textAlign: 'center',
          animation: 'fadeInDown 0.3s ease',
        }}>
          {toast.text}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      {isMobile ? (
        /* Mobile Header: kompakt */
        <div style={{ marginBottom: 12 }}>
          {/* Zeile 1: Titel + Add-Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#888' }}>
              {belege.length} Belege
            </div>
            <button onClick={() => oeffnen()}
              style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Neu
            </button>
          </div>
          {/* Zeile 2: Filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={filterMonat} onChange={e => setFilterMonat(e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: '7px 8px', borderRadius: 8, border: `1.5px solid ${filterMonat !== 'Alle' ? '#6366f1' : '#e5e0d8'}`, background: filterMonat !== 'Alle' ? '#f0f0ff' : 'white', color: '#555', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <option value="Alle">Alle Monate</option>
              {monate.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterKat} onChange={e => setFilterKat(e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: '7px 8px', borderRadius: 8, border: `1.5px solid ${filterKat !== 'Alle' ? '#6366f1' : '#e5e0d8'}`, background: filterKat !== 'Alle' ? '#f0f0ff' : 'white', color: '#555', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <option value="Alle">Alle Kategorien</option>
              {KATEGORIEN.map(k => <option key={k} value={k}>{KAT_ICONS[k]} {k}</option>)}
            </select>
          </div>
        </div>
      ) : (
        /* Desktop Header */
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#888' }}>
            {belege.length} Belege gespeichert
          </div>
          <select value={filterMonat} onChange={e => setFilterMonat(e.target.value)}
            style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', color: '#555', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <option value="Alle">Alle Monate</option>
            {monate.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterKat} onChange={e => setFilterKat(e.target.value)}
            style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', color: '#555', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <option value="Alle">Alle Kategorien</option>
            {KATEGORIEN.map(k => <option key={k} value={k}>{KAT_ICONS[k]} {k}</option>)}
          </select>
          <button onClick={() => oeffnen()}
            style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Beleg hinzufügen
          </button>
        </div>
      )}

      {/* ── Statistik-Zeile ───────────────────────────────────────────────────── */}
      {isMobile ? (
        /* Mobile: kompakte Stat-Leiste */
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { label: 'Gesamt', value: `−€ ${fmt(belege.filter(b => b.typ === 'ausgabe').reduce((s, b) => s + effBetrag(b), 0))}`, color: '#ef4444', bg: '#fff1f1' },
            { label: 'Dieser Monat', value: `−€ ${fmt(belege.filter(b => b.typ === 'ausgabe' && b.datum?.startsWith(new Date().toISOString().substring(0, 7))).reduce((s, b) => s + effBetrag(b), 0))}`, color: '#6366f1', bg: '#f5f3ff' },
            { label: 'Belege', value: String(belege.length), color: '#10b981', bg: '#f0fdf4' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '8px 12px', border: `1px solid ${s.color}22`, flexShrink: 0 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: 4-Spalten Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Gesamt Ausgaben', value: `€ ${fmt(belege.filter(b => b.typ === 'ausgabe').reduce((s, b) => s + effBetrag(b), 0))}`, color: '#ef4444' },
            { label: 'Dieser Monat', value: `€ ${fmt(belege.filter(b => b.typ === 'ausgabe' && b.datum?.startsWith(new Date().toISOString().substring(0, 7))).reduce((s, b) => s + effBetrag(b), 0))}`, color: '#6366f1' },
            { label: 'Belege gesamt', value: String(belege.length), color: '#10b981' },
            { label: 'Aktiver Filter', value: (filterKat !== 'Alle' || filterMonat !== 'Alle') ? `${gefilterlt.length} Belege · −€ ${fmt(summeAusgaben)}` : '—', color: GOLD },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e0d8' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabelle (Desktop) / Karten (Mobile) ──────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e0d8', flex: 1, overflow: 'auto' }}>
        {laden ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ color: '#aaa', fontSize: 14 }}>Lädt...</div>
          </div>
        ) : gefilterlt.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>
                Noch keine Belege
              </div>
              <button onClick={() => oeffnen()}
                style={{ background: GOLD, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Ersten Beleg hinzufügen
              </button>
            </div>
          </div>
        ) : isMobile ? (
          /* ── Mobile: Kompakte Liste ───────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {gefilterlt.map((b, idx) => {
              const farben = KAT_FARBEN[b.kategorie || 'Sonstiges'] || KAT_FARBEN['Sonstiges']
              const istLetzte = idx === gefilterlt.length - 1
              return (
                <div key={b.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: istLetzte ? 'none' : '1px solid #f5f2ee', cursor: 'pointer', background: 'white', transition: 'background 0.1s' }}
                  onClick={() => detailOeffnen(b)}
                  onTouchStart={e => (e.currentTarget.style.background = '#faf8f5')}
                  onTouchEnd={e => (e.currentTarget.style.background = 'white')}>

                  {/* Kategorie-Icon Kreis */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: farben.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18,
                  }}>
                    {KAT_ICONS[b.kategorie || 'Sonstiges']}
                  </div>

                  {/* Mitte: Titel + Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                      {b.beschreibung || b.lieferant || b.dateiname || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {b.lieferant && b.beschreibung && (
                        <span style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                          {b.lieferant}
                        </span>
                      )}
                      {b.lieferant && b.beschreibung && b.datum && <span style={{ color: '#ddd', fontSize: 11 }}>·</span>}
                      {b.datum && (
                        <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>
                          {new Date(b.datum).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {b.in_guv && <span style={{ fontSize: 10, color: '#059669' }}>✓ G&V</span>}
                    </div>
                  </div>

                  {/* Rechts: Betrag + Aktionen */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {b.betrag != null && (
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                          color: b.typ === 'einnahme' ? '#059669' : '#ef4444' }}>
                          {b.typ === 'einnahme' ? '+' : '−'}&nbsp;€&nbsp;{fmt(effBetrag(b))}
                        </div>
                        {(b.buero_anteil ?? 100) < 100 && (
                          <div style={{ fontSize: 10, color: '#bbb', textDecoration: 'line-through', textAlign: 'right' }}>
                            € {fmt(Number(b.betrag))}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {/* G&V Button */}
                      <button onClick={() => guvUebertragen(b)} disabled={!!b.in_guv} title={b.in_guv ? 'In G&V' : 'Zu G&V'}
                        style={{ width: 26, height: 26, borderRadius: 6, border: b.in_guv ? '1px solid #a7f3d0' : `1px solid ${GOLD}55`, background: b.in_guv ? '#d1fae5' : '#fdf8f0', cursor: b.in_guv ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.in_guv ? '#059669' : GOLD }}>
                        {b.in_guv
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>}
                      </button>
                      {/* Edit Button */}
                      <button onClick={() => oeffnen(b)} title="Bearbeiten"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Desktop: Tabelle ─────────────────────────────────────────────── */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf8f5' }}>
                {['', 'Art', 'Beschreibung', 'Kategorie', 'Datum', 'Lieferant / Nr.', 'Betrag', 'Aktionen'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 700, borderBottom: '1px solid #e5e0d8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefilterlt.map(b => {
                const farben = KAT_FARBEN[b.kategorie || 'Sonstiges'] || KAT_FARBEN['Sonstiges']
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f0ede8', cursor: 'pointer' }}
                    onClick={() => detailOeffnen(b)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {/* Icon */}
                    <td style={{ padding: '10px 14px', width: 48 }}>
                      <div onClick={() => b.datei_typ && bildOeffnen(b)}
                        style={{ width: 36, height: 36, borderRadius: 8, background: b.datei_typ ? '#fdf8f0' : '#f8f8f8', border: `1px solid ${b.datei_typ ? GOLD + '33' : '#eee'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: b.datei_typ ? 'pointer' : 'default', fontSize: 17 }}>
                        {b.datei_typ?.startsWith('image/') ? '🖼️' : b.datei_typ === 'application/pdf' ? '📄' : KAT_ICONS[b.kategorie || 'Sonstiges']}
                      </div>
                    </td>
                    {/* Typ: Einnahme / Ausgabe */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                        background: b.typ === 'einnahme' ? '#d1fae5' : '#fee2e2',
                        color:      b.typ === 'einnahme' ? '#065f46' : '#991b1b' }}>
                        {b.typ === 'einnahme' ? '↑ Einnahme' : '↓ Ausgabe'}
                      </span>
                    </td>
                    {/* Beschreibung */}
                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.beschreibung || b.dateiname || '—'}
                      </div>
                      {b.mwst != null && Number(b.mwst) > 0 && (
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>MwSt: € {fmt(Number(b.mwst))}</div>
                      )}
                    </td>
                    {/* Kategorie */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: farben.bg, color: farben.text, whiteSpace: 'nowrap' }}>
                        {KAT_ICONS[b.kategorie || 'Sonstiges']} {b.kategorie}
                      </span>
                    </td>
                    {/* Datum */}
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                      {b.datum ? new Date(b.datum).toLocaleDateString('de-AT') : '—'}
                    </td>
                    {/* Lieferant + Rechnungsnr */}
                    <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                      {b.lieferant && <div style={{ fontSize: 12, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.lieferant}</div>}
                      {b.rechnungsnummer && (
                        <span style={{ background: '#f0f4ff', color: '#6366f1', border: '1px solid #6366f122', borderRadius: 6, padding: '1px 7px', fontWeight: 700, fontSize: 11 }}>
                          #{b.rechnungsnummer}
                        </span>
                      )}
                      {!b.lieferant && !b.rechnungsnummer && <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* Betrag */}
                    <td style={{ padding: '10px 14px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap',
                      color: b.typ === 'einnahme' ? '#059669' : '#ef4444' }}>
                      {b.betrag != null ? `${b.typ === 'einnahme' ? '+' : '−'} € ${fmt(effBetrag(b))}` : '—'}
                      {(b.buero_anteil ?? 100) < 100 && b.betrag != null && (
                        <div style={{ fontSize: 10, color: '#bbb', textDecoration: 'line-through', fontWeight: 400 }}>
                          € {fmt(Number(b.betrag))}
                        </div>
                      )}
                    </td>
                    {/* Aktionen */}
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <ActionBtns b={b} size={32} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FORMULAR MODAL ────────────────────────────────────────────────────── */}
      {formOffen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} onClick={() => setFormOffen(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: isMobile ? '95vw' : 540, maxHeight: '90vh', overflowY: 'auto',
            background: 'white', borderRadius: 14, zIndex: 200,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            {/* Modal-Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e0d8', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, flex: 1, color: '#1a1a1a' }}>
                {editBeleg ? '✏️ Beleg bearbeiten' : '🧾 Neuer Beleg'}
              </div>
              <button onClick={() => setFormOffen(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Datei Upload (nur bei neuem Beleg) */}
              {!editBeleg && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Foto / PDF (optional)</label>
                  {!dateiVorschau ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div onClick={() => cameraRef.current?.click()}
                        style={{ flex: 1, border: `2px dashed ${GOLD}88`, borderRadius: 12, padding: '18px 12px', textAlign: 'center', cursor: 'pointer', background: '#fdfaf5' }}>
                        <div style={{ fontSize: 26, marginBottom: 5 }}>📷</div>
                        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>Kamera</div>
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                          onChange={e => onDatei(e.target.files?.[0] || null)} />
                      </div>
                      <div onClick={() => fileRef.current?.click()}
                        style={{ flex: 1, border: '2px dashed #d1d5db', borderRadius: 12, padding: '18px 12px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
                        <div style={{ fontSize: 26, marginBottom: 5 }}>📎</div>
                        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Datei / PDF</div>
                        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                          onChange={e => onDatei(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${GOLD}44` }}>
                      {dateiVorschau === 'pdf'
                        ? <div style={{ padding: 20, textAlign: 'center', background: '#fdf8f0', fontSize: 32 }}>📄<br/><span style={{ fontSize: 12, color: '#888' }}>{datei?.name}</span></div>
                        : <img src={dateiVorschau} alt="Vorschau" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                      }
                      <button onClick={() => { setDatei(null); setDateiVorschau(null) }}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 20, width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  )}

                  {/* KI-Button */}
                  {dateiVorschau && (
                    <button onClick={kiAuslesen} disabled={kiLaden} style={{
                      marginTop: 10, width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                      background: kiLaden ? '#e5e0d8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: kiLaden ? '#aaa' : 'white',
                      fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: kiLaden ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: kiLaden ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                    }}>
                      {kiLaden ? '⏳ KI liest Beleg aus...' : '🤖 KI automatisch auslesen'}
                    </button>
                  )}
                </div>
              )}

              {/* Felder */}

              {/* Einnahme / Ausgabe Toggle */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Art *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['ausgabe', 'einnahme'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm({...form, typ: t})}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer',
                        fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800,
                        border: form.typ === t
                          ? `2px solid ${t === 'einnahme' ? '#059669' : '#ef4444'}`
                          : '2px solid #e5e0d8',
                        background: form.typ === t
                          ? (t === 'einnahme' ? '#d1fae5' : '#fee2e2')
                          : 'white',
                        color: form.typ === t
                          ? (t === 'einnahme' ? '#065f46' : '#991b1b')
                          : '#999',
                        transition: 'all 0.15s',
                      }}>
                      {t === 'ausgabe' ? '↓ Ausgabe' : '↑ Einnahme'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>
                  {form.typ === 'ausgabe'
                    ? '💸 Ausgabe: z.B. Einkauf, Rechnung, Betriebskosten'
                    : '💰 Einnahme: z.B. Bareinnahme, erhaltene Zahlung'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Betrag (€) *</label>
                  <input style={inputStyle} type="number" step="0.01" placeholder="0,00" value={form.betrag} onChange={e => setForm({...form, betrag: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Datum *</label>
                  <input style={inputStyle} type="date" value={form.datum} onChange={e => setForm({...form, datum: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Beschreibung</label>
                <input style={inputStyle} placeholder="z.B. Büromaterial Hornbach" value={form.beschreibung} onChange={e => setForm({...form, beschreibung: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Kategorie</label>
                  <select style={{ ...inputStyle, background: 'white' }} value={form.kategorie} onChange={e => setForm({...form, kategorie: e.target.value})}>
                    {KATEGORIEN.map(k => <option key={k} value={k}>{KAT_ICONS[k]} {k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Lieferant</label>
                  <input style={inputStyle} placeholder="Firma / Name" value={form.lieferant} onChange={e => setForm({...form, lieferant: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  Rechnungsnummer / Belegnummer
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: '#aaa', textTransform: 'none', letterSpacing: 0 }}>
                    (verhindert Doppelerfassung)
                  </span>
                </label>
                <input style={{ ...inputStyle, borderColor: form.rechnungsnummer ? '#6366f1' : undefined }}
                  placeholder="z.B. RE-2024-001 oder KA-00123"
                  value={form.rechnungsnummer}
                  onChange={e => setForm({...form, rechnungsnummer: e.target.value})} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>MwSt (€)</label>
                <input style={inputStyle} type="number" step="0.01" placeholder="0,00" value={form.mwst} onChange={e => setForm({...form, mwst: e.target.value})} />
              </div>

              {/* Abschreibung */}
              {!editBeleg && (
                <div style={{ marginBottom: 14, background: form.abschreibung ? '#fdf8f0' : '#fafafa', borderRadius: 10, padding: '12px 14px', border: `1.5px solid ${form.abschreibung ? '#c8a96e' : '#e5e0d8'}`, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setForm({...form, abschreibung: !form.abschreibung})}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${form.abschreibung ? '#c8a96e' : '#ccc'}`,
                      background: form.abschreibung ? '#c8a96e' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                    }}>
                      {form.abschreibung && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>📉 Abschreibung (AfA)</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Betrag auf mehrere Jahre aufteilen</div>
                    </div>
                  </div>
                  {form.abschreibung && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Anzahl Jahre</label>
                        <input style={inputStyle} type="number" min="2" max="20" value={form.abschreibungJahre}
                          onChange={e => setForm({...form, abschreibungJahre: e.target.value})} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Je Jahr</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#c8a96e', fontFamily: 'Syne, sans-serif' }}>
                          € {form.betrag && form.abschreibungJahre
                            ? (parseFloat(form.betrag) / parseInt(form.abschreibungJahre)).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0,00'}
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#aaa', background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #e5e0d8' }}>
                        📅 Erstellt {form.abschreibungJahre || '?'} Belege: {
                          Array.from({ length: Math.min(parseInt(form.abschreibungJahre) || 0, 5) }, (_, i) =>
                            new Date(form.datum).getFullYear() + i
                          ).join(', ')
                        }{parseInt(form.abschreibungJahre) > 5 ? ', ...' : ''}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Büro/Privat Aufteilung */}
              {form.typ === 'ausgabe' && (() => {
                const anteil = parseInt(form.buero_anteil) || 100
                const privat = 100 - anteil
                const betragNum = parseFloat(form.betrag) || 0
                const bueroEur = (betragNum * anteil / 100).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const privatEur = (betragNum * privat / 100).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const istAutoNotiz = (n: string) => !n || /^\d+% Büroanteil/.test(n)
                const genNotiz = (a: number) => {
                  const p = 100 - a
                  const bN = parseFloat(form.betrag) || 0
                  const bEur = (bN * a / 100).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  const pEur = (bN * p / 100).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  return bN > 0
                    ? `${a}% Büroanteil (€ ${bEur}) wurde abgezogen – ${p}% Privatnutzung (€ ${pEur})`
                    : `${a}% Büroanteil – ${p}% Privatnutzung`
                }
                return (
                  <div style={{ marginBottom: 14, background: anteil < 100 ? '#f0f7ff' : '#fafafa', borderRadius: 10, padding: '12px 14px', border: `1.5px solid ${anteil < 100 ? '#6366f144' : '#e5e0d8'}`, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      onClick={() => {
                        const neuerAnteil = anteil < 100 ? 100 : 50
                        const neueNotiz = neuerAnteil < 100
                          ? genNotiz(neuerAnteil)
                          : (istAutoNotiz(form.notiz) ? '' : form.notiz)
                        setForm({...form, buero_anteil: String(neuerAnteil), notiz: neueNotiz})
                      }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, border: `2px solid ${anteil < 100 ? '#6366f1' : '#ccc'}`,
                        background: anteil < 100 ? '#6366f1' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                      }}>
                        {anteil < 100 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>🏢 Teilweise privat (Büro/Privat-Aufteilung)</div>
                        <div style={{ fontSize: 11, color: '#888' }}>z.B. Internet 50% Büro / 50% privat</div>
                      </div>
                    </div>
                    {anteil < 100 && (
                      <div style={{ marginTop: 12 }}>
                        <label style={labelStyle}>Büroanteil: {anteil}%</label>
                        <input type="range" min="10" max="90" step="10"
                          value={form.buero_anteil}
                          onChange={e => {
                            const a = parseInt(e.target.value)
                            setForm({...form, buero_anteil: e.target.value,
                              notiz: istAutoNotiz(form.notiz) ? genNotiz(a) : form.notiz})
                          }}
                          style={{ width: '100%', accentColor: '#6366f1', marginBottom: 8 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          {[10, 20, 25, 30, 50, 60, 75, 80, 90].map(p => (
                            <button key={p} type="button"
                              onClick={() => setForm({...form, buero_anteil: String(p),
                                notiz: istAutoNotiz(form.notiz) ? genNotiz(p) : form.notiz})}
                              style={{ padding: '3px 7px', borderRadius: 6, border: anteil === p ? '2px solid #6366f1' : '1px solid #e5e0d8', background: anteil === p ? '#ede9fe' : 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: anteil === p ? '#4f46e5' : '#888' }}>
                              {p}%
                            </button>
                          ))}
                        </div>
                        {/* Rechner-Box */}
                        <div style={{ background: '#ede9fe', borderRadius: 10, padding: '10px 14px', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>🏢 Büroanteil ({anteil}%)</div>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#4f46e5' }}>€ {bueroEur}</div>
                            <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 1 }}>wird zur G&V übertragen</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: '#9333ea', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>🏠 Privatanteil ({privat}%)</div>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#9333ea' }}>€ {privatEur}</div>
                            <div style={{ fontSize: 10, color: '#d8b4fe', marginTop: 1 }}>wird nicht übertragen</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Notiz</label>
                <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' as const }} placeholder="Optionale Notiz..." value={form.notiz} onChange={e => setForm({...form, notiz: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setFormOffen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Abbrechen
                </button>
                <button onClick={speichern} disabled={speichernLaden}
                  style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                  {speichernLaden ? '⏳ Speichert...' : editBeleg ? '💾 Speichern' : '✅ Beleg hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DETAIL MODAL ─────────────────────────────────────────────────────── */}
      {detailBeleg && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 249 }} onClick={detailSchliessen} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: isMobile ? '95vw' : 680, maxHeight: '90vh', overflowY: 'auto',
            background: 'white', borderRadius: 16, zIndex: 250,
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ece4', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: detailBeleg.typ === 'einnahme' ? '#d1fae5' : '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
              }}>
                {KAT_ICONS[detailBeleg.kategorie || 'Sonstiges']}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detailBeleg.beschreibung || detailBeleg.lieferant || detailBeleg.dateiname || 'Beleg'}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                  {detailBeleg.datum ? new Date(detailBeleg.datum).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: detailBeleg.typ === 'einnahme' ? '#059669' : '#ef4444' }}>
                  {detailBeleg.typ === 'einnahme' ? '+' : '−'} € {fmt(effBetrag(detailBeleg))}
                </div>
                {(detailBeleg.buero_anteil ?? 100) < 100 && detailBeleg.betrag != null && (
                  <div style={{ fontSize: 11, color: '#bbb', textDecoration: 'line-through', marginTop: -2 }}>
                    € {fmt(Number(detailBeleg.betrag))} (gesamt)
                  </div>
                )}
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
                  background: detailBeleg.typ === 'einnahme' ? '#d1fae5' : '#fee2e2',
                  color: detailBeleg.typ === 'einnahme' ? '#065f46' : '#991b1b'
                }}>
                  {detailBeleg.typ === 'einnahme' ? '↑ Einnahme' : '↓ Ausgabe'}
                </span>
              </div>
              <button onClick={detailSchliessen} style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: '#555', flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : detailDateiUrl ? '1fr 1fr' : '1fr', gap: 0 }}>
              {/* Infos Links */}
              <div style={{ padding: '20px 24px', borderRight: detailDateiUrl && !isMobile ? '1px solid #f0ece4' : 'none' }}>

                {/* Info-Zeilen */}
                {[
                  { icon: '🏪', label: 'Lieferant', value: detailBeleg.lieferant },
                  { icon: '📂', label: 'Kategorie', value: detailBeleg.kategorie },
                  { icon: '📅', label: 'Datum', value: detailBeleg.datum ? new Date(detailBeleg.datum).toLocaleDateString('de-AT') : null },
                  { icon: '#️⃣', label: 'Rechnungsnr.', value: detailBeleg.rechnungsnummer },
                  { icon: '💶', label: 'MwSt', value: detailBeleg.mwst ? `€ ${fmt(Number(detailBeleg.mwst))}` : null },
                  { icon: '📝', label: 'Notiz', value: detailBeleg.notiz },
                ].map(row => row.value ? (
                  <div key={row.label} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', fontWeight: 700, marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{row.value}</div>
                    </div>
                  </div>
                ) : null)}

                {/* Büro/Privat Aufteilung */}
                {detailBeleg.typ === 'ausgabe' && detailBeleg.buero_anteil != null && detailBeleg.buero_anteil < 100 && (
                  <div style={{ marginBottom: 14, background: '#ede9fe', borderRadius: 10, padding: '10px 14px', border: '1px solid #c4b5fd' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>🏢 Büro/Privat-Aufteilung</div>
                    <div style={{ fontSize: 13, color: '#4f46e5', fontWeight: 700 }}>
                      {detailBeleg.buero_anteil}% Büroanteil → € {fmt(Number(detailBeleg.betrag || 0) * detailBeleg.buero_anteil / 100)} verrechnet
                    </div>
                    <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
                      {100 - detailBeleg.buero_anteil}% privat (€ {fmt(Number(detailBeleg.betrag || 0) * (100 - detailBeleg.buero_anteil) / 100)}) werden nicht übertragen
                    </div>
                  </div>
                )}

                {/* G&V Status */}
                <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: detailBeleg.in_guv ? '#d1fae5' : '#fdf8f0', border: `1px solid ${detailBeleg.in_guv ? '#a7f3d0' : GOLD + '44'}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: detailBeleg.in_guv ? '#059669' : GOLD }}>
                    {detailBeleg.in_guv ? '✅ In G&V übertragen' : '⏳ Noch nicht in G&V'}
                  </div>
                  {!detailBeleg.in_guv && (
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>Klicke auf ↓ um zur G&V zu übertragen</div>
                  )}
                  {detailBeleg.in_guv && detailBeleg.typ === 'ausgabe' && (detailBeleg.buero_anteil ?? 100) < 100 && (
                    <button
                      onClick={() => { guvUebertragen(detailBeleg, true); detailSchliessen(); }}
                      style={{ marginTop: 8, width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #6d28d9', background: '#ede9fe', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#6d28d9' }}>
                      🔄 G&V-Betrag aktualisieren ({detailBeleg.buero_anteil ?? 100}% = € {((detailBeleg.betrag ?? 0) * (detailBeleg.buero_anteil ?? 100) / 100).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </button>
                  )}
                </div>
              </div>

              {/* Datei Vorschau Rechts */}
              {detailDateiUrl && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', fontWeight: 700 }}>📎 Beleg-Datei</div>
                  {detailBeleg.datei_typ === 'application/pdf' ? (
                    <embed src={detailDateiUrl} type="application/pdf" style={{ width: '100%', height: 260, borderRadius: 10, border: '1px solid #e5e0d8' }} />
                  ) : (
                    <img src={detailDateiUrl} alt="Beleg" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10, border: '1px solid #e5e0d8', background: '#faf8f5', cursor: 'zoom-in' }}
                      onClick={() => setBildModal({ url: detailDateiUrl!, typ: detailBeleg.datei_typ!, name: detailBeleg.dateiname || 'Beleg' })} />
                  )}
                  <button onClick={() => setBildModal({ url: detailDateiUrl!, typ: detailBeleg.datei_typ!, name: detailBeleg.dateiname || 'Beleg' })}
                    style={{ background: '#fdf8f0', border: `1px solid ${GOLD}44`, borderRadius: 8, padding: '8px', fontSize: 12, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
                    🔍 Vollbild anzeigen
                  </button>
                </div>
              )}
            </div>

            {/* Footer Aktionen */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f0ece4', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { detailSchliessen(); oeffnen(detailBeleg); }}
                style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                ✏️ Bearbeiten
              </button>
              {!detailBeleg.in_guv && (
                <button onClick={() => { guvUebertragen(detailBeleg); detailSchliessen(); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1.5px solid ${GOLD}66`, background: '#fdf8f0', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: GOLD }}>
                  ↓ Zu G&V übertragen
                </button>
              )}
              {detailBeleg.in_guv && detailBeleg.typ === 'ausgabe' && (detailBeleg.buero_anteil ?? 100) < 100 && (
                <button onClick={() => { guvUebertragen(detailBeleg, true); detailSchliessen(); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #6d28d9', background: '#ede9fe', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6d28d9' }}>
                  🔄 G&V aktualisieren
                </button>
              )}
              <button onClick={() => { detailSchliessen(); loeschen(detailBeleg.id); }}
                style={{ padding: '10px 16px', borderRadius: 9, border: '1.5px solid #fde8e6', background: 'white', fontSize: 13, cursor: 'pointer', color: '#c0392b' }}>
                🗑
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Bestätigungs-Modal Löschen ───────────────────────────────────────── */}
      {confirmModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1500 }} onClick={() => setConfirmModal(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: 20, width: '90%', maxWidth: 380,
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)', zIndex: 1501,
            fontFamily: 'DM Sans, sans-serif', overflow: 'hidden',
          }}>
            <div style={{ padding: '28px 24px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a2a3a', marginBottom: 8 }}>
                Wirklich löschen?
              </div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                {confirmModal.text}
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </div>
            </div>
            <div style={{ padding: '12px 20px 22px', display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e0d8',
                background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#555',
              }}>Abbrechen</button>
              <button onClick={confirmModal.onJa} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
              }}>Ja, löschen</button>
            </div>
          </div>
        </>
      )}

      {/* ── LADE-INDIKATOR ───────────────────────────────────────────────────── */}
      {dateiLaden && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 299, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 36px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#1a1a1a' }}>Datei wird geladen...</div>
          </div>
        </div>
      )}

      {/* ── DATEI VIEWER MODAL ───────────────────────────────────────────────── */}
      {bildModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 299, display: 'flex', flexDirection: 'column' }}
          onClick={bildSchliessen}>

          {/* Toolbar oben */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }}
            onClick={e => e.stopPropagation()}>
            {/* Dateiname */}
            <div style={{ flex: 1, color: '#e8e8e8', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bildModal.typ === 'application/pdf' ? '📄' : '🖼️'} {bildModal.name}
            </div>

            {/* Drucken */}
            <button onClick={drucken} title="Drucken"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', background: GOLD, color: '#0a0a0a', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Drucken
            </button>

            {/* Herunterladen */}
            <button onClick={herunterladen} title="Herunterladen"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Speichern
            </button>

            {/* Schließen */}
            <button onClick={bildSchliessen} title="Schließen"
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              ✕
            </button>
          </div>

          {/* Datei-Inhalt */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            {bildModal.typ === 'application/pdf' ? (
              /* PDF → embed für beste Kompatibilität */
              <embed
                src={bildModal.url}
                type="application/pdf"
                style={{ width: '100%', height: '100%', borderRadius: 8, border: 'none', background: 'white' }}
              />
            ) : (
              /* Bild */
              <img
                src={bildModal.url}
                alt={bildModal.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
