import React, { useState, useEffect } from 'react'
import api from '../services/api'

const GOLD  = '#c8a96e'
const BLAU  = '#6366f1'
const GRUEN = '#10b981'
const ROT   = '#ef4444'

interface Reisekost {
  id: number
  datum: string
  zielort: string
  zweck: string
  uhrzeit_start?: string
  uhrzeit_ende?: string
  stunden_dauer?: number
  km_einfach: number
  essen_bekommen: boolean
  km_geld: number
  taggeld: number
  gesamt: number
  km_fahrt_hin_id?: number
  km_fahrt_rueck_id?: number
  km_hin_km?: number
  km_hin_ziel?: string
  km_hin_zweck?: string
  km_rueck_km?: number
  km_rueck_ziel?: string
  km_rueck_zweck?: string
  in_guv: boolean
  guv_id?: number
  createdAt: string
}

interface KmTag {
  id: number
  datum: string
  km_gefahren: number
  ziel_adresse: string
  start_adresse: string
  zweck: string
}

const emptyForm = () => ({
  datum: new Date().toISOString().split('T')[0],
  zielort: '',
  zweck: '',
  uhrzeit_start: '',
  uhrzeit_ende: '',
  km_einfach: '',
  essen_bekommen: false,
})

// ── Berechnungslogik Österreich 2026 ────────────────────────────────────────
function stundenAusUhrzeiten(start: string, ende: string): number {
  if (!start || !ende) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = ende.split(':').map(Number)
  const minuten = (eh * 60 + em) - (sh * 60 + sm)
  return minuten > 0 ? minuten / 60 : 0
}

function berechneVorschau(kmEinfach: number, uhrzeitStart: string, uhrzeitEnde: string, essenBekommen: boolean) {
  const km_geld = kmEinfach * 2 * 0.50
  const stunden = stundenAusUhrzeiten(uhrzeitStart, uhrzeitEnde)
  let taggeld = 0
  if (kmEinfach >= 25 && stunden > 3) {
    taggeld = Math.min(Math.ceil(stunden) * 2.50, 30.00)
    if (essenBekommen) taggeld = Math.max(0, taggeld - 15.00)
  }
  return {
    km_geld:  Math.round(km_geld  * 100) / 100,
    taggeld:  Math.round(taggeld  * 100) / 100,
    gesamt:   Math.round((km_geld + taggeld) * 100) / 100,
    stunden,
  }
}

const fmt = (n: number) =>
  n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONATSNAMEN = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const MONATSNAMEN_LANG = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

