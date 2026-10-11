import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { btnPrimary, btnSecondary } from '../ui/theme'

// Belegsammler für die Immobilien: jede Ausgabe mit Foto/PDF ablegen und
// sehen, wie viel insgesamt schon ausgegeben wurde – je Objekt oder über alle.

export const IMMO_BELEG_KATEGORIEN = [
  'Kauf & Nebenkosten', 'Planung & Behörden', 'Handwerker', 'Material & Baumarkt',
  'Geräte & Einrichtung', 'Energie & Betrieb', 'Versicherung & Gebühren', 'Sonstiges',
]
const KAT_FARBEN: Record<string, string> = {
  'Kauf & Nebenkosten':      '#6366f1',
  'Planung & Behörden':      '#8b5cf6',
  'Handwerker':              '#f59e0b',
  'Material & Baumarkt':     '#10b981',
  'Geräte & Einrichtung':    '#3b82f6',
  'Energie & Betrieb':       '#ec4899',
  'Versicherung & Gebühren': '#14b8a6',
  'Sonstiges':               '#94a3b8',
}

const eur = (v: any) => (parseFloat(v) || 0).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const datumAT = (d: string | null) => d ? new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const heute = () => new Date().toISOString().slice(0, 10)

const leerForm = { objektId: '', datum: heute(), lieferant: '', beschreibung: '', kategorie: 'Material & Baumarkt', betrag: '', notiz: '' }

const inputStil: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--bf-input-border)',
  borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bf-input-bg)', color: 'var(--bf-text)',
}
const labelStil: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--bf-text-muted)', marginBottom: 4, display: 'block' }
const karte: React.CSSProperties = { background: 'var(--bf-card)', borderRadius: 12, border: '1px solid var(--bf-border)', padding: 20 }

