import React, { useState, useEffect } from 'react'
import api from '../services/api'

const TYP_FARBEN: Record<string, { bg: string; text: string }> = {
  Wohnung:      { bg: '#dbeafe', text: '#1e40af' },
  Haus:         { bg: '#d1f5e0', text: '#2d6a4f' },
  Gewerbe:      { bg: '#ede9fe', text: '#6d28d9' },
  Büro:         { bg: '#fef3c7', text: '#92400e' },
  Garage:       { bg: '#f0f0f0', text: '#555' },
  Rohdachboden: { bg: '#fce7f3', text: '#9d174d' },
  Sonstiges:    { bg: '#f0ede8', text: '#888' },
}
const TYP_OPTIONEN = ['Wohnung', 'Haus', 'Gewerbe', 'Büro', 'Garage', 'Rohdachboden', 'Sonstiges']
const leer = { name: '', typ: 'Wohnung', adresse: '', flaeche: '', zimmer: '', baujahr: '', kaufpreis: '', notizen: '' }
const fmt = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TABS = [
  { id: 'uebersicht',      label: 'Übersicht' },
  { id: 'bonitaet',        label: 'Bonität' },
  { id: 'betriebskosten',  label: 'Betriebskosten' },
  { id: 'darlehen',        label: 'Darlehen' },
  { id: 'stammdaten',      label: 'Stammdaten' },
  { id: 'finanzen',        label: 'Finanzen' },
  { id: 'bau',             label: 'Bau & Instandsetzung' },
  { id: 'vermietung',      label: 'Vermietung' },
  { id: 'verwaltung',      label: 'Verwaltung' },
]
const TAB_KAT: Record<string, string> = {
  stammdaten: 'Stammdaten', finanzen: 'Finanzen', bau: 'Bau', vermietung: 'Vermietung', verwaltung: 'Verwaltung'
}