export default function Reisekosten() {
  const [eintraege, setEintraege] = useState<Reisekost[]>([])
  const [laden, setLaden]         = useState(false)
  const [filterJahr, setFilterJahr] = useState(new Date().getFullYear())
  const [filterMonat, setFilterMonat] = useState('Alle')
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)
  const [toast, setToast]         = useState<{ text: string; ok: boolean } | null>(null)

  // Form
  const [formOffen, setFormOffen] = useState(false)
  const [editEintrag, setEditEintrag] = useState<Reisekost | null>(null)
  const [form, setForm]           = useState(emptyForm())

  // KM-Tage Verknüpfung – getrennt für Hin und Rück
  const [kmTage, setKmTage]             = useState<KmTag[]>([])
  const [kmHinGewählt, setKmHinGewählt] = useState<KmTag | null>(null)
  const [kmRueckGewählt, setKmRueckGewählt] = useState<KmTag | null>(null)

  // Modals
  const [detailEintrag, setDetailEintrag]   = useState<Reisekost | null>(null)
  const [confirmModal, setConfirmModal]     = useState<{ text: string; onJa: () => void } | null>(null)

  // Diagramm
  const [diagrammAnsicht, setDiagrammAnsicht] = useState<'jahr' | 'monat'>('jahr')
  const [diagrammMonat, setDiagrammMonat]     = useState<number>(new Date().getMonth() + 1)
  const [hoveredBar, setHoveredBar]           = useState<number | null>(null)

  const jahre = [new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2]

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { ladeEintraege() }, [filterJahr]) // eslint-disable-line

  const ladeEintraege = async () => {
    setLaden(true)
    try {
      const res = await api.get(`/reisekosten?jahr=${filterJahr}`)
      setEintraege(res.data)
    } catch {}
    setLaden(false)
  }

  const zeigeToast = (text: string, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const ladeKmTage = async (datum: string) => {
    if (!datum) { setKmTage([]); return }
    try {
      const res = await api.get(`/reisekosten/km-tage?datum=${datum}`)
      setKmTage(res.data)
    } catch {}
  }

  const oeffneForm = (e?: Reisekost) => {
    if (e) {
      setEditEintrag(e)
      setForm({
        datum: e.datum?.split('T')[0] || new Date().toISOString().split('T')[0],
        zielort: e.zielort,
        zweck: e.zweck,
        uhrzeit_start: e.uhrzeit_start || '',
        uhrzeit_ende: e.uhrzeit_ende || '',
        km_einfach: String(e.km_einfach),
        essen_bekommen: e.essen_bekommen,
      })
      setKmHinGewählt(e.km_fahrt_hin_id ? {
        id: e.km_fahrt_hin_id,
        datum: e.datum,
        km_gefahren: e.km_hin_km || 0,
        ziel_adresse: e.km_hin_ziel || '',
        start_adresse: '',
        zweck: e.km_hin_zweck || '',
      } : null)
      setKmRueckGewählt(e.km_fahrt_rueck_id ? {
        id: e.km_fahrt_rueck_id,
        datum: e.datum,
        km_gefahren: e.km_rueck_km || 0,
        ziel_adresse: e.km_rueck_ziel || '',
        start_adresse: '',
        zweck: e.km_rueck_zweck || '',
      } : null)
      ladeKmTage(e.datum?.split('T')[0] || '')
    } else {
      setEditEintrag(null)
      setForm(emptyForm())
      setKmHinGewählt(null)
      setKmRueckGewählt(null)
      setKmTage([])
      ladeKmTage(new Date().toISOString().split('T')[0])
    }
    setFormOffen(true)
  }

  // Wenn Hinfahrt gewählt → km_einfach + zielort + zweck autom. befüllen
  const wähleHinfahrt = (k: KmTag | null) => {
    setKmHinGewählt(k)
    if (k) {
      setForm(f => ({
        ...f,
        zielort: f.zielort || k.ziel_adresse.split(',').slice(0, 2).join(','),
        zweck:   f.zweck   || k.zweck,
        km_einfach: String(Math.round(Number(k.km_gefahren) * 10) / 10),
      }))
    }
  }

  // Wenn Rückfahrt gewählt → km_einfach aus Rückfahrt falls noch nicht gesetzt
  const wähleRueckfahrt = (k: KmTag | null) => {
    setKmRueckGewählt(k)
    if (k && !kmHinGewählt) {
      // Wenn nur Rückfahrt gewählt, km_einfach aus Rückfahrt nehmen
      setForm(f => ({
        ...f,
        km_einfach: f.km_einfach || String(Math.round(Number(k.km_gefahren) * 10) / 10),
      }))
    }
  }

  const speichern = async () => {
    if (!form.datum || !form.zielort || !form.zweck || !form.km_einfach) {
      zeigeToast('Bitte alle Pflichtfelder ausfüllen', false)
      return
    }
    try {
      const payload = {
        datum: form.datum,
        zielort: form.zielort,
        zweck: form.zweck,
        uhrzeit_start: form.uhrzeit_start || null,
        uhrzeit_ende: form.uhrzeit_ende || null,
        km_einfach: Number(form.km_einfach),
        essen_bekommen: form.essen_bekommen,
        km_fahrt_hin_id:   kmHinGewählt?.id   || null,
        km_fahrt_rueck_id: kmRueckGewählt?.id || null,
      }
      if (editEintrag) {
        await api.put(`/reisekosten/${editEintrag.id}`, payload)
        zeigeToast('✅ Reisekostenabrechnung aktualisiert')
      } else {
        await api.post('/reisekosten', payload)
        zeigeToast('✅ Dienstreise gespeichert')
      }
      setFormOffen(false)
      setEditEintrag(null)
      ladeEintraege()
    } catch {
      zeigeToast('Fehler beim Speichern', false)
    }
  }

  const loeschen = async (id: number) => {
    try {
      await api.delete(`/reisekosten/${id}`)
      zeigeToast('🗑 Eintrag gelöscht')
      ladeEintraege()
    } catch { zeigeToast('Fehler beim Löschen', false) }
  }

  const guvUebertragen = async (e: Reisekost) => {
    try {
      const res = await api.post(`/reisekosten/${e.id}/guv-uebertrag`)
      const { betrag, info } = res.data
      const fmtB = betrag.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (info === 'taggeld_uebertragen') {
        zeigeToast(`✅ Taggeld € ${fmtB} in G&V eingetragen (KM-Geld via KM-Buch)`)
      } else {
        zeigeToast(`✅ Reisekosten € ${fmtB} in G&V eingetragen`)
      }
      ladeEintraege()
    } catch (err: any) {
      const msg = err?.response?.data?.fehler || 'Fehler beim G&V-Übertrag'
      const info = err?.response?.data?.info
      if (info === 'nichts_zu_uebertragen') {
        zeigeToast('ℹ️ KM-Geld ist im KM-Buch, kein Taggeld vorhanden – nichts zu übertragen', false)
      } else {
        zeigeToast(msg, false)
      }
    }
  }

  // ── Filter & Berechnung ──────────────────────────────────────────────────
  const gefiltert = filterMonat === 'Alle'
    ? eintraege
    : eintraege.filter(e => e.datum?.startsWith(filterMonat))

  const monate = Array.from(new Set(
    eintraege.map(e => e.datum?.substring(0, 7)).filter(Boolean)
  )).sort().reverse() as string[]

  const totalKmGeld  = gefiltert.reduce((s, e) => s + Number(e.km_geld), 0)
  const totalTaggeld = gefiltert.reduce((s, e) => s + Number(e.taggeld), 0)
  const totalGesamt  = gefiltert.reduce((s, e) => s + Number(e.gesamt), 0)
  const totalKmEinfach = gefiltert.reduce((s, e) => s + Number(e.km_einfach) * 2, 0)

  // Live-Vorschau
  const vorschau = berechneVorschau(
    Number(form.km_einfach) || 0,
    form.uhrzeit_start,
    form.uhrzeit_ende,
    form.essen_bekommen,
  )

  // ── Monatliche Aggregate für Diagramm ────────────────────────────────────
  const monatsDaten = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mE = eintraege.filter(e => new Date(e.datum).getMonth() + 1 === m)
    const sumGesamt  = mE.reduce((s, e) => s + Number(e.gesamt),  0)
    const sumKmGeld  = mE.reduce((s, e) => s + Number(e.km_geld), 0)
    const sumTaggeld = mE.reduce((s, e) => s + Number(e.taggeld), 0)
    return {
      monat: m,
      label: MONATSNAMEN[i],
      labelLang: MONATSNAMEN_LANG[i],
      gesamt: sumGesamt, km_geld: sumKmGeld, taggeld: sumTaggeld,
      anzahl: mE.length, hatDaten: mE.length > 0,
    }
  })
  const maxWertJahr = Math.max(...monatsDaten.map(m => m.gesamt), 1)

  // ── CSV Export ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Datum','Zielort','Zweck','Abfahrt','Ankunft','Std.','km einfach','km ges.','KM-Geld €','Taggeld €','Gesamt €','Essen gst.','Hinfahrt KM-ID','Rückfahrt KM-ID']
    const rows = gefiltert.map(e => [
      e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '',
      e.zielort, e.zweck,
      e.uhrzeit_start || '', e.uhrzeit_ende || '',
      e.stunden_dauer ? Number(e.stunden_dauer).toFixed(1) : '',
      Number(e.km_einfach).toFixed(1),
      (Number(e.km_einfach) * 2).toFixed(1),
      fmt(Number(e.km_geld)), fmt(Number(e.taggeld)), fmt(Number(e.gesamt)),
      e.essen_bekommen ? 'Ja' : 'Nein',
      e.km_fahrt_hin_id || '', e.km_fahrt_rueck_id || '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Reisekosten-${filterJahr}.csv`
    a.click()
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'white', borderRadius: 16, padding: '18px 20px',
    border: '1px solid #f0ece4', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px', border: '1px solid #e5e0d8',
    borderRadius: 10, fontFamily: 'DM Sans, sans-serif', fontSize: 14,
    background: 'white', color: '#1a2a3a', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  }

  // ── Hilfsfunktion: KM-Chip rendern ──────────────────────────────────────
  const KmChip = ({ k, gewählt, onWähle, onLöse, farbe }: {
    k: KmTag; gewählt: boolean
    onWähle: () => void; onLöse: () => void; farbe: string
  }) => (
    <button onClick={gewählt ? onLöse : onWähle} style={{
      padding: '6px 12px', borderRadius: 9, border: `1.5px solid ${gewählt ? farbe : 'transparent'}`,
      cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
      background: gewählt ? farbe : 'white',
      color: gewählt ? 'white' : '#1a2a3a',
      boxShadow: gewählt ? `0 3px 10px ${farbe}44` : '0 1px 4px rgba(0,0,0,0.08)',
      textAlign: 'left' as const,
    }}>
      <div>{k.ziel_adresse.split(',')[0]}</div>
      <div style={{ opacity: 0.75, fontWeight: 600, marginTop: 1 }}>{Number(k.km_gefahren).toFixed(1)} km · {k.zweck}</div>
    </button>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '16px' : '28px', fontFamily: 'DM Sans, sans-serif', maxWidth: 960, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#1a3a2a' : '#3a1a1a',
          color: toast.ok ? '#6ee7b7' : '#fca5a5',
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${toast.ok ? '#10b98144' : '#ef444444'}`,
          maxWidth: 340,
        }}>{toast.text}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0, color: '#1a2a3a' }}>
          ✈️ Reisekosten
        </h2>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Dienstreise-Abrechnung · Österreich 2026 · km-Geld 0,50 €/km · Taggeld § 26 EStG
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {jahre.map(j => (
            <button key={j} onClick={() => { setFilterJahr(j); setFilterMonat('Alle') }} style={{
              padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              background: j === filterJahr ? `linear-gradient(135deg, ${GOLD}, #e8c98e)` : '#f4f1eb',
              color: j === filterJahr ? '#0a0a0a' : '#888',
              boxShadow: j === filterJahr ? '0 4px 14px rgba(200,169,110,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>{j}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'KM-Geld',     value: `€ ${fmt(totalKmGeld)}`,  sub: `${totalKmEinfach.toFixed(0)} km gesamt`, color: BLAU  },
          { label: 'Taggeld',      value: `€ ${fmt(totalTaggeld)}`, sub: 'Diäten',                                 color: GRUEN },
          { label: 'Absetzbar',    value: `€ ${fmt(totalGesamt)}`,  sub: 'KM-Geld + Taggeld',                      color: GOLD  },
          { label: 'Dienstreisen', value: gefiltert.length,          sub: 'Einträge',                              color: ROT   },
        ].map(s => (
          <div key={s.label} style={{ ...card, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#1a2a3a' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Diagramm ──────────────────────────────────────────────────────── */}
      {eintraege.length > 0 && (() => {
        const CHART_H = 180
        const aktMonat = new Date().getMonth() + 1
        return (
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#1a2a3a' }}>📊 Reisekosten – {filterJahr}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
                  {diagrammAnsicht === 'jahr' ? '12-Monats-Balkendiagramm · absetzbare Beträge · Hover für Details' : `Monatsdetail: ${MONATSNAMEN_LANG[diagrammMonat - 1]} ${filterJahr}`}
                </div>
              </div>
              <div style={{ display: 'flex', background: '#f4f1eb', borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ k: 'jahr' as const, l: '📅 Jahresansicht' }, { k: 'monat' as const, l: '🔍 Monatsdetail' }].map(t => (
                  <button key={t.k} onClick={() => setDiagrammAnsicht(t.k)} style={{
                    padding: '7px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: diagrammAnsicht === t.k ? 'white' : 'transparent',
                    color: diagrammAnsicht === t.k ? '#1a2a3a' : '#aaa',
                    boxShadow: diagrammAnsicht === t.k ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s',
                  }}>{t.l}</button>
                ))}
              </div>
            </div>

            {diagrammAnsicht === 'jahr' ? (
              <>
                <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', height: CHART_H + 22, paddingBottom: 22, marginRight: 8, flexShrink: 0 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ fontSize: 9, color: '#ccc', textAlign: 'right', minWidth: 38, lineHeight: 1 }}>
                        {i === 0 ? '€ 0' : `€ ${(maxWertJahr * i / 4).toLocaleString('de-AT', { maximumFractionDigits: 0 })}`}
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                      <div key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: 22 + Math.round(p * CHART_H), height: 1, background: i === 0 ? '#e5e0d8' : '#f4f1eb', zIndex: 0 }} />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: CHART_H + 22, paddingBottom: 22, gap: isMobile ? 2 : 4 }}>
                      {monatsDaten.map((m, i) => {
                        const bH = Math.round((m.gesamt / maxWertJahr) * CHART_H)
                        const istAktMonat = m.monat === aktMonat && filterJahr === new Date().getFullYear()
                        const isHov = hoveredBar === i
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }}
                            onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                            {isHov && (
                              <div style={{ position: 'absolute', bottom: CHART_H + 28, left: '50%', transform: 'translateX(-50%)', background: '#1a2a3a', color: 'white', borderRadius: 10, padding: '10px 14px', fontSize: 11, fontWeight: 600, zIndex: 20, whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{m.labelLang} {filterJahr}</div>
                                <div style={{ color: `${BLAU}dd`, marginBottom: 3 }}>🚗 KM-Geld: € {fmt(m.km_geld)}</div>
                                <div style={{ color: GRUEN, marginBottom: 3 }}>🍽 Taggeld: &nbsp;€ {fmt(m.taggeld)}</div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 6, paddingTop: 6, color: GOLD, fontWeight: 800 }}>
                                  ✓ Gesamt: € {fmt(m.gesamt)} · {m.anzahl} Reisen
                                </div>
                              </div>
                            )}
                            <div style={{ width: '70%', height: bH || (m.gesamt > 0 ? 2 : 0), background: isHov ? `linear-gradient(180deg, ${GOLD}, #e8c98e)` : istAktMonat ? `linear-gradient(180deg, ${GOLD}cc, #e8c98eaa)` : `${GOLD}88`, borderRadius: '4px 4px 0 0', transition: 'background 0.15s', boxShadow: isHov ? `0 0 0 1px ${GOLD}` : 'none' }} />
                            <div style={{ fontSize: isMobile ? 8 : 10, marginTop: 5, color: istAktMonat ? BLAU : m.hatDaten ? '#666' : '#ccc', fontWeight: istAktMonat ? 800 : 600 }}>{m.label}</div>
                            {istAktMonat && <div style={{ width: 4, height: 4, borderRadius: '50%', background: BLAU, marginTop: 1 }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: GOLD }} />
                      <span style={{ color: '#555', fontWeight: 600 }}>absetzbar gesamt</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#ccc' }}>← Hover für Details</span>
                </div>
                {monatsDaten.some(m => m.hatDaten) && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: '#faf8f5', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Absetzbar pro Monat</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {monatsDaten.filter(m => m.hatDaten).map((m, i) => (
                        <div key={i} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: '#fdf8f0', color: '#7a5c1e', border: `1px solid ${GOLD}44` }}>
                          {m.label} € {fmt(m.gesamt)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
                  {monatsDaten.map((m, i) => (
                    <button key={i} onClick={() => setDiagrammMonat(m.monat)} style={{
                      padding: '6px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: diagrammMonat === m.monat ? '#1a2a3a' : m.hatDaten ? '#f4f1eb' : '#fafafa',
                      color:      diagrammMonat === m.monat ? 'white' : m.hatDaten ? '#555' : '#ccc',
                      boxShadow:  diagrammMonat === m.monat ? '0 3px 10px rgba(0,0,0,0.15)' : 'none', position: 'relative',
                    }}>
                      {m.label}
                      {m.hatDaten && <span style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: GOLD, display: 'block' }} />}
                    </button>
                  ))}
                </div>
                {(() => {
                  const mDat = monatsDaten[diagrammMonat - 1]
                  const monatEintraege = eintraege.filter(e => new Date(e.datum).getMonth() + 1 === diagrammMonat)
                  if (monatEintraege.length === 0) return (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: '#ccc' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>✈️</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Keine Dienstreisen für {mDat.labelLang}</div>
                    </div>
                  )
                  const maxBetrag = Math.max(...monatEintraege.map(e => Number(e.gesamt)), 1)
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: `${BLAU}10`, borderRadius: 12, padding: '12px 16px', border: `1px solid ${BLAU}22` }}>
                          <div style={{ fontSize: 10, color: BLAU, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>🚗 KM-Geld</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: BLAU }}>€ {fmt(mDat.km_geld)}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{mDat.anzahl} Reisen</div>
                        </div>
                        <div style={{ background: `${GRUEN}10`, borderRadius: 12, padding: '12px 16px', border: `1px solid ${GRUEN}22` }}>
                          <div style={{ fontSize: 10, color: GRUEN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>🍽 Taggeld</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: GRUEN }}>€ {fmt(mDat.taggeld)}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Diäten</div>
                        </div>
                        <div style={{ background: '#fdf8f0', borderRadius: 12, padding: '12px 16px', border: `1px solid ${GOLD}33`, gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>✅ Absetzbar</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#7a5c1e' }}>€ {fmt(mDat.gesamt)}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>gesamt</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Reisen im {mDat.labelLang}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {monatEintraege.map(e => (
                          <div key={e.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a' }}>{e.zielort}</span>
                                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>{e.zweck}</span>
                              </div>
                              <span style={{ fontSize: 12, color: '#7a5c1e', fontWeight: 700, flexShrink: 0 }}>€ {fmt(Number(e.gesamt))}</span>
                            </div>
                            <div style={{ height: 8, background: '#f4f1eb', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(Number(e.gesamt) / maxBetrag) * 100}%`, background: `linear-gradient(90deg, ${GOLD}, #e8c98e)`, borderRadius: 4, transition: 'width 0.6s' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )
      })()}

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => oeffneForm()} style={{
          background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, color: '#0a0a0a',
          border: 'none', borderRadius: 10, padding: '9px 18px',
          fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(200,169,110,0.35)',
        }}>+ Neue Dienstreise</button>
        <button onClick={exportCSV} style={{ background: '#f4f1eb', color: '#555', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          📊 Excel/CSV
        </button>
      </div>

      {/* Monat-Filter */}
      {monate.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterMonat('Alle')} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: filterMonat === 'Alle' ? '#1a2a3a' : '#f4f1eb', color: filterMonat === 'Alle' ? 'white' : '#888' }}>
            Alle ({eintraege.length})
          </button>
          {monate.map(m => {
            const count = eintraege.filter(e => e.datum?.startsWith(m)).length
            return (
              <button key={m} onClick={() => setFilterMonat(m)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: filterMonat === m ? '#1a2a3a' : '#f4f1eb', color: filterMonat === m ? 'white' : '#888' }}>
                {new Date(m + '-01').toLocaleDateString('de-AT', { month: 'short', year: '2-digit' })} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Liste */}
      {laden ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#ccc' }}>Lädt...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '50px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
          <div style={{ fontSize: 15, color: '#aaa', marginBottom: 8 }}>Noch keine Dienstreisen für {filterJahr}</div>
          <div style={{ fontSize: 12, color: '#ccc' }}>Klicke „+ Neue Dienstreise" für den ersten Eintrag</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gefiltert.map(e => (
            <div key={e.id} style={{ ...card, cursor: 'pointer' }} onClick={() => setDetailEintrag(e)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ textAlign: 'center', minWidth: 46, background: '#f4f1eb', borderRadius: 10, padding: '6px 4px' }}>
                  <div style={{ fontSize: 9, color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                    {e.datum ? new Date(e.datum).toLocaleDateString('de-AT', { month: 'short' }) : ''}
                  </div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#1a2a3a', lineHeight: 1 }}>
                    {e.datum ? new Date(e.datum).getDate() : ''}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.zielort}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{e.zweck}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: `${BLAU}12`, color: BLAU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>🚗 € {fmt(Number(e.km_geld))}</span>
                    {Number(e.taggeld) > 0 && <span style={{ fontSize: 11, background: `${GRUEN}12`, color: GRUEN, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>🍽 € {fmt(Number(e.taggeld))}</span>}
                    <span style={{ fontSize: 11, background: '#fdf8f0', color: '#7a5c1e', padding: '2px 8px', borderRadius: 6, fontWeight: 700, border: `1px solid ${GOLD}44` }}>✓ € {fmt(Number(e.gesamt))}</span>
                    {e.uhrzeit_start && e.uhrzeit_ende && <span style={{ fontSize: 11, color: '#aaa', padding: '2px 4px' }}>🕐 {e.uhrzeit_start} – {e.uhrzeit_ende}</span>}
                    {e.km_fahrt_hin_id && <span style={{ fontSize: 11, background: '#e8f5e9', color: GRUEN, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>🔗 Hin</span>}
                    {e.km_fahrt_rueck_id && <span style={{ fontSize: 11, background: '#e8eaf6', color: BLAU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>🔗 Rück</span>}
                    {e.in_guv
                      ? <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>✅ G&V</span>
                      : <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>⏳ offen</span>
                    }
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={ev => ev.stopPropagation()}>
                  {!e.in_guv && (
                    <button
                      onClick={() => setConfirmModal({
                        text: `Reisekosten „${e.zielort}" in G&V übertragen?\n${
                          (e.km_fahrt_hin_id || e.km_fahrt_rueck_id)
                            ? `→ Nur Taggeld: € ${Number(e.taggeld).toLocaleString('de-AT', { minimumFractionDigits: 2 })} (KM-Geld ist bereits im KM-Buch)`
                            : `→ Gesamt: € ${Number(e.gesamt).toLocaleString('de-AT', { minimumFractionDigits: 2 })}`
                        }`,
                        onJa: () => guvUebertragen(e),
                      })}
                      style={{ background: '#fdf8f0', border: `1px solid ${GOLD}66`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#7a5c1e', whiteSpace: 'nowrap' }}
                      title="In G&V übertragen"
                    >→ G&V</button>
                  )}
                  <button onClick={() => oeffneForm(e)} style={{ background: '#f4f1eb', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                  <button onClick={() => setConfirmModal({ text: `Eintrag für „${e.zielort}" löschen?`, onJa: () => loeschen(e.id) })} style={{ background: '#fff0f0', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FORM MODAL ──────────────────────────────────────────────────────── */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a2a3a', marginBottom: 20 }}>
              {editEintrag ? '✏️ Dienstreise bearbeiten' : '✈️ Neue Dienstreise'}
            </div>

            {/* Datum */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>📅 Datum *</label>
              <input type="date" value={form.datum} style={inp}
                onChange={e => {
                  setForm(f => ({ ...f, datum: e.target.value }))
                  setKmHinGewählt(null)
                  setKmRueckGewählt(null)
                  ladeKmTage(e.target.value)
                }} />
            </div>

            {/* KM-Buch Verknüpfung – Hinfahrt & Rückfahrt */}
            {kmTage.length > 0 && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f7f8ff', borderRadius: 14, border: `1px solid ${BLAU}22` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BLAU, marginBottom: 14 }}>
                  🔗 KM-Buch Fahrten von diesem Tag verknüpfen
                </div>

                {/* Hinfahrt */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: GRUEN, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRUEN }} />
                    Hinfahrt (zum Einsatzort)
                    {kmHinGewählt && <span style={{ background: GRUEN, color: 'white', borderRadius: 6, padding: '1px 7px', fontSize: 10 }}>✓ gewählt</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {kmTage.map(k => (
                      <KmChip key={k.id} k={k}
                        gewählt={kmHinGewählt?.id === k.id}
                        farbe={GRUEN}
                        onWähle={() => wähleHinfahrt(k)}
                        onLöse={() => { setKmHinGewählt(null); setForm(f => ({ ...f, km_einfach: '' })) }}
                      />
                    ))}
                  </div>
                </div>

                {/* Rückfahrt */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: BLAU, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: BLAU }} />
                    Rückfahrt (vom Einsatzort)
                    {kmRueckGewählt && <span style={{ background: BLAU, color: 'white', borderRadius: 6, padding: '1px 7px', fontSize: 10 }}>✓ gewählt</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {kmTage.map(k => (
                      <KmChip key={k.id} k={k}
                        gewählt={kmRueckGewählt?.id === k.id}
                        farbe={BLAU}
                        onWähle={() => wähleRueckfahrt(k)}
                        onLöse={() => setKmRueckGewählt(null)}
                      />
                    ))}
                  </div>
                </div>

                {/* Info */}
                {(kmHinGewählt || kmRueckGewählt) && (
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'white', borderRadius: 9, fontSize: 11, color: '#555', border: `1px solid #e5e0d8` }}>
                    {kmHinGewählt && <div>✅ Hinfahrt: <strong>{kmHinGewählt.ziel_adresse.split(',')[0]}</strong> – {Number(kmHinGewählt.km_gefahren).toFixed(1)} km</div>}
                    {kmRueckGewählt && <div style={{ marginTop: kmHinGewählt ? 4 : 0 }}>✅ Rückfahrt: <strong>{kmRueckGewählt.ziel_adresse.split(',')[0]}</strong> – {Number(kmRueckGewählt.km_gefahren).toFixed(1)} km</div>}
                    {kmHinGewählt && kmRueckGewählt && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0ece4', color: GOLD, fontWeight: 700 }}>
                        km einfach = Hinfahrt: {Number(kmHinGewählt.km_gefahren).toFixed(1)} km (automatisch übernommen)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Zielort */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>📍 Zielort *</label>
              <input placeholder="z.B. Wien, Hauptstraße 1" value={form.zielort} style={inp}
                onChange={e => setForm(f => ({ ...f, zielort: e.target.value }))} />
            </div>

            {/* Zweck */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>💼 Zweck *</label>
              <input placeholder="z.B. Kundengespräch, Montagearbeiten" value={form.zweck} style={inp}
                onChange={e => setForm(f => ({ ...f, zweck: e.target.value }))} />
            </div>

            {/* Uhrzeiten */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>🕐 Abfahrt</label>
                <input type="time" value={form.uhrzeit_start} style={inp} onChange={e => setForm(f => ({ ...f, uhrzeit_start: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>🕐 Ankunft</label>
                <input type="time" value={form.uhrzeit_ende} style={inp} onChange={e => setForm(f => ({ ...f, uhrzeit_ende: e.target.value }))} />
              </div>
            </div>
            {form.uhrzeit_start && form.uhrzeit_ende && vorschau.stunden > 0 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: -10, marginBottom: 12, paddingLeft: 4 }}>
                ⏱ Dauer: {vorschau.stunden.toFixed(1)} Stunden
              </div>
            )}

            {/* km einfach */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>📏 km einfach (nur Strecke zum Ziel, nicht Hin+Zurück) *</label>
              <input type="number" placeholder="z.B. 45" value={form.km_einfach} style={inp}
                onChange={e => setForm(f => ({ ...f, km_einfach: e.target.value }))} />
              {Number(form.km_einfach) > 0 && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, paddingLeft: 4 }}>
                  Gesamtstrecke (hin+zurück): {(Number(form.km_einfach) * 2).toFixed(1)} km
                  {Number(form.km_einfach) < 25 && <span style={{ color: ROT, marginLeft: 8 }}>⚠ unter 25 km → kein Taggeld</span>}
                </div>
              )}
            </div>

            {/* Essen bekommen */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fafaf8', borderRadius: 10 }}>
              <input type="checkbox" id="essen" checked={form.essen_bekommen}
                onChange={e => setForm(f => ({ ...f, essen_bekommen: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: GRUEN }} />
              <label htmlFor="essen" style={{ fontSize: 13, fontWeight: 600, color: '#1a2a3a', cursor: 'pointer' }}>
                🍽 Mittagessen vom Kunden bezahlt <span style={{ color: '#aaa', fontWeight: 400 }}>(−€ 15,00 vom Taggeld)</span>
              </label>
            </div>

            {/* Live-Vorschau */}
            {Number(form.km_einfach) > 0 && (
              <div style={{ marginBottom: 20, padding: '16px', background: '#fdf8f0', borderRadius: 14, border: `1px solid ${GOLD}44` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                  💡 Vorschau § 26 EStG Österreich 2026
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: BLAU, fontWeight: 700, marginBottom: 4 }}>🚗 KM-Geld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: BLAU }}>€ {fmt(vorschau.km_geld)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>{Number(form.km_einfach) * 2} km × € 0,50</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: GRUEN, fontWeight: 700, marginBottom: 4 }}>🍽 Taggeld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: GRUEN }}>€ {fmt(vorschau.taggeld)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>
                      {Number(form.km_einfach) < 25 ? 'unter 25 km' : vorschau.stunden <= 3 ? 'unter 3 Std.' : `${Math.ceil(vorschau.stunden)} Std. × € 2,50`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#7a5c1e', fontWeight: 700, marginBottom: 4 }}>✅ Gesamt</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#7a5c1e' }}>€ {fmt(vorschau.gesamt)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>absetzbar</div>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setFormOffen(false); setEditEintrag(null) }} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Abbrechen</button>
              <button onClick={speichern} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, color: '#0a0a0a', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(200,169,110,0.35)' }}>
                {editEintrag ? '✓ Speichern' : '✓ Eintragen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ─────────────────────────────────────────────────────── */}
      {detailEintrag && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, maxWidth: 520, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#0a0a0a' }}>✈️ {detailEintrag.zielort}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>{detailEintrag.zweck}</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>
              {[
                { icon: '📅', bg: '#fff3e0', label: 'Datum', value: detailEintrag.datum ? new Date(detailEintrag.datum).toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { icon: '🕐', bg: '#f0f0fe', label: 'Reisezeit', value: detailEintrag.uhrzeit_start && detailEintrag.uhrzeit_ende ? `${detailEintrag.uhrzeit_start} – ${detailEintrag.uhrzeit_ende} (${Number(detailEintrag.stunden_dauer || 0).toFixed(1)} Std.)` : '—' },
                { icon: '📏', bg: '#f0fdf4', label: 'Strecke', value: `${Number(detailEintrag.km_einfach).toFixed(1)} km einfach · ${(Number(detailEintrag.km_einfach) * 2).toFixed(1)} km gesamt` },
                { icon: '🍽', bg: '#fff0f0', label: 'Mahlzeit gestellt', value: detailEintrag.essen_bekommen ? 'Ja – Taggeld um € 15,00 reduziert' : 'Nein' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8 }}>{r.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2a3a', marginTop: 2 }}>{r.value}</div>
                  </div>
                </div>
              ))}

              {/* KM-Buch Verknüpfungen */}
              {(detailEintrag.km_fahrt_hin_id || detailEintrag.km_fahrt_rueck_id) && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔗</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>KM-Buch Verknüpfung</div>
                    {detailEintrag.km_fahrt_hin_id && (
                      <div style={{ fontSize: 13, color: GRUEN, fontWeight: 600, marginBottom: 3 }}>
                        ↗ Hinfahrt: {detailEintrag.km_hin_ziel?.split(',').slice(0,2).join(',') || '—'} · {Number(detailEintrag.km_hin_km || 0).toFixed(1)} km
                      </div>
                    )}
                    {detailEintrag.km_fahrt_rueck_id && (
                      <div style={{ fontSize: 13, color: BLAU, fontWeight: 600 }}>
                        ↙ Rückfahrt: {detailEintrag.km_rueck_ziel?.split(',').slice(0,2).join(',') || '—'} · {Number(detailEintrag.km_rueck_km || 0).toFixed(1)} km
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Abrechnungs-Box */}
              <div style={{ background: '#fdf8f0', borderRadius: 14, padding: '14px 16px', border: `1px solid ${GOLD}44` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Abrechnung § 26 EStG 2026</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: BLAU, fontWeight: 700, marginBottom: 4 }}>KM-Geld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: BLAU }}>€ {fmt(Number(detailEintrag.km_geld))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: GRUEN, fontWeight: 700, marginBottom: 4 }}>Taggeld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: GRUEN }}>€ {fmt(Number(detailEintrag.taggeld))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7a5c1e', fontWeight: 700, marginBottom: 4 }}>Gesamt</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#7a5c1e' }}>€ {fmt(Number(detailEintrag.gesamt))}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* G&V Status Banner */}
            {detailEintrag.in_guv ? (
              <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#d1fae5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>In G&V eingetragen</div>
                  <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                    {(detailEintrag.km_fahrt_hin_id || detailEintrag.km_fahrt_rueck_id)
                      ? `Taggeld € ${fmt(Number(detailEintrag.taggeld))} übertragen (KM-Geld via KM-Buch)`
                      : `Gesamt € ${fmt(Number(detailEintrag.gesamt))} übertragen`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#fef3c7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⏳</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Noch nicht in G&V</div>
                </div>
                <button
                  onClick={() => setConfirmModal({
                    text: `Reisekosten „${detailEintrag.zielort}" in G&V übertragen?\n${
                      (detailEintrag.km_fahrt_hin_id || detailEintrag.km_fahrt_rueck_id)
                        ? `→ Nur Taggeld: € ${fmt(Number(detailEintrag.taggeld))} (KM-Geld ist bereits im KM-Buch)`
                        : `→ Gesamt: € ${fmt(Number(detailEintrag.gesamt))}`
                    }`,
                    onJa: () => { guvUebertragen(detailEintrag); setDetailEintrag(null) },
                  })}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: GOLD, color: '#0a0a0a', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                >→ Jetzt übertragen</button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid #f0ece4' }}>
              <button onClick={() => setDetailEintrag(null)} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ Schließen</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { oeffneForm(detailEintrag); setDetailEintrag(null) }} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#f4f1eb', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✏️ Bearbeiten</button>
                <button onClick={() => { setConfirmModal({ text: `Eintrag für „${detailEintrag.zielort}" löschen?`, onJa: () => { loeschen(detailEintrag.id); setDetailEintrag(null) } }) }} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#fff0f0', cursor: 'pointer', fontSize: 15 }}>🗑</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ────────────────────────────────────────────────────── */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{confirmModal.text.includes('G&V') ? '📊' : '🗑'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a3a', marginBottom: 8, whiteSpace: 'pre-line' }}>{confirmModal.text}</div>
            {!confirmModal.text.includes('G&V') && (
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 24 }}>Diese Aktion kann nicht rückgängig gemacht werden.</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e0d8', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
              <button onClick={() => { confirmModal.onJa(); setConfirmModal(null) }}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                  background: confirmModal.text.includes('G&V') ? `linear-gradient(135deg, ${GOLD}, #e8c98e)` : ROT,
                  color: confirmModal.text.includes('G&V') ? '#0a0a0a' : 'white',
                }}>
                {confirmModal.text.includes('G&V') ? '✓ Ja, übertragen' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