export default function ImmoBelegsammler({ objektId }: { objektId?: number }) {
  const [belege, setBelege]       = useState<any[]>([])
  const [objekte, setObjekte]     = useState<any[]>([])
  const [laden, setLaden]         = useState(true)
  const [filterObjekt, setFilterObjekt] = useState(objektId ? String(objektId) : '')
  const [filterJahr, setFilterJahr]     = useState('')
  const [filterKat, setFilterKat]       = useState('')
  const [suche, setSuche]               = useState('')
  const [formOffen, setFormOffen] = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [form, setForm]           = useState<any>({ ...leerForm })
  const [datei, setDatei]         = useState<File | null>(null)
  const [kiLaeuft, setKiLaeuft]   = useState(false)
  const [kiHinweis, setKiHinweis] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [vorschau, setVorschau]   = useState<{ url: string; typ: string; name: string } | null>(null)
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)
  const dateiInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const neuLaden = () => {
    Promise.all([
      api.get(`/immo/belege${objektId ? `?objektId=${objektId}` : ''}`),
      api.get('/immo/objekte'),
    ]).then(([b, o]) => { setBelege(b.data); setObjekte(o.data) }).catch(() => {}).finally(() => setLaden(false))
  }
  useEffect(() => { setLaden(true); neuLaden() }, [objektId]) // eslint-disable-line react-hooks/exhaustive-deps

  const objektName = (id: any) => objekte.find(o => o.id === id)?.name || 'Ohne Objekt'

  // ── Formular ──────────────────────────────────────────────────────────────
  const oeffnen = (b?: any, neueDatei?: File) => {
    setKiHinweis('')
    if (b) {
      setForm({
        objektId: b.objektId ? String(b.objektId) : '', datum: b.datum ? String(b.datum).slice(0, 10) : '',
        lieferant: b.lieferant || '', beschreibung: b.beschreibung || '', kategorie: b.kategorie || 'Sonstiges',
        betrag: b.betrag != null ? String(b.betrag) : '', notiz: b.notiz || '',
      })
      setEditId(b.id)
    } else {
      setForm({ ...leerForm, datum: heute(), objektId: objektId ? String(objektId) : filterObjekt })
      setEditId(null)
    }
    setDatei(neueDatei || null)
    setFormOffen(true)
    if (neueDatei) kiAuslesen(neueDatei)
  }

  const kiAuslesen = async (f: File) => {
    setKiLaeuft(true); setKiHinweis('KI liest den Beleg …')
    try {
      const fd = new FormData(); fd.append('datei', f)
      const r = await api.post('/immo/belege/ki-auslesen', fd)
      const d = r.data?.daten || {}
      setForm((p: any) => ({
        ...p,
        betrag:       d.betrag != null ? String(d.betrag) : p.betrag,
        datum:        d.datum || p.datum,
        lieferant:    d.lieferant || p.lieferant,
        beschreibung: d.beschreibung || p.beschreibung,
        kategorie:    IMMO_BELEG_KATEGORIEN.includes(d.kategorie) ? d.kategorie : p.kategorie,
      }))
      setKiHinweis('Von der KI ausgefüllt – bitte kurz prüfen.')
    } catch (e: any) {
      setKiHinweis(e?.response?.data?.fehler || 'KI konnte den Beleg nicht lesen – bitte von Hand ausfüllen.')
    }
    setKiLaeuft(false)
  }

  const dateiGewaehlt = (f?: File | null) => {
    if (!f) return
    if (formOffen) { setDatei(f); kiAuslesen(f) } else oeffnen(undefined, f)
  }

  const speichern = async () => {
    if (!/\d/.test(form.betrag)) { alert('Bitte einen Betrag eingeben'); return }
    setSpeichert(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v ?? '')))
      if (datei) fd.append('datei', datei)
      if (editId) await api.put(`/immo/belege/${editId}`, fd)
      else await api.post('/immo/belege', fd)
      setFormOffen(false); setDatei(null)
      neuLaden()
    } catch (e: any) { alert(e?.response?.data?.fehler || 'Fehler beim Speichern') }
    setSpeichert(false)
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Beleg wirklich löschen?')) return
    try { await api.delete(`/immo/belege/${id}`); neuLaden() } catch { alert('Fehler beim Löschen') }
  }

  const ansehen = async (b: any) => {
    try {
      const r = await api.get(`/immo/belege/${b.id}/datei`, { responseType: 'blob' })
      setVorschau({ url: URL.createObjectURL(r.data), typ: b.datei_typ || r.data.type, name: b.dateiname || 'Beleg' })
    } catch { alert('Datei konnte nicht geladen werden') }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const [exportLaeuft, setExportLaeuft] = useState(false)
  const speichereDatei = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const exportPdf = async () => {
    setExportLaeuft(true)
    try {
      const q = new URLSearchParams()
      const oid = objektId ? String(objektId) : filterObjekt
      if (oid) q.set('objektId', oid)
      if (filterJahr) q.set('jahr', filterJahr)
      if (filterKat) q.set('kategorie', filterKat)
      const r = await api.get(`/immo/belege-export?${q}`, { responseType: 'blob' })
      const objName = oid ? objektName(parseInt(oid)) : 'Immobilien'
      speichereDatei(r.data, `Belege_${objName}_${filterJahr || 'gesamt'}.pdf`.replace(/[^\wÄÖÜäöüß.-]+/g, '-'))
    } catch (e: any) {
      let msg = 'Export fehlgeschlagen'
      try { msg = JSON.parse(await e.response.data.text()).fehler || msg } catch {}
      alert(msg)
    }
    setExportLaeuft(false)
  }
  const exportCsv = () => {
    const zelle = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const zeilen = [['Nr.', 'Datum', 'Firma', 'Wofür', 'Kategorie', 'Objekt', 'Betrag brutto', 'Notiz', 'Datei']]
    ;[...gefiltert].sort((a, b) => (a.datum ? 0 : 1) - (b.datum ? 0 : 1) || String(a.datum || '').localeCompare(String(b.datum || '')) || a.id - b.id).forEach((b, i) => zeilen.push([
      String(i + 1), datumAT(b.datum), b.lieferant || '', b.beschreibung || '', b.kategorie || '',
      objektName(b.objektId), (parseFloat(b.betrag) || 0).toFixed(2).replace('.', ','), b.notiz || '', b.dateiname || '',
    ]))
    const csv = '\ufeff' + zeilen.map(z => z.map(zelle).join(';')).join('\r\n')
    speichereDatei(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `Belege_${filterJahr || 'gesamt'}.csv`)
  }

  // ── Auswertung ────────────────────────────────────────────────────────────
  const jahre = Array.from(new Set(belege.map(b => b.datum ? String(b.datum).slice(0, 4) : '').filter(Boolean))).sort().reverse()
  const gefiltert = belege.filter(b => {
    if (!objektId && filterObjekt && String(b.objektId || '') !== filterObjekt) return false
    if (filterJahr && !(b.datum && String(b.datum).startsWith(filterJahr))) return false
    if (filterKat && b.kategorie !== filterKat) return false
    if (suche) {
      const t = `${b.lieferant || ''} ${b.beschreibung || ''} ${b.notiz || ''}`.toLowerCase()
      if (!t.includes(suche.toLowerCase())) return false
    }
    return true
  })
  const summe = gefiltert.reduce((s, b) => s + (parseFloat(b.betrag) || 0), 0)
  const jahrJetzt = String(new Date().getFullYear())
  const summeJahr = gefiltert.filter(b => b.datum && String(b.datum).startsWith(jahrJetzt)).reduce((s, b) => s + (parseFloat(b.betrag) || 0), 0)
  const monatJetzt = new Date().toISOString().slice(0, 7)
  const summeMonat = gefiltert.filter(b => b.datum && String(b.datum).startsWith(monatJetzt)).reduce((s, b) => s + (parseFloat(b.betrag) || 0), 0)

  const jeKat: Record<string, number> = {}
  gefiltert.forEach(b => { jeKat[b.kategorie || 'Sonstiges'] = (jeKat[b.kategorie || 'Sonstiges'] || 0) + (parseFloat(b.betrag) || 0) })
  const katListe = Object.entries(jeKat).sort((a, b) => b[1] - a[1])
  const katMax = katListe.length ? katListe[0][1] : 0

  const jeObjekt: Record<string, number> = {}
  gefiltert.forEach(b => { const n = objektName(b.objektId); jeObjekt[n] = (jeObjekt[n] || 0) + (parseFloat(b.betrag) || 0) })
  const objListe = Object.entries(jeObjekt).sort((a, b) => b[1] - a[1])

  const sel: React.CSSProperties = { ...inputStil, width: 'auto', minWidth: isMobile ? 0 : 150, flex: isMobile ? '1 1 140px' : undefined }

  // ── Ansicht ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: objektId ? 0 : (isMobile ? 0 : 24), maxWidth: 1100, margin: '0 auto' }}>
      {!objektId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'var(--bf-text)' }}>Belegsammler</div>
            <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 2 }}>Alle Ausgaben für die Immobilien – Foto oder PDF genügt</div>
          </div>
        </div>
      )}

      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Bisher ausgegeben', wert: `€ ${eur(summe)}`, farbe: '#6366f1', gross: true },
          { label: `Im Jahr ${jahrJetzt}`, wert: `€ ${eur(summeJahr)}`, farbe: 'var(--bf-text)' },
          { label: 'Dieser Monat', wert: `€ ${eur(summeMonat)}`, farbe: 'var(--bf-text)' },
          { label: 'Belege', wert: String(gefiltert.length), farbe: 'var(--bf-text)' },
        ].map(k => (
          <div key={k.label} style={{ ...karte, padding: '14px 16px', gridColumn: isMobile && k.gross ? '1 / -1' : undefined }}>
            <div style={{ fontSize: 11, color: 'var(--bf-text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: k.gross ? 24 : 18, fontWeight: 800, color: k.farbe, fontVariantNumeric: 'tabular-nums' }}>{k.wert}</div>
          </div>
        ))}
      </div>

      {/* Ablage-Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); dateiGewaehlt(e.dataTransfer.files?.[0]) }}
        onClick={() => dateiInput.current?.click()}
        style={{ ...karte, padding: isMobile ? 16 : 22, marginBottom: 16, cursor: 'pointer', textAlign: 'center',
          border: `2px dashed ${dragOver ? '#6366f1' : 'var(--bf-border)'}`, background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bf-card)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--bf-text)' }}>
          {isMobile ? '📷 Beleg fotografieren oder Datei wählen' : 'Beleg hierher ziehen oder klicken'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 4 }}>JPG, PNG, WEBP oder PDF · die KI füllt Betrag, Datum und Firma vor</div>
        <input ref={dateiInput} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
          onChange={e => { dateiGewaehlt(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginBottom: 16 }}>
        <button onClick={() => oeffnen()} style={{ ...btnSecondary }}>+ Ohne Datei erfassen</button>
      </div>

      {/* Aufteilung */}
      {katListe.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: !objektId && !isMobile && objListe.length > 1 ? '3fr 2fr' : '1fr', gap: 12, marginBottom: 16 }}>
          <div style={karte}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--bf-text)' }}>Wofür das Geld ging</div>
            {katListe.map(([k, v]) => (
              <div key={k} onClick={() => setFilterKat(filterKat === k ? '' : k)} style={{ marginBottom: 9, cursor: 'pointer', opacity: filterKat && filterKat !== k ? 0.45 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bf-text)', marginBottom: 3 }}>
                  <span>{k}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>€ {eur(v)} <span style={{ color: 'var(--bf-text-muted)', fontWeight: 400 }}>· {summe ? Math.round(v / summe * 100) : 0} %</span></span>
                </div>
                <div style={{ height: 7, background: 'var(--bf-soft)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${katMax ? v / katMax * 100 : 0}%`, height: '100%', background: KAT_FARBEN[k] || '#94a3b8', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          {!objektId && objListe.length > 1 && (
            <div style={karte}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--bf-text)' }}>Je Objekt</div>
              {objListe.map(([n, v]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--bf-divider)', color: 'var(--bf-text)' }}>
                  <span>{n}</span><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>€ {eur(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {!objektId && (
          <select value={filterObjekt} onChange={e => setFilterObjekt(e.target.value)} style={sel}>
            <option value=''>Alle Objekte</option>
            {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        <select value={filterJahr} onChange={e => setFilterJahr(e.target.value)} style={sel}>
          <option value=''>Alle Jahre</option>
          {jahre.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select value={filterKat} onChange={e => setFilterKat(e.target.value)} style={sel}>
          <option value=''>Alle Kategorien</option>
          {IMMO_BELEG_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={suche} onChange={e => setSuche(e.target.value)} placeholder="Suchen (Firma, Text) …" style={{ ...sel, flex: '1 1 180px' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={exportPdf} disabled={exportLaeuft || !gefiltert.length} style={{ ...btnPrimary, opacity: exportLaeuft || !gefiltert.length ? 0.6 : 1 }}>
          {exportLaeuft ? 'PDF wird erstellt …' : 'PDF fürs Finanzamt'}
        </button>
        <button onClick={exportCsv} disabled={!gefiltert.length} style={btnSecondary}>Liste als Excel (CSV)</button>
        <span style={{ fontSize: 11, color: 'var(--bf-text-muted)' }}>Aufstellung mit Summen + alle Belege, nach den gewählten Filtern{suche ? ' (Suchtext gilt nur für die CSV)' : ''}</span>
      </div>

      {/* Liste */}
      <div style={{ ...karte, padding: 0, overflow: 'hidden' }}>
        {laden ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--bf-text-muted)', fontSize: 13 }}>Lädt …</div>
        ) : gefiltert.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--bf-text-muted)', fontSize: 13 }}>
            {belege.length ? 'Kein Beleg passt zum Filter.' : 'Noch keine Belege – oben das erste Foto oder PDF ablegen.'}
          </div>
        ) : gefiltert.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--bf-divider)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: KAT_FARBEN[b.kategorie] || '#94a3b8', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => oeffnen(b)}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bf-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.lieferant || b.beschreibung || 'Beleg'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bf-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {datumAT(b.datum)} · {b.kategorie}{!objektId ? ` · ${objektName(b.objektId)}` : ''}{b.lieferant && b.beschreibung ? ` · ${b.beschreibung}` : ''}
              </div>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>€ {eur(b.betrag)}</div>
            {b.hat_datei
              ? <button onClick={() => ansehen(b)} title="Beleg ansehen" style={{ ...btnSecondary, padding: '6px 9px' }}>📄</button>
              : <span style={{ width: 34 }} />}
            {!isMobile && <button onClick={() => loeschen(b.id)} title="Löschen" style={{ ...btnSecondary, padding: '6px 9px', color: '#ef4444' }}>✕</button>}
          </div>
        ))}
        {gefiltert.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bf-thead)', fontSize: 13, color: 'var(--bf-text)' }}>
            <span style={{ color: 'var(--bf-text-muted)' }}>Summe ({gefiltert.length} Belege)</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>€ {eur(summe)}</span>
          </div>
        )}
      </div>

      {/* Formular */}
      {formOffen && (
        <div onClick={() => !speichert && setFormOffen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...karte, width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', borderRadius: isMobile ? '16px 16px 0 0' : 14 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--bf-text)', marginBottom: 14 }}>{editId ? 'Beleg bearbeiten' : 'Neuer Beleg'}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <button onClick={() => dateiInput.current?.click()} style={btnSecondary} disabled={kiLaeuft}>
                {datei ? 'Andere Datei' : editId ? 'Datei ersetzen' : 'Foto / PDF wählen'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--bf-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{datei?.name || ''}</span>
            </div>
            {kiHinweis && <div style={{ fontSize: 12, marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--bf-soft)', color: kiLaeuft ? '#6366f1' : 'var(--bf-text-soft)' }}>{kiHinweis}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStil}>Betrag brutto (€) *</label>
                <input inputMode="decimal" value={form.betrag} onChange={e => setForm({ ...form, betrag: e.target.value })} style={inputStil} placeholder="0,00" /></div>
              <div><label style={labelStil}>Datum</label>
                <input type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} style={inputStil} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStil}>Firma / Geschäft</label>
                <input value={form.lieferant} onChange={e => setForm({ ...form, lieferant: e.target.value })} style={inputStil} placeholder="z. B. Hornbach, Elektro Huber" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStil}>Wofür</label>
                <input value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} style={inputStil} placeholder="z. B. Fliesenkleber, Elektroinstallation Bad" /></div>
              <div><label style={labelStil}>Kategorie</label>
                <select value={form.kategorie} onChange={e => setForm({ ...form, kategorie: e.target.value })} style={inputStil}>
                  {IMMO_BELEG_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                </select></div>
              <div><label style={labelStil}>Objekt</label>
                <select value={form.objektId} onChange={e => setForm({ ...form, objektId: e.target.value })} style={inputStil}>
                  <option value=''>Ohne Objekt</option>
                  {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStil}>Notiz</label>
                <textarea value={form.notiz} onChange={e => setForm({ ...form, notiz: e.target.value })} rows={2} style={{ ...inputStil, resize: 'vertical' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 18 }}>
              {editId ? <button onClick={() => { setFormOffen(false); loeschen(editId) }} style={{ ...btnSecondary, color: '#ef4444' }}>Löschen</button> : <span />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setFormOffen(false)} style={btnSecondary} disabled={speichert}>Abbrechen</button>
                <button onClick={speichern} style={btnPrimary} disabled={speichert || kiLaeuft}>{speichert ? 'Speichert …' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vorschau */}
      {vorschau && (
        <div onClick={() => { URL.revokeObjectURL(vorschau.url); setVorschau(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: 13 }}>
              <span>{vorschau.name}</span>
              <span style={{ display: 'flex', gap: 14 }}>
                <a href={vorschau.url} download={vorschau.name} style={{ color: 'white' }}>Herunterladen</a>
                <span style={{ cursor: 'pointer' }} onClick={() => { URL.revokeObjectURL(vorschau.url); setVorschau(null) }}>Schließen ✕</span>
              </span>
            </div>
            {vorschau.typ === 'application/pdf'
              ? <iframe src={vorschau.url} title={vorschau.name} style={{ flex: 1, border: 0, borderRadius: 8, background: 'white' }} />
              : <img src={vorschau.url} alt={vorschau.name} style={{ flex: 1, minHeight: 0, objectFit: 'contain', borderRadius: 8 }} />}
          </div>
        </div>
      )}
    </div>
  )
}