export default function ImmoObjektDetail({ objektId, initialObjekt, onChanged }: { objektId: number; initialObjekt?: any; onChanged?: () => void }) {
  const [objekt,      setObjekt]      = useState<any>(initialObjekt || null)
  const [vertraege,   setVertraege]   = useState<any[]>([])
  const [bk,          setBk]          = useState<any[]>([])
  const [checkliste,  setCheckliste]  = useState<any[]>([])
  const [laden,       setLaden]       = useState(true)
  const [aktTab,      setAktTab]      = useState('uebersicht')
  const [editOffen,   setEditOffen]   = useState(false)
  const [form,        setForm]        = useState({ ...leer })
  const [saveLaden,   setSaveLaden]   = useState(false)
  const [neueAufgabe,     setNeueAufgabe]     = useState('')
  const [notizOffen,      setNotizOffen]      = useState<number | null>(null)
  const [notizText,       setNotizText]       = useState('')
  const [bkVertraege,       setBkVertraege]       = useState<any[]>([])
  const [bkBelege,          setBkBelege]          = useState<any[]>([])
  const [bkMonat,           setBkMonat]           = useState(new Date().getMonth() + 1)
  const [bkJahr,            setBkJahr]            = useState(new Date().getFullYear())
  const [darlehen,          setDarlehen]          = useState<any[]>([])
  const [darlehenZahlungen, setDarlehenZahlungen] = useState<Record<number,any[]>>({})
  const [verbindlichkeiten, setVerbindlichkeiten] = useState<any[]>([])
  const [finanzdaten,     setFinanzdaten]     = useState<any>({ nettoEinkommen: 0, mieteinnahmenNetto: 0, betriebskostenNichtUmlagefaehig: 0, instandhaltungspauschale: 0, neueKreditRate: 0, gesamtvermoegen: 0 })
  const [finanzForm,      setFinanzForm]      = useState<any>({ nettoEinkommen: '', mieteinnahmenNetto: '', betriebskostenNichtUmlagefaehig: '', instandhaltungspauschale: '', neueKreditRate: '', gesamtvermoegen: '' })
  const [verbForm,        setVerbForm]        = useState<any>({ kreditTyp: 'Hypothek', glaeubiger: '', restsumme: '', monatlicheRate: '', sollzins: '', zinsbindungEnde: '', laufzeitEnde: '', notiz: '' })
  const [verbEditId,      setVerbEditId]      = useState<number | null>(null)
  const [verbFormOffen,   setVerbFormOffen]   = useState(false)
  const [finanzSaved,     setFinanzSaved]     = useState(false)
  const jahr = new Date().getFullYear()

  const ladeDaten = async () => {
    setLaden(true)
    try {
      const objRes = await api.get('/immo/objekte')
      // eslint-disable-next-line eqeqeq
      const obj = (objRes.data as any[]).find((o: any) => o.id == objektId)
      if (obj) setObjekt(obj)
    } catch {}
    try {
      const vertRes = await api.get('/immo/vertraege')
      // eslint-disable-next-line eqeqeq
      setVertraege((vertRes.data as any[]).filter((v: any) => v.objektId == objektId))
    } catch {}
    try {
      const bkRes = await api.get(`/immo/betriebskosten?objektId=${objektId}&jahr=${jahr}`)
      setBk(bkRes.data)
    } catch {}
    try {
      const ckRes = await api.get(`/immo/checkliste/${objektId}`)
      setCheckliste(ckRes.data)
    } catch {}
    try {
      const vRes = await api.get(`/immo/verbindlichkeiten/${objektId}`)
      setVerbindlichkeiten(vRes.data)
    } catch {}
    try {
      const bkvRes = await api.get(`/immo/bk-vertraege/${objektId}`)
      setBkVertraege(bkvRes.data)
    } catch {}
    try {
      const bkbRes = await api.get(`/immo/bk-belege/${objektId}`)
      setBkBelege(bkbRes.data)
    } catch {}
    try {
      const dRes = await api.get(`/immo/darlehen/${objektId}`)
      setDarlehen(dRes.data)
    } catch {}
    try {
      const fRes = await api.get(`/immo/finanzdaten/${objektId}`)
      if (fRes.data) {
        setFinanzdaten(fRes.data)
        setFinanzForm({ nettoEinkommen: fRes.data.nettoEinkommen||'', mieteinnahmenNetto: fRes.data.mieteinnahmenNetto||'', betriebskostenNichtUmlagefaehig: fRes.data.betriebskostenNichtUmlagefaehig||'', instandhaltungspauschale: fRes.data.instandhaltungspauschale||'', neueKreditRate: fRes.data.neueKreditRate||'', gesamtvermoegen: fRes.data.gesamtvermoegen||'' })
      }
    } catch {}
    setLaden(false)
  }

  useEffect(() => { ladeDaten() }, [objektId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleErledigt = async (item: any) => {
    const neu = !item.erledigt
    setCheckliste(prev => prev.map(c => c.id === item.id ? { ...c, erledigt: neu } : c))
    try { await api.put(`/immo/checkliste/${item.id}`, { erledigt: neu, notiz: item.notiz }) } catch {}
  }

  const speichereNotiz = async (item: any) => {
    setCheckliste(prev => prev.map(c => c.id === item.id ? { ...c, notiz: notizText } : c))
    try { await api.put(`/immo/checkliste/${item.id}`, { erledigt: item.erledigt, notiz: notizText }) } catch {}
    setNotizOffen(null)
  }

  const loescheAufgabe = async (id: number) => {
    setCheckliste(prev => prev.filter(c => c.id !== id))
    try { await api.delete(`/immo/checkliste/${id}`) } catch {}
  }

  const neueAufgabeHinzufuegen = async (kategorie: string) => {
    if (!neueAufgabe.trim()) return
    try {
      const res = await api.post('/immo/checkliste', { objektId, kategorie, aufgabe: neueAufgabe.trim() })
      setCheckliste(prev => [...prev, res.data])
      setNeueAufgabe('')
    } catch {}
  }

  const oeffneEdit = () => {
    if (!objekt) return
    setForm({ name: objekt.name||'', typ: objekt.typ||'Wohnung', adresse: objekt.adresse||'', flaeche: objekt.flaeche||'', zimmer: objekt.zimmer||'', baujahr: objekt.baujahr||'', kaufpreis: objekt.kaufpreis||'', notizen: objekt.notizen||'' })
    setEditOffen(true)
  }

  const speichern = async () => {
    if (!form.name.trim()) return
    setSaveLaden(true)
    try {
      await api.put(`/immo/objekte/${objektId}`, { ...form, flaeche: form.flaeche ? parseFloat(form.flaeche) : null, zimmer: form.zimmer ? parseInt(form.zimmer) : null, baujahr: form.baujahr ? parseInt(form.baujahr) : null, kaufpreis: form.kaufpreis ? parseFloat(form.kaufpreis) : null })
      setEditOffen(false)
      await ladeDaten()
      onChanged?.()
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
    setSaveLaden(false)
  }

  if (laden) return <div style={{ padding: 40, textAlign: 'center', color: '#333', background: '#fff', minHeight: 300, fontSize: 18 }}>⏳ Lädt Objekt {objektId}...</div>
  if (!objekt) return <div style={{ padding: 40, textAlign: 'center', color: '#e00', background: '#fff', minHeight: 300, fontSize: 18 }}>❌ Objekt nicht gefunden (ID: {objektId}). Bitte Backend prüfen.</div>

  const aktiverV    = vertraege.find(v => v.status === 'Aktiv')
  const monatEin    = aktiverV ? (parseFloat(aktiverV.mietzins||0) + parseFloat(aktiverV.bk_pauschale||0)) : 0
  const jahrEin     = monatEin * 12
  const jahrBK      = bk.reduce((s, b) => s + parseFloat(b.betrag||0), 0)
  const netto       = jahrEin - jahrBK
  const farbe       = TYP_FARBEN[objekt.typ] || TYP_FARBEN.Sonstiges

  const ckKat = (kat: string) => checkliste.filter(c => c.kategorie === kat)
  const progress = (kat: string) => {
    const items = ckKat(kat)
    if (!items.length) return 0
    return Math.round((items.filter(c => c.erledigt).length / items.length) * 100)
  }
  const gesamtProgress = () => {
    if (!checkliste.length) return 0
    return Math.round((checkliste.filter(c => c.erledigt).length / checkliste.length) * 100)
  }

  const renderCheckliste = (kategorie: string) => {
    const items = ckKat(kategorie)
    const pct = progress(kategorie)
    return (
      <div>
        {/* Fortschritt */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#888' }}>
            <span>{items.filter(c => c.erledigt).length} von {items.length} erledigt</span>
            <span style={{ fontWeight: 700, color: pct === 100 ? '#10b981' : '#1a2a3a' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#6366f1', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: item.erledigt ? '#f0fdf4' : 'white', border: `1px solid ${item.erledigt ? '#bbf7d0' : '#e5e0d8'}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button onClick={() => toggleErledigt(item)} style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.erledigt ? '#10b981' : '#d1d5db'}`, background: item.erledigt ? '#10b981' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {item.erledigt && <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: item.erledigt ? '#6b7280' : '#1a2a3a', textDecoration: item.erledigt ? 'line-through' : 'none' }}>{item.aufgabe}</div>
                  {item.notiz && <div style={{ fontSize: 11, color: '#888', marginTop: 3, fontStyle: 'italic' }}>📝 {item.notiz}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setNotizOffen(item.id); setNotizText(item.notiz||'') }} title="Notiz" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa', padding: 2 }}>📝</button>
                  <button onClick={() => loescheAufgabe(item.id)} title="Löschen" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa', padding: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}>🗑</button>
                </div>
              </div>
              {/* Notiz-Eingabe */}
              {notizOffen === item.id && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0ede8' }}>
                  <textarea value={notizText} onChange={e => setNotizText(e.target.value)} placeholder="Notiz hinzufügen..." style={{ width: '100%', padding: '6px 10px', border: '1px solid #e5e0d8', borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans, sans-serif', resize: 'none', minHeight: 50, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => setNotizOffen(null)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer' }}>Abbrechen</button>
                    <button onClick={() => speichereNotiz(item)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: 'white', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Speichern</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Neue Aufgabe hinzufügen */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={neueAufgabe} onChange={e => setNeueAufgabe(e.target.value)} onKeyDown={e => e.key === 'Enter' && neueAufgabeHinzufuegen(kategorie)} placeholder="+ Eigene Aufgabe hinzufügen..." style={{ flex: 1, padding: '8px 12px', border: '1px dashed #d1d5db', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fafafa' }} />
          <button onClick={() => neueAufgabeHinzufuegen(kategorie)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>+</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e0d8', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 24 }}>🏠</span>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a2a3a' }}>{objekt.name}</div>
              <span style={{ background: farbe.bg, color: farbe.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{objekt.typ}</span>
            </div>
            {objekt.adresse && <div style={{ color: '#888', fontSize: 12 }}>📍 {objekt.adresse}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Gesamt-Fortschritt */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Projekt-Fortschritt</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 100, height: 8, background: '#f0ede8', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${gesamtProgress()}%`, background: gesamtProgress() === 100 ? '#10b981' : '#6366f1', borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: gesamtProgress() === 100 ? '#10b981' : '#1a2a3a' }}>{gesamtProgress()}%</span>
              </div>
            </div>
            <button onClick={oeffneEdit} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ Bearbeiten</button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => {
          const kat = TAB_KAT[t.id]
          const pct = kat ? progress(kat) : null
          return (
            <button key={t.id} onClick={() => setAktTab(t.id)} style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${aktTab === t.id ? '#1a2a3a' : '#e5e0d8'}`, background: aktTab === t.id ? '#1a2a3a' : 'white', color: aktTab === t.id ? 'white' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              {pct !== null && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: pct === 100 ? '#10b981' : aktTab === t.id ? 'rgba(255,255,255,0.2)' : '#f0ede8', color: pct === 100 ? 'white' : aktTab === t.id ? 'white' : '#888' }}>{pct}%</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Inhalte ── */}

      {/* ÜBERSICHT */}
      {aktTab === 'uebersicht' && (
        <div>
          {/* Finanz-Karten */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Monatl. Einnahmen', value: `€ ${fmt(monatEin)}`,  color: '#10b981', icon: '💰', sub: 'Miete + BK' },
              { label: `Jahreseinnahmen`,   value: `€ ${fmt(jahrEin)}`,   color: '#6366f1', icon: '📈', sub: jahr.toString() },
              { label: 'Betriebskosten',    value: `€ ${fmt(jahrBK)}`,    color: '#f59e0b', icon: '📊', sub: `${bk.length} Positionen` },
              { label: 'Nettoertrag',       value: `€ ${fmt(netto)}`,     color: netto >= 0 ? '#10b981' : '#ef4444', icon: netto >= 0 ? '✅' : '⚠️', sub: 'Einnahmen − BK' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Stammdaten Chips */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1a2a3a' }}>📐 Objekt-Daten</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {objekt.flaeche   && <Chip label={`📐 ${objekt.flaeche} m²`} />}
              {objekt.zimmer    && <Chip label={`🛏 ${objekt.zimmer} Zimmer`} />}
              {objekt.baujahr   && <Chip label={`🏗 Baujahr ${objekt.baujahr}`} />}
              {objekt.kaufpreis && <Chip label={`💶 € ${fmt(parseFloat(objekt.kaufpreis))} Kaufpreis`} />}
              {!objekt.flaeche && !objekt.zimmer && !objekt.baujahr && !objekt.kaufpreis && <span style={{ color: '#aaa', fontSize: 12 }}>Keine Stammdaten eingetragen — Bearbeiten klicken</span>}
            </div>
          </div>

          {/* Aktiver Vertrag */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1a2a3a' }}>👤 Aktives Mietverhältnis</div>
            {aktiverV ? (
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#1a2a3a', marginBottom: 4 }}>{aktiverV.mieter_vorname} {aktiverV.mieter_nachname}</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>📅 Seit {new Date(aktiverV.mietbeginn).toLocaleDateString('de-AT')}{aktiverV.mietende ? ` bis ${new Date(aktiverV.mietende).toLocaleDateString('de-AT')}` : ' · unbefristet'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: '#d1f5e0', color: '#2d6a4f', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>Mietzins € {fmt(parseFloat(aktiverV.mietzins))}</span>
                  {parseFloat(aktiverV.bk_pauschale) > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>BK-Pauschale € {fmt(parseFloat(aktiverV.bk_pauschale))}</span>}
                </div>
              </div>
            ) : <div style={{ color: '#aaa', fontSize: 13 }}>📭 Kein aktiver Mietvertrag</div>}
          </div>

          {/* Checklisten-Übersicht */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#1a2a3a' }}>✅ Projekt-Checklisten</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {['Stammdaten', 'Finanzen', 'Bau', 'Vermietung', 'Verwaltung'].map(kat => {
                const items = ckKat(kat)
                const pct = progress(kat)
                const tabId = kat.toLowerCase()
                return (
                  <button key={kat} onClick={() => setAktTab(tabId === 'stammdaten' ? 'stammdaten' : tabId === 'finanzen' ? 'finanzen' : tabId === 'bau' ? 'bau' : tabId === 'vermietung' ? 'vermietung' : 'verwaltung')}
                    style={{ background: pct === 100 ? '#f0fdf4' : '#fafafa', border: `1px solid ${pct === 100 ? '#bbf7d0' : '#e5e0d8'}`, borderRadius: 10, padding: 12, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a', marginBottom: 6 }}>{kat}</div>
                    <div style={{ height: 4, background: '#f0ede8', borderRadius: 99, marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#6366f1', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#888' }}>{items.filter(c => c.erledigt).length}/{items.length} erledigt</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* STAMMDATEN */}
      {aktTab === 'stammdaten' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#1a2a3a' }}>📋 Stammdaten</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Grundbuch, Kataster, Baugenehmigungen, Energieausweis</div>
          {renderCheckliste('Stammdaten')}
        </div>
      )}

      {/* FINANZEN */}
      {aktTab === 'finanzen' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#1a2a3a' }}>💶 Finanzierung & Wirtschaftlichkeit</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Darlehen, Tilgungsplan, Renditeberechnung, Kaufvertrag</div>
          {renderCheckliste('Finanzen')}
        </div>
      )}

      {/* BAU */}
      {aktTab === 'bau' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#1a2a3a' }}>🔨 Bau & Instandsetzung</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Gewerke-Planung, Angebote, Abnahmeprotokolle, Mängelmanagement</div>
          {renderCheckliste('Bau')}
        </div>
      )}

      {/* VERMIETUNG */}
      {aktTab === 'vermietung' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#1a2a3a' }}>🏠 Vermietung & Bewirtschaftung</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Mietverträge, Mieterselbstauskünfte, Kautionskonto, Nebenkostenabrechnung</div>
            {renderCheckliste('Vermietung')}
          </div>
          {/* Vertragshistorie */}
          {vertraege.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1a2a3a' }}>📋 Vertragshistorie ({vertraege.length})</div>
              {vertraege.map((v, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < vertraege.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.mieter_vorname} {v.mieter_nachname}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{new Date(v.mietbeginn).toLocaleDateString('de-AT')} · € {fmt(parseFloat(v.mietzins))}/Monat</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: v.status === 'Aktiv' ? '#d1f5e0' : '#fee2e2', color: v.status === 'Aktiv' ? '#2d6a4f' : '#dc2626' }}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VERWALTUNG */}
      {aktTab === 'verwaltung' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#1a2a3a' }}>⚙️ Laufende Verwaltung</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Instandhaltungsrücklagen, Versicherungen, Dienstleisterverträge</div>
          {renderCheckliste('Verwaltung')}
        </div>
      )}

      {/* BETRIEBSKOSTEN */}
      {aktTab === 'betriebskosten' && <BetriebskostenTab objektId={objektId} vertraege={bkVertraege} setVertraege={setBkVertraege} belege={bkBelege} setBelege={setBkBelege} monat={bkMonat} setMonat={setBkMonat} bkJahr={bkJahr} setBkJahr={setBkJahr} />}

      {/* DARLEHEN */}
      {aktTab === 'darlehen' && <DarlehenTab objektId={objektId} objektName={objekt?.name || `Objekt #${objektId}`} darlehen={darlehen} setDarlehen={setDarlehen} darlehenZahlungen={darlehenZahlungen} setDarlehenZahlungen={setDarlehenZahlungen} />}

      {/* BONITÄT */}
      {aktTab === 'bonitaet' && <BonitaetTab objektId={objektId} verbindlichkeiten={verbindlichkeiten} setVerbindlichkeiten={setVerbindlichkeiten} finanzdaten={finanzdaten} setFinanzdaten={setFinanzdaten} finanzForm={finanzForm} setFinanzForm={setFinanzForm} verbForm={verbForm} setVerbForm={setVerbForm} verbEditId={verbEditId} setVerbEditId={setVerbEditId} verbFormOffen={verbFormOffen} setVerbFormOffen={setVerbFormOffen} finanzSaved={finanzSaved} setFinanzSaved={setFinanzSaved} />}

      {/* ── Edit Modal ── */}
      {editOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>✏️ Objekt bearbeiten</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={lS}>Name *</label><input style={iS} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div>
                <label style={lS}>Typ</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYP_OPTIONEN.map(t => <button key={t} onClick={() => setForm(p => ({ ...p, typ: t }))} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${form.typ === t ? '#1a2a3a' : '#e5e0d8'}`, background: form.typ === t ? '#1a2a3a' : 'white', color: form.typ === t ? 'white' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>)}
                </div>
              </div>
              <div><label style={lS}>Adresse</label><input style={iS} value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} placeholder="Straße Nr., PLZ Ort" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lS}>Fläche (m²)</label><input style={iS} type="number" value={form.flaeche} onChange={e => setForm(p => ({ ...p, flaeche: e.target.value }))} /></div>
                <div><label style={lS}>Zimmer</label><input style={iS} type="number" value={form.zimmer} onChange={e => setForm(p => ({ ...p, zimmer: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lS}>Baujahr</label><input style={iS} type="number" value={form.baujahr} onChange={e => setForm(p => ({ ...p, baujahr: e.target.value }))} /></div>
                <div><label style={lS}>Kaufpreis (€)</label><input style={iS} type="number" value={form.kaufpreis} onChange={e => setForm(p => ({ ...p, kaufpreis: e.target.value }))} /></div>
              </div>
              <div><label style={lS}>Notizen</label><textarea style={{ ...iS, resize: 'none', minHeight: 60 } as any} value={form.notizen} onChange={e => setForm(p => ({ ...p, notizen: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditOffen(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichern} disabled={saveLaden || !form.name.trim()} style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: saveLaden || !form.name.trim() ? '#e5e0d8' : '#1a1a1a', color: saveLaden || !form.name.trim() ? '#aaa' : 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                {saveLaden ? '⏳ Speichern...' : '💾 Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return <div style={{ background: '#f8f9fa', border: '1px solid #e5e0d8', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#444' }}>{label}</div>
}

const lS: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 5 }
const iS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e0d8', borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }

function DarlehenTab({ objektId, objektName, darlehen, setDarlehen, darlehenZahlungen, setDarlehenZahlungen }: { objektId: number; objektName: string; darlehen: any[]; setDarlehen: any; darlehenZahlungen: Record<number,any[]>; setDarlehenZahlungen: any }) {
  const [expandedId,  setExpandedId]  = useState<number | null>(null)
  const [modalOffen,  setModalOffen]  = useState(false)
  const [editDarlehen, setEditDarlehen] = useState<any | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [zahlungForm, setZahlungForm] = useState<Record<number,any>>({})
  const [zahlungLaden, setZahlungLaden] = useState<number | null>(null)
  const [vertragLaden,   setVertragLaden]   = useState<number | null>(null)
  const [dragOver,       setDragOver]       = useState<number | null>(null)
  const [vorschau,       setVorschau]       = useState<{ url: string; name: string; typ: string } | null>(null)

  const leerForm = { bezeichnung: '', bank: '', vertragsnummer: '', darlehenssumme: '', restsumme: '', monatlicheRate: '', sollzins: '', laufzeitBeginn: '', laufzeitEnde: '', zinsbindungEnde: '', notiz: '' }
  const [form, setForm] = useState<any>({ ...leerForm })
  const ff = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  const n = (x: any) => parseFloat(x || 0)
  const fmtD = (x: any) => n(x).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalDarlehenssumme = darlehen.reduce((s, d) => s + n(d.darlehenssumme), 0)
  const totalRestsumme      = darlehen.reduce((s, d) => s + n(d.restsumme), 0)
  const totalRate           = darlehen.reduce((s, d) => s + n(d.monatlicheRate), 0)
  const totalAbgezahlt      = totalDarlehenssumme - totalRestsumme
  const abgezahltPct        = totalDarlehenssumme > 0 ? Math.max(0, Math.min(100, (totalAbgezahlt / totalDarlehenssumme) * 100)) : 0

  const ladeZahlungen = async (darlehenId: number) => {
    setZahlungLaden(darlehenId)
    try {
      const res = await api.get(`/immo/darlehen-zahlungen/${darlehenId}`)
      setDarlehenZahlungen((prev: any) => ({ ...prev, [darlehenId]: res.data }))
    } catch {}
    setZahlungLaden(null)
  }

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!darlehenZahlungen[id]) await ladeZahlungen(id)
    const d = darlehen.find(x => x.id === id)
    if (d) {
      const jetzt = new Date()
      setZahlungForm((prev: any) => ({
        ...prev,
        [id]: { monat: jetzt.getMonth() + 1, jahr: jetzt.getFullYear(), betrag: d.monatlicheRate || '', beschreibung: '' }
      }))
    }
  }

  const oeffneNeu = () => {
    setEditDarlehen(null)
    setForm({ ...leerForm })
    setModalOffen(true)
  }

  const oeffneEdit = (d: any) => {
    setEditDarlehen(d)
    setForm({
      bezeichnung: d.bezeichnung || '',
      bank: d.bank || '',
      vertragsnummer: d.vertragsnummer || '',
      darlehenssumme: d.darlehenssumme || '',
      restsumme: d.restsumme || '',
      monatlicheRate: d.monatlicheRate || '',
      sollzins: d.sollzins || '',
      laufzeitBeginn: d.laufzeitBeginn ? d.laufzeitBeginn.slice(0,10) : '',
      laufzeitEnde: d.laufzeitEnde ? d.laufzeitEnde.slice(0,10) : '',
      zinsbindungEnde: d.zinsbindungEnde ? d.zinsbindungEnde.slice(0,10) : '',
      notiz: d.notiz || '',
    })
    setModalOffen(true)
  }

  const speichereDarlehen = async () => {
    if (!form.bezeichnung.trim()) return
    setSaving(true)
    try {
      const payload = {
        objektId,
        bezeichnung: form.bezeichnung,
        bank: form.bank || null,
        vertragsnummer: form.vertragsnummer || null,
        darlehenssumme: form.darlehenssumme ? parseFloat(form.darlehenssumme) : 0,
        restsumme: form.restsumme ? parseFloat(form.restsumme) : (form.darlehenssumme ? parseFloat(form.darlehenssumme) : 0),
        monatlicheRate: form.monatlicheRate ? parseFloat(form.monatlicheRate) : 0,
        sollzins: form.sollzins ? parseFloat(form.sollzins) : 0,
        laufzeitBeginn: form.laufzeitBeginn || null,
        laufzeitEnde: form.laufzeitEnde || null,
        zinsbindungEnde: form.zinsbindungEnde || null,
        notiz: form.notiz || null,
      }
      if (editDarlehen) {
        const res = await api.put(`/immo/darlehen/${editDarlehen.id}`, payload)
        setDarlehen((prev: any[]) => prev.map(d => d.id === editDarlehen.id ? res.data : d))
      } else {
        const res = await api.post('/immo/darlehen', payload)
        setDarlehen((prev: any[]) => [...prev, res.data])
      }
      setModalOffen(false)
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
    setSaving(false)
  }

  const loescheDarlehen = async (id: number) => {
    if (!window.confirm('Darlehen und alle Zahlungen löschen?')) return
    try {
      await api.delete(`/immo/darlehen/${id}`)
      setDarlehen((prev: any[]) => prev.filter(d => d.id !== id))
      setDarlehenZahlungen((prev: any) => { const copy = { ...prev }; delete copy[id]; return copy })
      if (expandedId === id) setExpandedId(null)
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
  }

  const zahlungFeld = (darlehenId: number, k: string, v: any) =>
    setZahlungForm((prev: any) => ({ ...prev, [darlehenId]: { ...prev[darlehenId], [k]: v } }))

  const berechneZinsanteile = (darlehenId: number, betrag: number) => {
    const d = darlehen.find(x => x.id === darlehenId)
    if (!d) return { zinsanteil: 0, tilgungsanteil: betrag, restsummeNach: n(d?.restsumme) - betrag }
    const zahlungen = darlehenZahlungen[darlehenId] || []
    const letzteRestsumme = zahlungen.length > 0 ? n(zahlungen[zahlungen.length - 1].restsummeNach) : n(d.restsumme)
    const monatszins = letzteRestsumme * (n(d.sollzins) / 100 / 12)
    const zinsanteil = Math.max(0, Math.min(betrag, monatszins))
    const tilgungsanteil = Math.max(0, betrag - zinsanteil)
    const restsummeNach = Math.max(0, letzteRestsumme - tilgungsanteil)
    return { zinsanteil, tilgungsanteil, restsummeNach, letzteRestsumme }
  }

  const addZahlung = async (darlehenId: number) => {
    const zf = zahlungForm[darlehenId]
    if (!zf || !zf.betrag) return
    const betrag = parseFloat(zf.betrag)
    const { zinsanteil, tilgungsanteil, restsummeNach } = berechneZinsanteile(darlehenId, betrag)
    try {
      const res = await api.post('/immo/darlehen-zahlungen', {
        darlehenId,
        objektId,
        monat: parseInt(zf.monat),
        jahr: parseInt(zf.jahr),
        betrag,
        zinsanteil: parseFloat(zinsanteil.toFixed(2)),
        tilgungsanteil: parseFloat(tilgungsanteil.toFixed(2)),
        restsummeNach: parseFloat(restsummeNach.toFixed(2)),
        beschreibung: zf.beschreibung || null,
      })
      setDarlehenZahlungen((prev: any) => ({ ...prev, [darlehenId]: [...(prev[darlehenId] || []), res.data] }))
      setDarlehen((prev: any[]) => prev.map(d => d.id === darlehenId ? { ...d, restsumme: restsummeNach } : d))
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
  }

  const loescheZahlung = async (darlehenId: number, zahlungId: number) => {
    try {
      await api.delete(`/immo/darlehen-zahlungen/${zahlungId}`)
      const geloeschte = (darlehenZahlungen[darlehenId] || []).find(z => z.id === zahlungId)
      setDarlehenZahlungen((prev: any) => ({ ...prev, [darlehenId]: (prev[darlehenId] || []).filter((z: any) => z.id !== zahlungId) }))
      if (geloeschte) {
        setDarlehen((prev: any[]) => prev.map(d => d.id === darlehenId ? { ...d, restsumme: n(d.restsumme) + n(geloeschte.tilgungsanteil) } : d))
      }
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
  }

  const uploadVertragDatei = async (darlehenId: number, file: File) => {
    setVertragLaden(darlehenId)
    try {
      const formData = new FormData()
      formData.append('vertrag', file)
      const res = await api.post(`/immo/darlehen/${darlehenId}/vertrag`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDarlehen((prev: any[]) => prev.map(d => d.id === darlehenId ? { ...d, vertragDateiname: res.data.vertragDateiname } : d))
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
    setVertragLaden(null)
  }

  const ladeVertrag = async (darlehenId: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      await uploadVertragDatei(darlehenId, file)
    }
    input.click()
  }

  const oeffneVorschau = async (darlehenId: number, dateiname: string) => {
    try {
      const res = await api.get(`/immo/darlehen/${darlehenId}/vertrag`, { responseType: 'blob' })
      const ext = dateiname.split('.').pop()?.toLowerCase() || ''
      const mimeMap: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif' }
      const mime = mimeMap[ext] || 'application/octet-stream'
      const blob = new Blob([res.data], { type: mime })
      const url = window.URL.createObjectURL(blob)
      setVorschau({ url, name: dateiname, typ: ext })
    } catch { alert('Vorschau konnte nicht geladen werden') }
  }

  const downloadVertrag = (darlehenId: number) => {
    // Fetch mit Auth-Header
    api.get(`/immo/darlehen/${darlehenId}/vertrag`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const d = darlehen.find(x => x.id === darlehenId)
      link.download = d?.vertragDateiname || 'vertrag'
      link.click()
      window.URL.revokeObjectURL(url)
    }).catch(() => alert('Datei konnte nicht geladen werden'))
  }

  const loescheVertrag = async (darlehenId: number) => {
    if (!window.confirm('Vertrag entfernen?')) return
    try {
      await api.delete(`/immo/darlehen/${darlehenId}/vertrag`)
      setDarlehen((prev: any[]) => prev.map(d => d.id === darlehenId ? { ...d, vertragDateiname: null, vertragPfad: null } : d))
    } catch (err: any) { alert('Fehler: ' + (err?.response?.data?.fehler || err?.message)) }
  }

  const druckeEinzelDarlehenPDF = async (d: any) => {
    let zahlungen = darlehenZahlungen[d.id] || []
    if (!darlehenZahlungen[d.id]) {
      try { const res = await api.get(`/immo/darlehen-zahlungen/${d.id}`); zahlungen = res.data; setDarlehenZahlungen((prev: any) => ({ ...prev, [d.id]: res.data })) } catch {}
    }
    const datum = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const gesamtBezahlt   = zahlungen.reduce((s: number, z: any) => s + n(z.betrag), 0)
    const zinsenBezahlt   = zahlungen.reduce((s: number, z: any) => s + n(z.zinsanteil), 0)
    const tilgungBezahlt  = zahlungen.reduce((s: number, z: any) => s + n(z.tilgungsanteil), 0)
    const pct = n(d.darlehenssumme) > 0 ? Math.max(0, Math.min(100, ((n(d.darlehenssumme) - n(d.restsumme)) / n(d.darlehenssumme)) * 100)) : 0
    const barColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#6366f1' : pct >= 25 ? '#f59e0b' : '#ef4444'
    const payoffDate = geschaetzteAbzahlung(d)
    const restZins = geschaetzteZinskosten(d)
    const MN = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

    const zahlungZeilen = zahlungen.map((z: any, idx: number) => `
      <tr style="background:${idx%2===0?'#fff':'#f9fafb'}">
        <td>${MN[(z.monat||1)-1]} ${z.jahr}</td>
        <td style="text-align:right;font-weight:600">€ ${fmtD(z.betrag)}</td>
        <td style="text-align:right;color:#f59e0b">€ ${fmtD(z.zinsanteil)}</td>
        <td style="text-align:right;color:#10b981">€ ${fmtD(z.tilgungsanteil)}</td>
        <td style="text-align:right;color:#6366f1;font-weight:700">€ ${fmtD(z.restsummeNach)}</td>
        <td style="color:#555">${z.beschreibung || '—'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>${d.bezeichnung} – Darlehensübersicht</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a2a3a;padding:24px 32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #1a2a3a}
  .header h1{font-size:20px;font-weight:800;letter-spacing:-0.5px}
  .header p{font-size:11px;color:#888;margin-top:3px}
  .header-right{text-align:right;font-size:11px;color:#888}
  .header-right strong{display:block;font-size:13px;color:#1a2a3a;margin-bottom:2px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .box{background:#f8f9fa;border-radius:10px;padding:12px 14px;border:1px solid #e5e0d8}
  .box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:#888;font-weight:600;margin-bottom:4px}
  .box .val{font-size:16px;font-weight:800}
  .progress-wrap{margin-bottom:20px}
  .progress-label{display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:5px}
  .progress-bar{height:10px;background:#f0ede8;border-radius:99px;overflow:hidden}
  .progress-fill{height:100%;border-radius:99px;background:${barColor}}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}
  .info-box{background:#f8f9fa;border-radius:8px;padding:10px 12px;border:1px solid #e5e0d8}
  .info-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:#888;font-weight:600;margin-bottom:3px}
  .info-box .val{font-size:13px;font-weight:700}
  .section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#1a2a3a;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:7px 10px;border-top:1px solid #f0ede8}
  tfoot tr{background:#f0ede8!important;border-top:2px solid #d1c9be}
  tfoot td{font-weight:700;padding:8px 10px}
  .keine{text-align:center;color:#aaa;padding:24px;font-style:italic;border:1px dashed #e5e0d8;border-radius:8px}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e5e0d8;text-align:center;font-size:10px;color:#aaa}
  @media print{body{padding:12px 20px}}
</style></head><body>
<div class="header">
  <div>
    <h1>${d.bezeichnung}</h1>
    <p>${d.bank ? d.bank : ''}${d.vertragsnummer ? ' · Nr. ' + d.vertragsnummer : ''}</p>
  </div>
  <div class="header-right"><strong>BelegFix</strong>Stand: ${datum}</div>
</div>

<div class="grid">
  <div class="box"><div class="lbl">Darlehenssumme</div><div class="val" style="color:#1a2a3a">€ ${fmtD(d.darlehenssumme)}</div></div>
  <div class="box"><div class="lbl">Aktuelle Restschuld</div><div class="val" style="color:#ef4444">€ ${fmtD(d.restsumme)}</div></div>
  <div class="box"><div class="lbl">Monatl. Rate</div><div class="val" style="color:#6366f1">€ ${fmtD(d.monatlicheRate)}</div></div>
  <div class="box"><div class="lbl">Sollzins</div><div class="val" style="color:#f59e0b">${n(d.sollzins).toFixed(3)} %</div></div>
</div>

<div class="progress-wrap">
  <div class="progress-label"><span>Abgezahlt: <strong>${pct.toFixed(1)}%</strong> (€ ${fmtD(n(d.darlehenssumme)-n(d.restsumme))} von € ${fmtD(d.darlehenssumme)})</span>${payoffDate ? `<span>Voraussichtl. Abzahlung: <strong>${payoffDate.toLocaleDateString('de-AT',{month:'2-digit',year:'numeric'})}</strong></span>` : ''}</div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
</div>

<div class="info-grid">
  <div class="info-box"><div class="lbl">Zinsen bereits gezahlt</div><div class="val" style="color:#f59e0b">€ ${fmtD(zinsenBezahlt)}</div></div>
  <div class="info-box"><div class="lbl">Tilgung bereits gezahlt</div><div class="val" style="color:#10b981">€ ${fmtD(tilgungBezahlt)}</div></div>
  <div class="info-box"><div class="lbl">Noch anfallende Zinsen</div><div class="val" style="color:#ef4444">≈ € ${fmtD(restZins)}</div></div>
  ${d.laufzeitBeginn ? `<div class="info-box"><div class="lbl">Laufzeit von</div><div class="val">${new Date(d.laufzeitBeginn).toLocaleDateString('de-AT')}</div></div>` : ''}
  ${d.laufzeitEnde ? `<div class="info-box"><div class="lbl">Laufzeit bis</div><div class="val">${new Date(d.laufzeitEnde).toLocaleDateString('de-AT')}</div></div>` : ''}
  ${d.zinsbindungEnde ? `<div class="info-box" style="background:#fff7ed;border-color:#fed7aa"><div class="lbl">Zinsbindung bis</div><div class="val" style="color:#f59e0b">${new Date(d.zinsbindungEnde).toLocaleDateString('de-AT')}</div></div>` : ''}
</div>

<div class="section-title">Zahlungshistorie (${zahlungen.length} Buchungen)</div>
${zahlungen.length === 0 ? '<div class="keine">Noch keine Zahlungen erfasst</div>' : `
<table>
  <thead><tr><th>Zeitraum</th><th style="text-align:right">Betrag</th><th style="text-align:right">Zinsanteil</th><th style="text-align:right">Tilgungsanteil</th><th style="text-align:right">Restschuld danach</th><th>Beschreibung</th></tr></thead>
  <tbody>${zahlungZeilen}</tbody>
  <tfoot><tr><td>Gesamt</td><td style="text-align:right">€ ${fmtD(gesamtBezahlt)}</td><td style="text-align:right;color:#f59e0b">€ ${fmtD(zinsenBezahlt)}</td><td style="text-align:right;color:#10b981">€ ${fmtD(tilgungBezahlt)}</td><td style="text-align:right;color:#6366f1">€ ${fmtD(d.restsumme)}</td><td></td></tr></tfoot>
</table>`}
${d.notiz ? `<div style="margin-top:14px;background:#fffbf0;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;font-size:11px;color:#92400e"><strong>Notiz:</strong> ${d.notiz}</div>` : ''}
<div class="footer">Erstellt mit BelegFix · ${datum}</div>
</body></html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  const getBarColor = (pct: number) => {
    if (pct >= 75) return '#10b981'
    if (pct >= 50) return '#6366f1'
    if (pct >= 25) return '#f59e0b'
    return '#ef4444'
  }

  const geschaetzteAbzahlung = (d: any) => {
    const rs = n(d.restsumme)
    const rate = n(d.monatlicheRate)
    const zins = n(d.sollzins) / 100 / 12
    if (rate <= 0 || rs <= 0) return null
    if (zins <= 0) {
      const monate = Math.ceil(rs / rate)
      const datum = new Date()
      datum.setMonth(datum.getMonth() + monate)
      return datum
    }
    if (rate <= rs * zins) return null
    const monate = Math.ceil(Math.log(rate / (rate - rs * zins)) / Math.log(1 + zins))
    const datum = new Date()
    datum.setMonth(datum.getMonth() + monate)
    return datum
  }

  const geschaetzteZinskosten = (d: any) => {
    const rs = n(d.restsumme)
    const rate = n(d.monatlicheRate)
    const zins = n(d.sollzins) / 100 / 12
    if (rate <= 0 || rs <= 0) return 0
    if (zins <= 0) return 0
    if (rate <= rs * zins) return 0
    const monate = Math.log(rate / (rate - rs * zins)) / Math.log(1 + zins)
    return Math.max(0, rate * monate - rs)
  }

  const MONATE_NAMES = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  const SCHNELL_BEZEICHNUNGEN = ['Wohnungskauf','Ausbaukredit','Renovierungskredit','Sanierungskredit']

  const druckeDarlehenPDF = async () => {
    // Alle Zahlungen laden die noch nicht geladen sind
    const alleZahlungen: Record<number, any[]> = { ...darlehenZahlungen }
    for (const d of darlehen) {
      if (!alleZahlungen[d.id]) {
        try {
          const res = await api.get(`/immo/darlehen-zahlungen/${d.id}`)
          alleZahlungen[d.id] = res.data
        } catch { alleZahlungen[d.id] = [] }
      }
    }
    setDarlehenZahlungen(alleZahlungen)

    const datum = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const darlehenRows = darlehen.map(d => {
      const zahlungen = alleZahlungen[d.id] || []
      const gesamtBezahlt = zahlungen.reduce((s: number, z: any) => s + n(z.betrag), 0)
      const zinsenBezahlt = zahlungen.reduce((s: number, z: any) => s + n(z.zinsanteil), 0)
      const tilgungBezahlt = zahlungen.reduce((s: number, z: any) => s + n(z.tilgungsanteil), 0)
      const pct = n(d.darlehenssumme) > 0 ? Math.max(0, Math.min(100, ((n(d.darlehenssumme) - n(d.restsumme)) / n(d.darlehenssumme)) * 100)) : 0
      const payoffDate = geschaetzteAbzahlung(d)

      const zahlungZeilen = zahlungen.map((z: any, idx: number) => `
        <tr style="background:${idx%2===0?'#fff':'#f9fafb'}">
          <td>${MONATE_NAMES[(z.monat||1)-1]} ${z.jahr}</td>
          <td style="text-align:right;font-weight:600">€ ${fmtD(z.betrag)}</td>
          <td style="text-align:right;color:#f59e0b">€ ${fmtD(z.zinsanteil)}</td>
          <td style="text-align:right;color:#10b981">€ ${fmtD(z.tilgungsanteil)}</td>
          <td style="text-align:right;color:#6366f1;font-weight:700">€ ${fmtD(z.restsummeNach)}</td>
          <td style="color:${z.beschreibung?'#333':'#ccc'}">${z.beschreibung || '—'}</td>
        </tr>`).join('')

      return `
        <div class="darlehen-block">
          <div class="darlehen-header">
            <div class="darlehen-titel">
              <span class="darlehen-name">${d.bezeichnung}</span>
              ${d.bank ? `<span class="badge-bank">${d.bank}</span>` : ''}
              ${d.vertragsnummer ? `<span class="badge-vn">Nr. ${d.vertragsnummer}</span>` : ''}
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Darlehenssumme</div>
              <div class="info-value" style="color:#1a2a3a">€ ${fmtD(d.darlehenssumme)}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Aktuelle Restschuld</div>
              <div class="info-value" style="color:#ef4444">€ ${fmtD(d.restsumme)}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Monatl. Rate</div>
              <div class="info-value" style="color:#6366f1">€ ${fmtD(d.monatlicheRate)}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Sollzins</div>
              <div class="info-value" style="color:#f59e0b">${n(d.sollzins).toFixed(3)} %</div>
            </div>
            ${d.laufzeitBeginn ? `<div class="info-box"><div class="info-label">Laufzeit von</div><div class="info-value">${new Date(d.laufzeitBeginn).toLocaleDateString('de-AT')}</div></div>` : ''}
            ${d.laufzeitEnde ? `<div class="info-box"><div class="info-label">Laufzeit bis</div><div class="info-value">${new Date(d.laufzeitEnde).toLocaleDateString('de-AT')}</div></div>` : ''}
            ${d.zinsbindungEnde ? `<div class="info-box" style="background:#fff7ed;border-color:#fed7aa"><div class="info-label">Zinsbindung bis</div><div class="info-value" style="color:#f59e0b">${new Date(d.zinsbindungEnde).toLocaleDateString('de-AT')}</div></div>` : ''}
            ${payoffDate ? `<div class="info-box" style="background:#f0fdf4;border-color:#86efac"><div class="info-label">Voraussichtl. Abzahlung</div><div class="info-value" style="color:#10b981">${payoffDate.toLocaleDateString('de-AT',{month:'2-digit',year:'numeric'})}</div></div>` : ''}
          </div>

          <div class="fortschritt-label">
            <span>Abgezahlt: <strong>${pct.toFixed(1)}%</strong></span>
            <span>€ ${fmtD(n(d.darlehenssumme)-n(d.restsumme))} von € ${fmtD(d.darlehenssumme)}</span>
          </div>
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" style="width:${pct}%;background:${pct>=75?'#10b981':pct>=50?'#6366f1':pct>=25?'#f59e0b':'#ef4444'}"></div>
          </div>

          <div class="zahlung-summary">
            <div class="zs-box"><div class="zs-label">Zahlungen gesamt</div><div class="zs-val">${zahlungen.length} Buchungen</div></div>
            <div class="zs-box"><div class="zs-label">Bezahlt gesamt</div><div class="zs-val" style="color:#1a2a3a">€ ${fmtD(gesamtBezahlt)}</div></div>
            <div class="zs-box"><div class="zs-label">davon Zinsen</div><div class="zs-val" style="color:#f59e0b">€ ${fmtD(zinsenBezahlt)}</div></div>
            <div class="zs-box"><div class="zs-label">davon Tilgung</div><div class="zs-val" style="color:#10b981">€ ${fmtD(tilgungBezahlt)}</div></div>
          </div>

          ${zahlungen.length > 0 ? `
          <div class="section-title">Zahlungshistorie</div>
          <table class="zahlung-table">
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th style="text-align:right">Betrag</th>
                <th style="text-align:right">Zinsanteil</th>
                <th style="text-align:right">Tilgungsanteil</th>
                <th style="text-align:right">Restschuld danach</th>
                <th>Beschreibung</th>
              </tr>
            </thead>
            <tbody>${zahlungZeilen}</tbody>
            <tfoot>
              <tr>
                <td><strong>Gesamt</strong></td>
                <td style="text-align:right;font-weight:700">€ ${fmtD(gesamtBezahlt)}</td>
                <td style="text-align:right;color:#f59e0b;font-weight:700">€ ${fmtD(zinsenBezahlt)}</td>
                <td style="text-align:right;color:#10b981;font-weight:700">€ ${fmtD(tilgungBezahlt)}</td>
                <td style="text-align:right;color:#6366f1;font-weight:700">€ ${fmtD(d.restsumme)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>` : '<div class="keine-zahlungen">Noch keine Zahlungen erfasst</div>'}

          ${d.notiz ? `<div class="notiz-box"><strong>Notiz:</strong> ${d.notiz}</div>` : ''}
        </div>`
    }).join('')

    const totalDarlehenssumme = darlehen.reduce((s, d) => s + n(d.darlehenssumme), 0)
    const totalRestsumme = darlehen.reduce((s, d) => s + n(d.restsumme), 0)
    const totalRate = darlehen.reduce((s, d) => s + n(d.monatlicheRate), 0)
    const totalBezahlt = totalDarlehenssumme - totalRestsumme

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Darlehen – ${objektName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a2a3a; background: white; padding: 24px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a2a3a; }
  .header-left h1 { font-size: 22px; font-weight: 800; color: #1a2a3a; letter-spacing: -0.5px; }
  .header-left p { font-size: 12px; color: #888; margin-top: 3px; }
  .header-right { text-align: right; font-size: 11px; color: #888; }
  .header-right strong { display: block; font-size: 13px; color: #1a2a3a; margin-bottom: 2px; }

  .gesamt-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 28px; }
  .gesamt-item { background: #f8f9fa; border-radius: 10px; padding: 12px 14px; border: 1px solid #e5e0d8; }
  .gesamt-item .g-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 600; margin-bottom: 4px; }
  .gesamt-item .g-val { font-size: 17px; font-weight: 800; }

  .darlehen-block { margin-bottom: 28px; border: 1.5px solid #e5e0d8; border-radius: 12px; overflow: hidden; page-break-inside: avoid; }
  .darlehen-header { background: #1a2a3a; color: white; padding: 12px 16px; }
  .darlehen-titel { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .darlehen-name { font-size: 15px; font-weight: 800; }
  .badge-bank { background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-vn { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; font-size: 10px; color: rgba(255,255,255,0.7); }

  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; padding: 14px 16px; background: white; }
  .info-box { background: #f8f9fa; border-radius: 8px; padding: 10px 12px; border: 1px solid #e5e0d8; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; font-weight: 600; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 800; }

  .fortschritt-label { display: flex; justify-content: space-between; font-size: 11px; color: #666; padding: 0 16px; margin-bottom: 5px; }
  .progress-bar-outer { height: 8px; background: #f0ede8; margin: 0 16px 14px; border-radius: 99px; overflow: hidden; }
  .progress-bar-inner { height: 100%; border-radius: 99px; }

  .zahlung-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 0 16px 14px; }
  .zs-box { background: #f8f9fa; border-radius: 8px; padding: 8px 10px; border: 1px solid #e5e0d8; text-align: center; }
  .zs-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; font-weight: 600; margin-bottom: 3px; }
  .zs-val { font-size: 13px; font-weight: 800; color: #1a2a3a; }

  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #888; padding: 0 16px 8px; }
  .zahlung-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 0 0 14px; }
  .zahlung-table th { background: #1a2a3a; color: white; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .zahlung-table td { padding: 7px 10px; border-top: 1px solid #f0ede8; }
  .zahlung-table tfoot tr { background: #f0ede8 !important; border-top: 2px solid #d1c9be; }
  .zahlung-table tfoot td { padding: 8px 10px; }

  .keine-zahlungen { text-align: center; color: #aaa; padding: 16px; font-style: italic; }
  .notiz-box { margin: 0 16px 14px; background: #fffbf0; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #92400e; }

  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e0d8; text-align: center; font-size: 10px; color: #aaa; }
  @media print {
    body { padding: 12px 20px; }
    .darlehen-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🏦 Darlehen-Übersicht</h1>
      <p>${objektName}</p>
    </div>
    <div class="header-right">
      <strong>BelegFix</strong>
      Stand: ${datum}
    </div>
  </div>

  <div class="gesamt-box">
    <div class="gesamt-item">
      <div class="g-label">Gesamtdarlehen</div>
      <div class="g-val" style="color:#1a2a3a">€ ${fmtD(totalDarlehenssumme)}</div>
    </div>
    <div class="gesamt-item">
      <div class="g-label">Restschuld gesamt</div>
      <div class="g-val" style="color:#ef4444">€ ${fmtD(totalRestsumme)}</div>
    </div>
    <div class="gesamt-item">
      <div class="g-label">Bereits abgezahlt</div>
      <div class="g-val" style="color:#10b981">€ ${fmtD(totalBezahlt)}</div>
    </div>
    <div class="gesamt-item">
      <div class="g-label">Monatl. Raten</div>
      <div class="g-val" style="color:#6366f1">€ ${fmtD(totalRate)}</div>
    </div>
  </div>

  ${darlehen.length === 0 ? '<div style="text-align:center;color:#aaa;padding:40px">Keine Darlehen erfasst</div>' : darlehenRows}

  <div class="footer">Erstellt mit BelegFix · ${datum}</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=750')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 800)
  }

  const DarlSvg = ({ path, color }: { path: string; color: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
        {[
          { path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', label: 'Gesamtdarlehen', value: `€ ${fmtD(totalDarlehenssumme)}`, color: '#6366f1', bg: 'rgba(99,102,241,0.07)' },
          { path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z', label: 'Restschuld', value: `€ ${fmtD(totalRestsumme)}`, color: '#ef4444', bg: 'rgba(239,68,68,0.07)' },
          { path: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', label: 'Monatl. Rate', value: `€ ${fmtD(totalRate)}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
          { path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3', label: 'Abgezahlt', value: `${abgezahltPct.toFixed(1)}%`, color: '#10b981', bg: 'rgba(16,185,129,0.07)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #ece8e1', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DarlSvg path={c.path} color={c.color} />
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, letterSpacing: 0.2 }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color, letterSpacing: -0.3 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Header mit Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#1a2a3a' }}>Darlehen</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {darlehen.length > 0 && (
            <button onClick={druckeDarlehenPDF} style={{ background: 'white', color: '#6366f1', border: '1.5px solid #6366f1', borderRadius: 9, padding: '9px 16px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              📄 PDF drucken
            </button>
          )}
          <button onClick={oeffneNeu} style={{ background: '#1a2a3a', color: 'white', border: 'none', borderRadius: 9, padding: '9px 18px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Darlehen hinzufügen</button>
        </div>
      </div>

      {/* Darlehen Liste */}
      {darlehen.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px dashed #d1d5db', padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />
          </svg>
          <div>Noch keine Darlehen erfasst</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {darlehen.map(d => {
            const pct = n(d.darlehenssumme) > 0 ? Math.max(0, Math.min(100, ((n(d.darlehenssumme) - n(d.restsumme)) / n(d.darlehenssumme)) * 100)) : 0
            const barColor = getBarColor(pct)
            const isExpanded = expandedId === d.id
            const payoffDate = geschaetzteAbzahlung(d)
            const restZinskosten = geschaetzteZinskosten(d)
            const zahlungen = darlehenZahlungen[d.id] || []
            const gesamtZinsgezahlt = zahlungen.reduce((s: number, z: any) => s + n(z.zinsanteil), 0)
            const zf = zahlungForm[d.id] || {}

            return (
              <div key={d.id} style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${isExpanded ? '#6366f1' : '#e5e0d8'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                {/* Card Header */}
                <div style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleExpand(d.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#1a2a3a' }}>{d.bezeichnung}</span>
                        {d.bank && <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{d.bank}</span>}
                        {d.vertragsnummer && <span style={{ background: '#f0ede8', color: '#888', fontSize: 10, padding: '2px 8px', borderRadius: 10 }}>#{d.vertragsnummer}</span>}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#666', marginBottom: 10 }}>
                        <span>Darlehenssumme: <strong style={{ color: '#1a2a3a' }}>€ {fmtD(d.darlehenssumme)}</strong></span>
                        <span>Restschuld: <strong style={{ color: '#ef4444' }}>€ {fmtD(d.restsumme)}</strong></span>
                        <span>Rate: <strong style={{ color: '#1a2a3a' }}>€ {fmtD(d.monatlicheRate)}/Monat</strong></span>
                        {n(d.sollzins) > 0 && <span>Sollzins: <strong style={{ color: '#6366f1' }}>{n(d.sollzins).toFixed(3)}%</strong></span>}
                      </div>
                      {/* Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                          <span>Abgezahlt: <strong style={{ color: barColor }}>{pct.toFixed(1)}%</strong></span>
                          {payoffDate && <span>Voraussichtl. Abzahlung: <strong>{payoffDate.toLocaleDateString('de-AT', { month: '2-digit', year: 'numeric' })}</strong></span>}
                        </div>
                        <div style={{ height: 8, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); druckeEinzelDarlehenPDF(d) }}
                        style={{ background: '#f0f4ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8"/></svg>
                        PDF
                      </button>
                      <button onClick={e => { e.stopPropagation(); oeffneEdit(d) }} style={{ background: '#f0ede8', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); loescheDarlehen(d.id) }} style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                      <div style={{ fontSize: 18, color: '#aaa', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f0ede8', padding: '20px 20px' }}>

                    {/* Vertrag Upload */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(d.id) }}
                      onDragEnter={e => { e.preventDefault(); setDragOver(d.id) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={async e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files?.[0]; if (f) await uploadVertragDatei(d.id, f) }}
                      style={{ marginBottom: 20, border: `2px dashed ${dragOver === d.id ? '#6366f1' : '#e0ddf8'}`, borderRadius: 12, background: dragOver === d.id ? 'rgba(99,102,241,0.06)' : '#fafafe', padding: '14px 18px', transition: 'all 0.15s' }}>
                      {vertragLaden === d.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', fontSize: 12 }}>⏳ Wird hochgeladen…</div>
                      ) : d.vertragDateiname ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => oeffneVorschau(d.id, d.vertragDateiname)}>
                            <span style={{ fontSize: 22 }}>📄</span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a2a3a' }}>Darlehensvertrag</div>
                              <div style={{ fontSize: 11, color: '#6366f1', textDecoration: 'underline' }}>{d.vertragDateiname}</div>
                              <div style={{ fontSize: 10, color: '#aaa' }}>Klicken für Vorschau</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => oeffneVorschau(d.id, d.vertragDateiname)} style={{ background: '#f0f4ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>👁 Vorschau</button>
                            <button onClick={() => downloadVertrag(d.id)} style={{ background: '#ede9fe', color: '#6366f1', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↓ Download</button>
                            <button onClick={() => ladeVertrag(d.id)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>Ersetzen</button>
                            <button onClick={() => loescheVertrag(d.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 7, padding: '6px 9px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 22, opacity: 0.4 }}>📎</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: dragOver === d.id ? '#6366f1' : '#666' }}>{dragOver === d.id ? 'Loslassen zum Hochladen' : 'Darlehensvertrag hochladen'}</div>
                              <div style={{ fontSize: 11, color: '#aaa' }}>Drag & Drop oder Datei suchen · PDF, Word, Bild</div>
                            </div>
                          </div>
                          <button onClick={() => ladeVertrag(d.id)} style={{ background: '#1a2a3a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                            Datei suchen
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Zinsprognose */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Zinsen bereits gezahlt</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#f59e0b' }}>€ {fmtD(gesamtZinsgezahlt)}</div>
                      </div>
                      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Noch anfallende Zinskosten</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#ef4444' }}>≈ € {fmtD(restZinskosten)}</div>
                      </div>
                      {d.laufzeitEnde && (
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Laufzeit bis</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#1a2a3a' }}>{new Date(d.laufzeitEnde).toLocaleDateString('de-AT')}</div>
                        </div>
                      )}
                      {d.zinsbindungEnde && (
                        <div style={{ background: '#fff7ed', borderRadius: 10, padding: '12px 14px', border: '1px solid #fed7aa' }}>
                          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Zinsbindung bis</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{new Date(d.zinsbindungEnde).toLocaleDateString('de-AT')}</div>
                        </div>
                      )}
                    </div>

                    {/* Zahlung erfassen */}
                    <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: '#1a2a3a', marginBottom: 12 }}>+ Zahlung erfassen</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={lS}>Monat</label>
                          <select style={{ ...iS, background: 'white' }} value={zf.monat || ''} onChange={e => zahlungFeld(d.id, 'monat', e.target.value)}>
                            {MONATE_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lS}>Jahr</label>
                          <input style={iS} type="number" value={zf.jahr || ''} onChange={e => zahlungFeld(d.id, 'jahr', e.target.value)} />
                        </div>
                        <div>
                          <label style={lS}>Betrag (€)</label>
                          <input style={iS} type="number" step="0.01" value={zf.betrag || ''} onChange={e => zahlungFeld(d.id, 'betrag', e.target.value)} placeholder={fmtD(d.monatlicheRate)} />
                        </div>
                        <div>
                          <label style={lS}>Beschreibung</label>
                          <input style={iS} value={zf.beschreibung || ''} onChange={e => zahlungFeld(d.id, 'beschreibung', e.target.value)} placeholder="Optional" />
                        </div>
                      </div>
                      {zf.betrag && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: 'white', borderRadius: 8, padding: '8px 12px' }}>
                          {(() => {
                            const b = parseFloat(zf.betrag || '0')
                            const { zinsanteil, tilgungsanteil, restsummeNach } = berechneZinsanteile(d.id, b)
                            return <>Zinsanteil: <strong>€ {fmtD(zinsanteil)}</strong> · Tilgungsanteil: <strong>€ {fmtD(tilgungsanteil)}</strong> · Restsumme danach: <strong>€ {fmtD(restsummeNach)}</strong></>
                          })()}
                        </div>
                      )}
                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => addZahlung(d.id)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Zahlung buchen
                        </button>
                      </div>
                    </div>

                    {/* Zahlungshistorie */}
                    {zahlungLaden === d.id ? (
                      <div style={{ textAlign: 'center', color: '#aaa', padding: 16 }}>⏳ Lade Zahlungen...</div>
                    ) : zahlungen.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 12 }}>Noch keine Zahlungen erfasst</div>
                    ) : (
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: '#1a2a3a', marginBottom: 10 }}>Zahlungshistorie</div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f8f9fa' }}>
                                {['Datum','Betrag','Zinsanteil','Tilgungsanteil','Restsumme danach',''].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {zahlungen.map((z: any, idx: number) => (
                                <tr key={z.id} style={{ borderTop: '1px solid #f0ede8', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{MONATE_NAMES[(z.monat||1)-1]} {z.jahr}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>€ {fmtD(z.betrag)}</td>
                                  <td style={{ padding: '8px 10px', color: '#f59e0b' }}>€ {fmtD(z.zinsanteil)}</td>
                                  <td style={{ padding: '8px 10px', color: '#10b981' }}>€ {fmtD(z.tilgungsanteil)}</td>
                                  <td style={{ padding: '8px 10px', color: '#6366f1', fontWeight: 700 }}>€ {fmtD(z.restsummeNach)}</td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <button onClick={() => loescheZahlung(d.id, z.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 13 }}
                                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>🗑</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Darlehen hinzufügen / bearbeiten */}
      {modalOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#1a2a3a', marginBottom: 18 }}>{editDarlehen ? '✏️ Darlehen bearbeiten' : '🏦 Neues Darlehen'}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={lS}>Bezeichnung *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {SCHNELL_BEZEICHNUNGEN.map(b => (
                    <button key={b} onClick={() => ff('bezeichnung', b)} style={{ padding: '4px 10px', borderRadius: 14, border: `1.5px solid ${form.bezeichnung === b ? '#6366f1' : '#e5e0d8'}`, background: form.bezeichnung === b ? '#ede9fe' : 'white', color: form.bezeichnung === b ? '#6366f1' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{b}</button>
                  ))}
                </div>
                <input style={iS} value={form.bezeichnung} onChange={e => ff('bezeichnung', e.target.value)} placeholder="z.B. Wohnungskauf" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Bank</label><input style={iS} value={form.bank} onChange={e => ff('bank', e.target.value)} placeholder="z.B. Erste Bank" /></div>
                <div><label style={lS}>Vertragsnummer</label><input style={iS} value={form.vertragsnummer} onChange={e => ff('vertragsnummer', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Darlehenssumme (€)</label><input style={iS} type="number" step="0.01" value={form.darlehenssumme} onChange={e => ff('darlehenssumme', e.target.value)} /></div>
                <div><label style={lS}>Aktuelle Restschuld (€)</label><input style={iS} type="number" step="0.01" value={form.restsumme} onChange={e => ff('restsumme', e.target.value)} placeholder="= Darlehenssumme wenn neu" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Monatl. Rate (€)</label><input style={iS} type="number" step="0.01" value={form.monatlicheRate} onChange={e => ff('monatlicheRate', e.target.value)} /></div>
                <div><label style={lS}>Sollzins (%)</label><input style={iS} type="number" step="0.001" value={form.sollzins} onChange={e => ff('sollzins', e.target.value)} placeholder="z.B. 3.250" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Laufzeit Beginn</label><input style={iS} type="date" value={form.laufzeitBeginn} onChange={e => ff('laufzeitBeginn', e.target.value)} /></div>
                <div><label style={lS}>Laufzeit Ende</label><input style={iS} type="date" value={form.laufzeitEnde} onChange={e => ff('laufzeitEnde', e.target.value)} /></div>
                <div><label style={lS}>Zinsbindung bis</label><input style={iS} type="date" value={form.zinsbindungEnde} onChange={e => ff('zinsbindungEnde', e.target.value)} /></div>
              </div>
              <div><label style={lS}>Notiz</label><textarea style={{ ...iS, resize: 'none', minHeight: 56 } as any} value={form.notiz} onChange={e => ff('notiz', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalOffen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichereDarlehen} disabled={saving || !form.bezeichnung.trim()} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: saving ? '#aaa' : '#1a2a3a', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '⏳...' : '💾 Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vorschau Modal */}
      {vorschau && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}
          onClick={() => { window.URL.revokeObjectURL(vorschau.url); setVorschau(null) }}>
          {/* Toolbar */}
          <div style={{ background: '#1a2a3a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{vorschau.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Darlehensvertrag</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['pdf','jpg','jpeg','png'].includes(vorschau.typ) && (
                <button onClick={() => { const w = window.open(''); if (w) { w.document.write(`<html><body style="margin:0"><${vorschau.typ === 'pdf' ? `iframe src="${vorschau.url}" width="100%" height="100%" style="border:none"` : `img src="${vorschau.url}" style="max-width:100%"`}/></body></html>`); w.focus(); setTimeout(() => w.print(), 500) } }}
                  style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  🖨 Drucken
                </button>
              )}
              <a href={vorschau.url} download={vorschau.name}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
                ↓ Download
              </a>
              <button onClick={() => { window.URL.revokeObjectURL(vorschau.url); setVorschau(null) }}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          {/* Vorschau Inhalt */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.stopPropagation()}>
            {vorschau.typ === 'pdf' ? (
              <iframe src={vorschau.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} title="Vorschau" />
            ) : ['jpg','jpeg','png','gif'].includes(vorschau.typ) ? (
              <img src={vorschau.url} alt={vorschau.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
            ) : (
              <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📎</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', marginBottom: 8 }}>{vorschau.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Vorschau für diesen Dateityp nicht verfügbar</div>
                <a href={vorschau.url} download={vorschau.name}
                  style={{ background: '#1a2a3a', color: 'white', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                  ↓ Herunterladen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const BK_KATEGORIEN = ['Wasser', 'Heizung', 'Strom', 'Gas', 'Müll / Abfall', 'Hausversicherung', 'Haftpflicht', 'Hausmeister', 'Reinigung', 'Aufzug', 'Verwaltungskosten', 'Grundsteuer', 'Kanal / Abwasser', 'Sonstiges']
const MONATE = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function BetriebskostenTab({ objektId, vertraege, setVertraege, belege, setBelege, monat, setMonat, bkJahr, setBkJahr }: any) {
  const [ansicht,      setAnsicht]      = useState<'belege'|'vertraege'>('belege')
  const [belegForm,    setBelegForm]    = useState({ kategorie: 'Wasser', monat, jahr: bkJahr, betrag: '', beschreibung: '', belegNummer: '' })
  const [vertragForm,  setVertragForm]  = useState({ kategorie: 'Wasser', anbieter: '', vertragsnummer: '', monatsbetrag: '', laufzeitBeginn: '', laufzeitEnde: '', kuendigungsfrist: '1', notiz: '' })
  const [belegEditId,  setBelegEditId]  = useState<number|null>(null)
  const [vertragEditId,setVertragEditId]= useState<number|null>(null)
  const [formOffen,    setFormOffen]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  const n = (v: any) => parseFloat(v) || 0
  const fmtE = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Belege für ausgewählten Monat/Jahr
  const belegeMonat = belege.filter((b: any) => b.monat === monat && b.jahr === bkJahr)
  const summeMonat  = belegeMonat.reduce((s: number, b: any) => s + n(b.betrag), 0)

  // Jahresübersicht: alle Belege für bkJahr
  const belegeJahr  = belege.filter((b: any) => b.jahr === bkJahr)
  const summeJahr   = belegeJahr.reduce((s: number, b: any) => s + n(b.betrag), 0)

  // Verträge Jahresbetrag
  const vertraegeJahr = vertraege.reduce((s: number, v: any) => s + n(v.monatsbetrag) * 12, 0)

  // Pro Kategorie Jahressumme
  const katSummen: Record<string,number> = {}
  belegeJahr.forEach((b: any) => { katSummen[b.kategorie] = (katSummen[b.kategorie] || 0) + n(b.betrag) })

  const speichereBelege = async () => {
    setSaving(true)
    try {
      const daten = { objektId, kategorie: belegForm.kategorie, monat: parseInt(belegForm.monat as any), jahr: parseInt(belegForm.jahr as any), betrag: n(belegForm.betrag), beschreibung: belegForm.beschreibung, belegNummer: belegForm.belegNummer }
      if (belegEditId) {
        const res = await api.put(`/immo/bk-belege/${belegEditId}`, daten)
        setBelege((p: any[]) => p.map(b => b.id === belegEditId ? res.data : b))
      } else {
        const res = await api.post('/immo/bk-belege', daten)
        setBelege((p: any[]) => [...p, res.data])
      }
      setFormOffen(false)
      setBelegEditId(null)
      setBelegForm({ kategorie: 'Wasser', monat, jahr: bkJahr, betrag: '', beschreibung: '', belegNummer: '' })
    } catch {}
    setSaving(false)
  }

  const speichereVertrag = async () => {
    setSaving(true)
    try {
      const daten = { objektId, kategorie: vertragForm.kategorie, anbieter: vertragForm.anbieter, vertragsnummer: vertragForm.vertragsnummer, monatsbetrag: n(vertragForm.monatsbetrag), laufzeitBeginn: vertragForm.laufzeitBeginn||null, laufzeitEnde: vertragForm.laufzeitEnde||null, kuendigungsfrist: parseInt(vertragForm.kuendigungsfrist)||1, notiz: vertragForm.notiz }
      if (vertragEditId) {
        const res = await api.put(`/immo/bk-vertraege/${vertragEditId}`, daten)
        setVertraege((p: any[]) => p.map(v => v.id === vertragEditId ? res.data : v))
      } else {
        const res = await api.post('/immo/bk-vertraege', daten)
        setVertraege((p: any[]) => [...p, res.data])
      }
      setFormOffen(false)
      setVertragEditId(null)
      setVertragForm({ kategorie: 'Wasser', anbieter: '', vertragsnummer: '', monatsbetrag: '', laufzeitBeginn: '', laufzeitEnde: '', kuendigungsfrist: '1', notiz: '' })
    } catch {}
    setSaving(false)
  }

  const loescheBelege = async (id: number) => {
    setBelege((p: any[]) => p.filter(b => b.id !== id))
    try { await api.delete(`/immo/bk-belege/${id}`) } catch {}
  }

  const loescheVertrag = async (id: number) => {
    setVertraege((p: any[]) => p.filter(v => v.id !== id))
    try { await api.delete(`/immo/bk-vertraege/${id}`) } catch {}
  }

  const bf = (k: string, v: string) => setBelegForm((p: any) => ({ ...p, [k]: v }))
  const vf = (k: string, v: string) => setVertragForm((p: any) => ({ ...p, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Kopf: Ansicht wählen ── */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['belege','vertraege'] as const).map(a => (
              <button key={a} onClick={() => setAnsicht(a)} style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${ansicht === a ? '#1a2a3a' : '#e5e0d8'}`, background: ansicht === a ? '#1a2a3a' : 'white', color: ansicht === a ? 'white' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                {a === 'belege' ? '🧾 Monatliche Belege' : '📄 Verträge'}
              </button>
            ))}
          </div>
          <button onClick={() => { setFormOffen(true); setBelegEditId(null); setVertragEditId(null) }} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
            + {ansicht === 'belege' ? 'Beleg hinzufügen' : 'Vertrag hinzufügen'}
          </button>
        </div>

        {/* Monat/Jahr Filter (nur bei Belege) */}
        {ansicht === 'belege' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={monat} onChange={e => setMonat(parseInt(e.target.value))} style={{ padding: '7px 12px', border: '1px solid #e5e0d8', borderRadius: 7, fontSize: 13, background: 'white', cursor: 'pointer' }}>
              {MONATE.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={bkJahr} onChange={e => setBkJahr(parseInt(e.target.value))} style={{ padding: '7px 12px', border: '1px solid #e5e0d8', borderRadius: 7, fontSize: 13, background: 'white', cursor: 'pointer' }}>
              {[2023,2024,2025,2026,2027].map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#6366f1' }}>
              Gesamt {MONATE[monat-1]}: € {fmtE(summeMonat)}
            </div>
          </div>
        )}
      </div>

      {/* ── Jahresübersicht Karten ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🧾</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#f59e0b' }}>€ {fmtE(summeJahr)}</div>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Belege {bkJahr}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{belegeJahr.length} Einträge</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>📄</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#6366f1' }}>€ {fmtE(vertraegeJahr)}</div>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Verträge / Jahr</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{vertraege.length} aktive Verträge</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 16 }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>📅</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#10b981' }}>€ {fmtE(summeMonat)}</div>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{MONATE[monat-1]} {bkJahr}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{belegeMonat.length} Belege</div>
        </div>
      </div>

      {/* ── BELEGE Ansicht ── */}
      {ansicht === 'belege' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, marginBottom: 14, color: '#1a2a3a' }}>
            🧾 Belege — {MONATE[monat-1]} {bkJahr}
          </div>
          {belegeMonat.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 24 }}>Keine Belege für diesen Monat</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {belegeMonat.map((b: any) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e0d8', borderRadius: 9, background: '#fafafa' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a' }}>{b.kategorie}</span>
                      {b.belegNummer && <span style={{ fontSize: 10, color: '#888', background: '#f0ede8', padding: '1px 7px', borderRadius: 8 }}>#{b.belegNummer}</span>}
                    </div>
                    {b.beschreibung && <div style={{ fontSize: 11, color: '#888' }}>{b.beschreibung}</div>}
                  </div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#f59e0b', whiteSpace: 'nowrap' }}>€ {fmtE(n(b.betrag))}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setBelegForm({ kategorie: b.kategorie, monat: b.monat, jahr: b.jahr, betrag: b.betrag, beschreibung: b.beschreibung||'', belegNummer: b.belegNummer||'' }); setBelegEditId(b.id); setFormOffen(true); setAnsicht('belege') }} style={{ background: '#f0ede8', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                    <button onClick={() => loescheBelege(b.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 10, borderTop: '2px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                <span>Gesamt {MONATE[monat-1]}</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#f59e0b' }}>€ {fmtE(summeMonat)}</span>
              </div>
            </div>
          )}

          {/* Jahres-Kategorien Übersicht */}
          {Object.keys(katSummen).length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0ede8' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#888' }}>JAHRESÜBERSICHT {bkJahr} NACH KATEGORIE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {Object.entries(katSummen).sort(([,a],[,b]) => b-a).map(([kat, sum]) => (
                  <div key={kat} style={{ background: '#fffbf0', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>{kat}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#1a2a3a' }}>€ {fmtE(sum as number)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VERTRÄGE Ansicht ── */}
      {ansicht === 'vertraege' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, marginBottom: 14, color: '#1a2a3a' }}>📄 Aktive Verträge</div>
          {vertraege.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 24 }}>Keine Verträge erfasst</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vertraege.map((v: any) => (
                <div key={v.id} style={{ border: '1px solid #e5e0d8', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a2a3a' }}>{v.anbieter || v.kategorie}</span>
                        <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{v.kategorie}</span>
                        {v.vertragsnummer && <span style={{ fontSize: 10, color: '#888' }}>#{v.vertragsnummer}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                        <span>€ {fmtE(n(v.monatsbetrag))}/Monat · <strong>€ {fmtE(n(v.monatsbetrag)*12)}/Jahr</strong></span>
                        {v.laufzeitBeginn && <span>Von {new Date(v.laufzeitBeginn).toLocaleDateString('de-AT')}</span>}
                        {v.laufzeitEnde && <span>Bis {new Date(v.laufzeitEnde).toLocaleDateString('de-AT')}</span>}
                        {v.kuendigungsfrist && <span>Kündigungsfrist: {v.kuendigungsfrist} Monat(e)</span>}
                      </div>
                      {v.notiz && <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>📝 {v.notiz}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => { setVertragForm({ kategorie: v.kategorie, anbieter: v.anbieter||'', vertragsnummer: v.vertragsnummer||'', monatsbetrag: v.monatsbetrag||'', laufzeitBeginn: v.laufzeitBeginn?v.laufzeitBeginn.split('T')[0]:'', laufzeitEnde: v.laufzeitEnde?v.laufzeitEnde.split('T')[0]:'', kuendigungsfrist: v.kuendigungsfrist?.toString()||'1', notiz: v.notiz||'' }); setVertragEditId(v.id); setFormOffen(true) }} style={{ background: '#f0ede8', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={() => loescheVertrag(v.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 10, borderTop: '2px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                <span>Gesamt Verträge / Jahr</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#6366f1' }}>€ {fmtE(vertraegeJahr)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formular Modal ── */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            {ansicht === 'belege' ? (
              <>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{belegEditId ? '✏️ Beleg bearbeiten' : '+ Neuer Beleg'}</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={lS}>Kategorie</label>
                    <select value={belegForm.kategorie} onChange={e => bf('kategorie', e.target.value)} style={{ ...iS, background: 'white' }}>
                      {BK_KATEGORIEN.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lS}>Monat</label>
                      <select value={belegForm.monat} onChange={e => bf('monat', e.target.value)} style={{ ...iS, background: 'white' }}>
                        {MONATE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                    <div><label style={lS}>Jahr</label><input style={iS} type="number" value={belegForm.jahr} onChange={e => bf('jahr', e.target.value)} /></div>
                    <div><label style={lS}>Betrag (€)</label><input style={iS} type="number" value={belegForm.betrag} onChange={e => bf('betrag', e.target.value)} placeholder="0,00" /></div>
                  </div>
                  <div><label style={lS}>Beschreibung</label><input style={iS} value={belegForm.beschreibung} onChange={e => bf('beschreibung', e.target.value)} placeholder="z.B. Rechnung Fernwärme März" /></div>
                  <div><label style={lS}>Belegnummer</label><input style={iS} value={belegForm.belegNummer} onChange={e => bf('belegNummer', e.target.value)} placeholder="z.B. 2024-123" /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => { setFormOffen(false); setBelegEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={speichereBelege} disabled={saving || !belegForm.betrag} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: saving ? '#e5e0d8' : '#6366f1', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? '⏳...' : '💾 Speichern'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{vertragEditId ? '✏️ Vertrag bearbeiten' : '+ Neuer Vertrag'}</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={lS}>Kategorie</label>
                    <select value={vertragForm.kategorie} onChange={e => vf('kategorie', e.target.value)} style={{ ...iS, background: 'white' }}>
                      {BK_KATEGORIEN.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={lS}>Anbieter</label><input style={iS} value={vertragForm.anbieter} onChange={e => vf('anbieter', e.target.value)} placeholder="z.B. Wien Energie" /></div>
                    <div><label style={lS}>Vertragsnummer</label><input style={iS} value={vertragForm.vertragsnummer} onChange={e => vf('vertragsnummer', e.target.value)} /></div>
                  </div>
                  <div><label style={lS}>Monatsbetrag (€)</label><input style={iS} type="number" value={vertragForm.monatsbetrag} onChange={e => vf('monatsbetrag', e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={lS}>Laufzeit von</label><input style={iS} type="date" value={vertragForm.laufzeitBeginn} onChange={e => vf('laufzeitBeginn', e.target.value)} /></div>
                    <div><label style={lS}>Laufzeit bis</label><input style={iS} type="date" value={vertragForm.laufzeitEnde} onChange={e => vf('laufzeitEnde', e.target.value)} /></div>
                  </div>
                  <div><label style={lS}>Kündigungsfrist (Monate)</label><input style={iS} type="number" value={vertragForm.kuendigungsfrist} onChange={e => vf('kuendigungsfrist', e.target.value)} /></div>
                  <div><label style={lS}>Notiz</label><textarea style={{ ...iS, resize: 'none', minHeight: 56 } as any} value={vertragForm.notiz} onChange={e => vf('notiz', e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => { setFormOffen(false); setVertragEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={speichereVertrag} disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? '⏳...' : '💾 Speichern'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const KREDIT_TYPEN = ['Hypothek', 'Privatkredit', 'KFZ-Kredit', 'Kontokorrent', 'Leasingvertrag', 'Firmendarlehen', 'Sonstiges']

function BonitaetTab({ objektId, verbindlichkeiten, setVerbindlichkeiten, finanzdaten, setFinanzdaten, finanzForm, setFinanzForm, verbForm, setVerbForm, verbEditId, setVerbEditId, verbFormOffen, setVerbFormOffen, finanzSaved, setFinanzSaved }: any) {
  const [saving, setSaving] = useState(false)

  // ── Hilfsfunktionen ──
  const n = (v: any) => parseFloat(v) || 0
  const fmtE = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Finanzmathematik ──
  const gesamtRaten      = verbindlichkeiten.reduce((s: number, v: any) => s + n(v.monatlicheRate), 0)
  const nettoEink        = n(finanzdaten.nettoEinkommen)
  const mietNetto        = n(finanzdaten.mieteinnahmenNetto)
  const bkNichtUml       = n(finanzdaten.betriebskostenNichtUmlagefaehig)
  const instandh         = n(finanzdaten.instandhaltungspauschale)
  const neueRate         = n(finanzdaten.neueKreditRate)
  const gesamtVermoegen  = n(finanzdaten.gesamtvermoegen)
  const gesamtVerbindl   = verbindlichkeiten.reduce((s: number, v: any) => s + n(v.restsumme), 0)

  // Bereinigte Mieteinnahmen
  const mietBereinigt    = mietNetto - bkNichtUml - instandh
  // Gesamteinkommen
  const gesamtEink       = nettoEink + Math.max(0, mietBereinigt)
  // Gesamtbelastung inkl. neue Rate
  const gesamtBelastung  = gesamtRaten + neueRate
  // DSTI (Debt Service to Income)
  const dsti             = gesamtEink > 0 ? (gesamtBelastung / gesamtEink) * 100 : 0
  // Kapitaldienstfähigkeit (freie Liquidität nach allen Raten)
  const kapDienst        = gesamtEink - gesamtBelastung
  // Verschuldungsgrad
  const verschuldungsgrad = gesamtVermoegen > 0 ? (gesamtVerbindl / gesamtVermoegen) * 100 : 0

  // Stress-Test: +2% auf Kredite mit Zinsbindung < 12 Monate
  const heute = new Date()
  const stressRaten = verbindlichkeiten.reduce((s: number, v: any) => {
    if (!v.zinsbindungEnde) return s + n(v.monatlicheRate)
    const monate = (new Date(v.zinsbindungEnde).getTime() - heute.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monate <= 12) {
      // Simuliere +2% Zins → ca. +16% der Rate (Faustregel)
      return s + n(v.monatlicheRate) * 1.16
    }
    return s + n(v.monatlicheRate)
  }, 0)
  const stressBelastung  = stressRaten + neueRate
  const stressDsti       = gesamtEink > 0 ? (stressBelastung / gesamtEink) * 100 : 0
  const stressLiquiditaet = gesamtEink - stressBelastung

  // ── Flags ──
  const flags: { typ: 'kritisch'|'warnung'|'ok'|'info', text: string }[] = []
  if (dsti > 60)  flags.push({ typ: 'kritisch', text: `DSTI ${dsti.toFixed(1)}% — Sehr hohe Schuldenlast! Bank würde ablehnen (Grenze: 40%)` })
  else if (dsti > 40) flags.push({ typ: 'warnung', text: `DSTI ${dsti.toFixed(1)}% — Über der Bankgrenze von 40%. Genehmigung erschwert.` })
  else if (dsti > 0) flags.push({ typ: 'ok', text: `DSTI ${dsti.toFixed(1)}% — Im grünen Bereich (unter 40%). Gute Bonität.` })
  if (stressDsti > 40 && dsti <= 40) flags.push({ typ: 'warnung', text: `Stress-Test: Bei +2% Zins steigt DSTI auf ${stressDsti.toFixed(1)}% — Risiko bei Zinswende!` })
  if (kapDienst < 0) flags.push({ typ: 'kritisch', text: `Negative Kapitaldienstfähigkeit (−€ ${fmtE(Math.abs(kapDienst))}). Monatliches Defizit!` })
  if (verschuldungsgrad > 80) flags.push({ typ: 'warnung', text: `Verschuldungsgrad ${verschuldungsgrad.toFixed(1)}% — Sehr hoher Anteil am Vermögen.` })

  // Kredite mit kurzer Restlaufzeit (< 6 Monate)
  const kurzlaufend = verbindlichkeiten.filter((v: any) => {
    if (!v.laufzeitEnde) return false
    const monate = (new Date(v.laufzeitEnde).getTime() - heute.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monate >= 0 && monate < 6
  })
  if (kurzlaufend.length > 0) flags.push({ typ: 'info', text: `${kurzlaufend.length} Kredit(e) laufen in < 6 Monaten aus — können bei Bankbewertung ignoriert werden.` })

  // ── Finanzdaten speichern ──
  const speichereFinanz = async () => {
    setSaving(true)
    try {
      const res = await api.post('/immo/finanzdaten', { objektId, nettoEinkommen: n(finanzForm.nettoEinkommen), mieteinnahmenNetto: n(finanzForm.mieteinnahmenNetto), betriebskostenNichtUmlagefaehig: n(finanzForm.betriebskostenNichtUmlagefaehig), instandhaltungspauschale: n(finanzForm.instandhaltungspauschale), neueKreditRate: n(finanzForm.neueKreditRate), gesamtvermoegen: n(finanzForm.gesamtvermoegen) })
      setFinanzdaten(res.data)
      setFinanzSaved(true)
      setTimeout(() => setFinanzSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  // ── Verbindlichkeit speichern ──
  const speichereVerb = async () => {
    setSaving(true)
    try {
      const daten = { objektId, kreditTyp: verbForm.kreditTyp, glaeubiger: verbForm.glaeubiger, restsumme: n(verbForm.restsumme), monatlicheRate: n(verbForm.monatlicheRate), sollzins: n(verbForm.sollzins), zinsbindungEnde: verbForm.zinsbindungEnde || null, laufzeitEnde: verbForm.laufzeitEnde || null, notiz: verbForm.notiz }
      if (verbEditId) {
        const res = await api.put(`/immo/verbindlichkeiten/${verbEditId}`, daten)
        setVerbindlichkeiten((prev: any[]) => prev.map(v => v.id === verbEditId ? res.data : v))
      } else {
        const res = await api.post('/immo/verbindlichkeiten', daten)
        setVerbindlichkeiten((prev: any[]) => [...prev, res.data])
      }
      setVerbFormOffen(false)
      setVerbEditId(null)
      setVerbForm({ kreditTyp: 'Hypothek', glaeubiger: '', restsumme: '', monatlicheRate: '', sollzins: '', zinsbindungEnde: '', laufzeitEnde: '', notiz: '' })
    } catch {}
    setSaving(false)
  }

  const loescheVerb = async (id: number) => {
    setVerbindlichkeiten((prev: any[]) => prev.filter(v => v.id !== id))
    try { await api.delete(`/immo/verbindlichkeiten/${id}`) } catch {}
  }

  const oeffneEdit = (v: any) => {
    setVerbForm({ kreditTyp: v.kreditTyp||'Hypothek', glaeubiger: v.glaeubiger||'', restsumme: v.restsumme||'', monatlicheRate: v.monatlicheRate||'', sollzins: v.sollzins||'', zinsbindungEnde: v.zinsbindungEnde ? v.zinsbindungEnde.split('T')[0] : '', laufzeitEnde: v.laufzeitEnde ? v.laufzeitEnde.split('T')[0] : '', notiz: v.notiz||'' })
    setVerbEditId(v.id)
    setVerbFormOffen(true)
  }

  const ff = (k: string, val: string) => setFinanzForm((p: any) => ({ ...p, [k]: val }))
  const vf = (k: string, val: string) => setVerbForm((p: any) => ({ ...p, [k]: val }))

  const flagFarben = { kritisch: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '🔴' }, warnung: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', icon: '⚠️' }, ok: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '✅' }, info: { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', icon: 'ℹ️' } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Kennzahlen-Karten ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'DSTI', value: `${dsti.toFixed(1)}%`, sub: 'Schuldendienst-Quote', color: dsti > 60 ? '#dc2626' : dsti > 40 ? '#d97706' : '#16a34a', icon: '📊' },
          { label: 'Kapitaldienstfähigkeit', value: `€ ${fmtE(kapDienst)}`, sub: 'Freie Liquidität/Monat', color: kapDienst < 0 ? '#dc2626' : '#16a34a', icon: '💧' },
          { label: 'Gesamtbelastung', value: `€ ${fmtE(gesamtBelastung)}`, sub: 'Alle Raten + neue Rate', color: '#6366f1', icon: '💶' },
          { label: 'Stress-Liquidität', value: `€ ${fmtE(stressLiquiditaet)}`, sub: 'Bei +2% Zinswende', color: stressLiquiditaet < 0 ? '#dc2626' : '#d97706', icon: '🌡️' },
          { label: 'Verschuldungsgrad', value: `${verschuldungsgrad.toFixed(1)}%`, sub: 'Verbindl. / Vermögen', color: verschuldungsgrad > 80 ? '#dc2626' : verschuldungsgrad > 60 ? '#d97706' : '#16a34a', icon: '⚖️' },
          { label: 'Gesamtverbindlichkeiten', value: `€ ${fmtE(gesamtVerbindl)}`, sub: `${verbindlichkeiten.length} Kredite`, color: '#1a2a3a', icon: '🏦' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 14 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{k.label}</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Flags / Warnmeldungen ── */}
      {flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flags.map((f, i) => {
            const farbe = flagFarben[f.typ]
            return (
              <div key={i} style={{ background: farbe.bg, border: `1px solid ${farbe.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>{farbe.icon}</span>
                <span style={{ fontSize: 13, color: farbe.text, fontWeight: 500 }}>{f.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Finanzdaten ── */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, marginBottom: 16, color: '#1a2a3a' }}>📥 Einkommens- & Vermögensdaten</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { k: 'nettoEinkommen',                  label: 'Nettoeinkommen / Monat (€)' },
            { k: 'mieteinnahmenNetto',               label: 'Mieteinnahmen netto / Monat (€)' },
            { k: 'betriebskostenNichtUmlagefaehig',  label: 'Nicht-umlagef. Betriebskosten / Monat (€)' },
            { k: 'instandhaltungspauschale',         label: 'Instandhaltungspauschale / Monat (€)' },
            { k: 'neueKreditRate',                   label: 'Neue Kreditrate (geplant) / Monat (€)' },
            { k: 'gesamtvermoegen',                  label: 'Gesamtvermögen (€)' },
          ].map(({ k, label }) => (
            <div key={k}>
              <label style={lS}>{label}</label>
              <input style={iS} type="number" value={finanzForm[k]} onChange={e => ff(k, e.target.value)} placeholder="0,00" />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={speichereFinanz} disabled={saving} style={{ background: finanzSaved ? '#10b981' : '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {finanzSaved ? '✓ Gespeichert' : saving ? '⏳...' : '💾 Speichern'}
          </button>
        </div>
        {/* Rechenweg */}
        <div style={{ marginTop: 14, padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#555', lineHeight: 1.8 }}>
          <strong>Rechenweg:</strong><br/>
          Bereinigte Mieteinnahmen = {fmtE(mietNetto)} − {fmtE(bkNichtUml)} − {fmtE(instandh)} = <strong>€ {fmtE(mietBereinigt)}</strong><br/>
          Gesamteinkommen = {fmtE(nettoEink)} + {fmtE(Math.max(0, mietBereinigt))} = <strong>€ {fmtE(gesamtEink)}</strong><br/>
          DSTI = {fmtE(gesamtBelastung)} ÷ {fmtE(gesamtEink)} × 100 = <strong>{dsti.toFixed(2)}%</strong>
        </div>
      </div>

      {/* ── Verbindlichkeiten ── */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e0d8', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#1a2a3a' }}>🏦 Bestehende Verbindlichkeiten</div>
          <button onClick={() => { setVerbFormOffen(true); setVerbEditId(null); setVerbForm({ kreditTyp: 'Hypothek', glaeubiger: '', restsumme: '', monatlicheRate: '', sollzins: '', zinsbindungEnde: '', laufzeitEnde: '', notiz: '' }) }} style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>+ Kredit hinzufügen</button>
        </div>

        {verbindlichkeiten.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>Keine Verbindlichkeiten erfasst</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {verbindlichkeiten.map((v: any) => {
              const monateZinsbindung = v.zinsbindungEnde ? (new Date(v.zinsbindungEnde).getTime() - heute.getTime()) / (1000 * 60 * 60 * 24 * 30) : null
              const monateLaufzeit   = v.laufzeitEnde   ? (new Date(v.laufzeitEnde).getTime()   - heute.getTime()) / (1000 * 60 * 60 * 24 * 30) : null
              const zinsBaldAblauf   = monateZinsbindung !== null && monateZinsbindung <= 12
              const kurzRestlaufzeit = monateLaufzeit !== null && monateLaufzeit >= 0 && monateLaufzeit < 6
              return (
                <div key={v.id} style={{ border: `1px solid ${kurzRestlaufzeit ? '#fcd34d' : zinsBaldAblauf ? '#fca5a5' : '#e5e0d8'}`, borderRadius: 10, padding: '12px 16px', background: kurzRestlaufzeit ? '#fffbeb' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a2a3a' }}>{v.glaeubiger || 'Unbekannter Gläubiger'}</span>
                        <span style={{ background: '#f0ede8', color: '#555', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{v.kreditTyp}</span>
                        {kurzRestlaufzeit && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>⏳ Läuft bald aus</span>}
                        {zinsBaldAblauf && !kurzRestlaufzeit && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>⚡ Zinsbindung endet</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                        <span>Restschuld: <strong>€ {fmtE(n(v.restsumme))}</strong></span>
                        <span>Rate: <strong>€ {fmtE(n(v.monatlicheRate))}/Monat</strong></span>
                        {v.sollzins > 0 && <span>Sollzins: <strong>{v.sollzins}%</strong></span>}
                        {v.zinsbindungEnde && <span>Zinsbindung bis: <strong>{new Date(v.zinsbindungEnde).toLocaleDateString('de-AT')}</strong></span>}
                        {v.laufzeitEnde && <span>Laufzeit bis: <strong>{new Date(v.laufzeitEnde).toLocaleDateString('de-AT')}</strong></span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => oeffneEdit(v)} style={{ background: '#f0ede8', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={() => loescheVerb(v.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ padding: '10px 0', borderTop: '2px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
              <span>Gesamt Raten / Monat</span>
              <span style={{ color: '#dc2626', fontFamily: 'Syne, sans-serif', fontSize: 15 }}>€ {fmtE(gesamtRaten)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Formular Modal ── */}
      {verbFormOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{verbEditId ? '✏️ Kredit bearbeiten' : '+ Neuer Kredit'}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={lS}>Kredittyp</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {KREDIT_TYPEN.map(t => <button key={t} onClick={() => vf('kreditTyp', t)} style={{ padding: '5px 12px', borderRadius: 16, border: `1.5px solid ${verbForm.kreditTyp === t ? '#1a2a3a' : '#e5e0d8'}`, background: verbForm.kreditTyp === t ? '#1a2a3a' : 'white', color: verbForm.kreditTyp === t ? 'white' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t}</button>)}
                </div>
              </div>
              <div><label style={lS}>Gläubiger / Bank</label><input style={iS} value={verbForm.glaeubiger} onChange={e => vf('glaeubiger', e.target.value)} placeholder="z.B. Erste Bank" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Restschuld (€)</label><input style={iS} type="number" value={verbForm.restsumme} onChange={e => vf('restsumme', e.target.value)} /></div>
                <div><label style={lS}>Rate / Monat (€)</label><input style={iS} type="number" value={verbForm.monatlicheRate} onChange={e => vf('monatlicheRate', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={lS}>Sollzins (%)</label><input style={iS} type="number" value={verbForm.sollzins} onChange={e => vf('sollzins', e.target.value)} /></div>
                <div><label style={lS}>Zinsbindung bis</label><input style={iS} type="date" value={verbForm.zinsbindungEnde} onChange={e => vf('zinsbindungEnde', e.target.value)} /></div>
                <div><label style={lS}>Laufzeit bis</label><input style={iS} type="date" value={verbForm.laufzeitEnde} onChange={e => vf('laufzeitEnde', e.target.value)} /></div>
              </div>
              <div><label style={lS}>Notiz</label><textarea style={{ ...iS, resize: 'none', minHeight: 56 } as any} value={verbForm.notiz} onChange={e => vf('notiz', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setVerbFormOffen(false); setVerbEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e0d8', background: 'white', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={speichereVerb} disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#1a1a1a', color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '⏳...' : '💾 Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
