import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const GOLD  = '#c8a96e'
const BLAU  = '#6366f1'
const GRUEN = '#10b981'
const ROT   = '#ef4444'

interface Fahrt {
  id: number
  datum: string
  start_adresse: string
  ziel_adresse: string
  km_start?: number
  km_ende?: number
  km_gefahren: number
  zweck: string
  notiz?: string
  beleg_id?: number
  rechnung_id?: number
  rechnung_nummer?: string
  rechnung_projekt?: string
  rechnung_typ?: string
  rechnung_kunde?: string
  start_lat?: number
  start_lon?: number
  ziel_lat?: number
  ziel_lon?: number
  in_guv: boolean
  guv_id?: number
  createdAt: string
}

interface OrtVorschlag {
  display_name: string
  lat: string
  lon: string
}

interface RechnungAuswahl {
  id: number
  nummer: string
  projektName?: string
  typ: string
  firma?: string
  vorname?: string
  nachname?: string
}

const fmt   = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtKm = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const emptyForm = () => ({
  datum: new Date().toISOString().split('T')[0],
  start_adresse: '', ziel_adresse: '',
  km_start: '', km_ende: '', km_gefahren: '',
  zweck: '', notiz: '',
})

export default function KMBuch() {
  const [fahrten, setFahrten]       = useState<Fahrt[]>([])
  const [laden, setLaden]           = useState(false)
  const [formOffen, setFormOffen]   = useState(false)
  const [editFahrt, setEditFahrt]   = useState<Fahrt | null>(null)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const [kmSatz, setKmSatz]         = useState(0.42)
  const [toast, setToast]           = useState<{ text: string; ok: boolean } | null>(null)
  const [filterJahr, setFilterJahr] = useState(new Date().getFullYear())
  const [filterMonat, setFilterMonat] = useState('Alle')
  const [routeLaden, setRouteLaden] = useState(false)

  // Form
  const [form, setForm]             = useState(emptyForm())
  const [startKoord, setStartKoord] = useState<{ lat: string; lon: string } | null>(null)
  const [zielKoord, setZielKoord]   = useState<{ lat: string; lon: string } | null>(null)
  const [startVorschlaege, setStartVorschlaege] = useState<OrtVorschlag[]>([])
  const [zielVorschlaege, setZielVorschlaege]   = useState<OrtVorschlag[]>([])
  const [startFokus, setStartFokus] = useState(false)
  const [zielFokus, setZielFokus]   = useState(false)

  // Rechnung/Angebot Zuordnung
  const [rechnungenListe, setRechnungenListe]         = useState<RechnungAuswahl[]>([])
  const [rechnungGewählt, setRechnungGewählt]         = useState<RechnungAuswahl | null>(null)
  const [rechnungSuche, setRechnungSuche]             = useState('')
  const [rechnungDropdownOffen, setRechnungDropdownOffen] = useState(false)

  const startTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const zielTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { ladeFahrten() }, [filterJahr]) // eslint-disable-line

  useEffect(() => {
    api.get('/einstellungen').then(r => {
      setKmSatz(parseFloat(r.data.km_satz) || 0.42)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (formOffen) {
      api.get('/km-buch/rechnungen-auswahl').then(r => setRechnungenListe(r.data)).catch(() => {})
    }
  }, [formOffen]) // eslint-disable-line

  const ladeFahrten = async () => {
    setLaden(true)
    try {
      const res = await api.get(`/km-buch?jahr=${filterJahr}`)
      setFahrten(res.data)
    } catch {}
    setLaden(false)
  }

  const zeigeToast = (text: string, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Adress-Autocomplete via Backend-Proxy (Nominatim) ─────────────────────
  const sucheAdresse = async (query: string, setVorschlaege: (v: OrtVorschlag[]) => void) => {
    if (query.length < 3) { setVorschlaege([]); return }
    try {
      const r = await api.get(`/km-buch/geocode?q=${encodeURIComponent(query)}`)
      setVorschlaege(r.data)
    } catch {}
  }

  const onStartChange = (v: string) => {
    setForm(f => ({ ...f, start_adresse: v }))
    setStartKoord(null)
    clearTimeout(startTimer.current)
    startTimer.current = setTimeout(() => sucheAdresse(v, setStartVorschlaege), 400)
  }

  const onZielChange = (v: string) => {
    setForm(f => ({ ...f, ziel_adresse: v }))
    setZielKoord(null)
    clearTimeout(zielTimer.current)
    zielTimer.current = setTimeout(() => sucheAdresse(v, setZielVorschlaege), 400)
  }

  const waehleStart = (v: OrtVorschlag) => {
    setForm(f => ({ ...f, start_adresse: v.display_name }))
    setStartKoord({ lat: v.lat, lon: v.lon })
    setStartVorschlaege([])
  }

  const waehleZiel = (v: OrtVorschlag) => {
    setForm(f => ({ ...f, ziel_adresse: v.display_name }))
    setZielKoord({ lat: v.lat, lon: v.lon })
    setZielVorschlaege([])
  }

  // ── Route via Backend-Proxy (OSRM) berechnen ──────────────────────────────
  const berechneRoute = async () => {
    if (!startKoord || !zielKoord) {
      zeigeToast('Bitte erst Adresse aus der Vorschlagsliste auswählen', false); return
    }
    setRouteLaden(true)
    try {
      const r = await api.get(
        `/km-buch/route?startLon=${startKoord.lon}&startLat=${startKoord.lat}&zielLon=${zielKoord.lon}&zielLat=${zielKoord.lat}`
      )
      const data = r.data
      if (data.routes?.[0]) {
        const km = Math.round(data.routes[0].distance / 100) / 10
        setForm(f => ({ ...f, km_gefahren: km.toString() }))
        zeigeToast(`✅ Route berechnet: ${km.toFixed(1)} km`)
      } else {
        zeigeToast('Route konnte nicht berechnet werden', false)
      }
    } catch { zeigeToast('Fehler bei Routenberechnung', false) }
    setRouteLaden(false)
  }

  // km_gefahren aus KM-Stand Anfang + Ende berechnen
  useEffect(() => {
    const s = parseFloat(form.km_start), e = parseFloat(form.km_ende)
    if (!isNaN(s) && !isNaN(e) && e > s)
      setForm(f => ({ ...f, km_gefahren: (e - s).toFixed(1) }))
  }, [form.km_start, form.km_ende]) // eslint-disable-line

  // km_ende aus KM-Stand Anfang + km_gefahren berechnen
  useEffect(() => {
    const s = parseFloat(form.km_start), g = parseFloat(form.km_gefahren)
    if (!isNaN(s) && !isNaN(g) && g > 0)
      setForm(f => {
        const neuesEnde = (s + g).toFixed(1)
        if (f.km_ende === neuesEnde) return f // Loop verhindern
        return { ...f, km_ende: neuesEnde }
      })
  }, [form.km_start, form.km_gefahren]) // eslint-disable-line

  // ── Form öffnen ────────────────────────────────────────────────────────────
  const oeffneForm = (f?: Fahrt) => {
    setStartVorschlaege([]); setZielVorschlaege([])
    setRechnungSuche(''); setRechnungDropdownOffen(false)
    if (f) {
      setEditFahrt(f)
      setForm({
        datum: f.datum?.split('T')[0] || '',
        start_adresse: f.start_adresse || '',
        ziel_adresse: f.ziel_adresse || '',
        km_start: f.km_start?.toString() || '',
        km_ende:  f.km_ende?.toString()  || '',
        km_gefahren: f.km_gefahren?.toString() || '',
        zweck: f.zweck || '', notiz: f.notiz || '',
      })
      setStartKoord(f.start_lat ? { lat: String(f.start_lat), lon: String(f.start_lon) } : null)
      setZielKoord (f.ziel_lat  ? { lat: String(f.ziel_lat),  lon: String(f.ziel_lon)  } : null)
      setRechnungGewählt(f.rechnung_id && f.rechnung_nummer ? {
        id: f.rechnung_id, nummer: f.rechnung_nummer,
        projektName: f.rechnung_projekt, typ: f.rechnung_typ || 'rechnung',
      } : null)
    } else {
      setEditFahrt(null)
      setForm(emptyForm())
      setStartKoord(null); setZielKoord(null)
      setRechnungGewählt(null)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.datum || !form.zweck || !form.km_gefahren) {
      zeigeToast('Datum, Zweck und km sind Pflichtfelder', false); return
    }
    try {
      const payload = {
        datum: form.datum,
        start_adresse: form.start_adresse,
        ziel_adresse: form.ziel_adresse,
        km_start: form.km_start || null,
        km_ende:  form.km_ende  || null,
        km_gefahren: parseFloat(form.km_gefahren),
        zweck: form.zweck, notiz: form.notiz,
        rechnung_id: rechnungGewählt?.id || null,
        start_lat: startKoord?.lat || null, start_lon: startKoord?.lon || null,
        ziel_lat:  zielKoord?.lat  || null, ziel_lon:  zielKoord?.lon  || null,
      }
      if (editFahrt) {
        await api.put(`/km-buch/${editFahrt.id}`, payload)
      } else {
        await api.post('/km-buch', payload)
      }
      await ladeFahrten()
      setFormOffen(false)
      zeigeToast(editFahrt ? '✅ Fahrt gespeichert' : '✅ Fahrt eingetragen!')
    } catch (e: any) {
      zeigeToast(e?.response?.data?.fehler || 'Fehler beim Speichern', false)
    }
  }

  const loeschen = async (id: number) => {
    if (!window.confirm('Fahrt wirklich löschen?')) return
    await api.delete(`/km-buch/${id}`)
    setFahrten(prev => prev.filter(f => f.id !== id))
    zeigeToast('Fahrt gelöscht')
  }

  const zuGuv = async (f: Fahrt) => {
    if (f.in_guv) return
    try {
      const res = await api.post(`/km-buch/zu-guv/${f.id}`, {})
      setFahrten(prev => prev.map(x => x.id === f.id ? { ...x, in_guv: true } : x))
      zeigeToast(`✅ € ${fmt(res.data.betrag)} KM-Geld zur G&V übertragen`)
    } catch (e: any) {
      zeigeToast(e?.response?.data?.fehler || 'Fehler', false)
    }
  }

  const oeffneMaps = (f: Fahrt) => {
    const start = f.start_adresse || (f.start_lat ? `${f.start_lat},${f.start_lon}` : null)
    const ziel  = f.ziel_adresse  || (f.ziel_lat  ? `${f.ziel_lat},${f.ziel_lon}`   : null)
    if (start && ziel)
      window.open(`https://www.google.com/maps/dir/${encodeURIComponent(start)}/${encodeURIComponent(ziel)}`, '_blank')
  }

  // ── Filter & Berechnung ────────────────────────────────────────────────────
  const gefiltert = filterMonat === 'Alle'
    ? fahrten
    : fahrten.filter(f => f.datum?.startsWith(filterMonat))

  const gefilterteRechnungen = rechnungenListe.filter(r => {
    if (!rechnungSuche) return true
    const s = rechnungSuche.toLowerCase()
    const kunde = r.firma || [r.vorname, r.nachname].filter(Boolean).join(' ')
    return r.nummer.toLowerCase().includes(s)
      || (r.projektName || '').toLowerCase().includes(s)
      || (kunde || '').toLowerCase().includes(s)
  }).slice(0, 8)

  const monate = Array.from(new Set(
    fahrten.map(f => f.datum?.substring(0, 7)).filter(Boolean)
  )).sort().reverse() as string[]

  const totalKm     = gefiltert.reduce((s, f) => s + Number(f.km_gefahren), 0)
  const totalBetrag = totalKm * kmSatz

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Datum','Von','Nach','KM-Stand Anfang','KM-Stand Ende','km gefahren','Zweck','Notiz','Rechnung / Angebot','Google Maps Route','km-Satz €','Betrag €']
    const rows = gefiltert.map(f => [
      f.datum ? new Date(f.datum).toLocaleDateString('de-AT') : '',
      f.start_adresse, f.ziel_adresse,
      f.km_start || '', f.km_ende || '',
      Number(f.km_gefahren).toFixed(1),
      f.zweck, f.notiz || '',
      f.rechnung_nummer ? `${f.rechnung_nummer}${f.rechnung_projekt ? ' – ' + f.rechnung_projekt : ''}` : '',
      f.start_adresse && f.ziel_adresse ? `https://www.google.com/maps/dir/${encodeURIComponent(f.start_adresse)}/${encodeURIComponent(f.ziel_adresse)}` : '',
      kmSatz.toFixed(4),
      (Number(f.km_gefahren) * kmSatz).toFixed(2),
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `KM-Buch-${filterJahr}.csv`
    a.click()
  }

  // ── PDF Drucken ────────────────────────────────────────────────────────────
  const drucken = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>KM-Buch ${filterJahr}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; color: #1a2a3a; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #888; font-size: 11px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a2a3a; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 7px 8px; border-bottom: 1px solid #f0ece4; vertical-align: top; }
        tr:nth-child(even) td { background: #fafaf8; }
        .r { text-align: right; }
        .total td { font-weight: bold; background: #f0ece4 !important; border-top: 2px solid #1a2a3a; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .guv { background: #d1fae5; color: #065f46; }
        .offen { background: #fef3c7; color: #92400e; }
        .ref { display: inline-block; margin-top: 3px; font-size: 9px; color: #6366f1; font-weight: 600; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>🚗 KM-Buch / Fahrtenbuch ${filterJahr}${filterMonat !== 'Alle' ? ' · ' + filterMonat : ''}</h1>
      <div class="meta">km-Satz: € ${kmSatz.toFixed(4)}/km &nbsp;·&nbsp; Gesamt: ${fmtKm(totalKm)} km &nbsp;·&nbsp; KM-Geld: € ${fmt(totalBetrag)} &nbsp;·&nbsp; ${gefiltert.length} Fahrten</div>
      <table>
        <tr>
          <th>Datum</th><th>Von</th><th>Nach</th>
          <th class="r">KM-Stand Anf.</th><th class="r">KM-Stand Ende</th>
          <th class="r">km</th><th>Zweck / Notiz</th><th class="r">Betrag</th><th>G&V</th>
        </tr>
        ${gefiltert.map(f => `
          <tr>
            <td>${f.datum ? new Date(f.datum).toLocaleDateString('de-AT') : '—'}</td>
            <td>${(f.start_adresse || '—').split(',').slice(0,2).join(',')}</td>
            <td>${(f.ziel_adresse  || '—').split(',').slice(0,2).join(',')}</td>
            <td class="r">${f.km_start ? Number(f.km_start).toLocaleString('de-AT') : '—'}</td>
            <td class="r">${f.km_ende  ? Number(f.km_ende).toLocaleString('de-AT')  : '—'}</td>
            <td class="r"><strong>${Number(f.km_gefahren).toFixed(1)}</strong></td>
            <td>${f.zweck}${f.notiz ? '<br><span style="color:#999;font-size:9px">' + f.notiz + '</span>' : ''}${f.rechnung_nummer ? '<br><span class="ref">' + (f.rechnung_typ === 'angebot' ? '📝 ' : '🧾 ') + f.rechnung_nummer + (f.rechnung_projekt ? ' – ' + f.rechnung_projekt : '') + '</span>' : ''}${f.start_adresse && f.ziel_adresse ? '<br><a href="https://www.google.com/maps/dir/' + encodeURIComponent(f.start_adresse) + '/' + encodeURIComponent(f.ziel_adresse) + '" style="color:#4285f4;font-size:9px;text-decoration:none">🗺️ Google Maps Route</a>' : ''}</td>
            <td class="r">€ ${fmt(Number(f.km_gefahren) * kmSatz)}</td>
            <td><span class="badge ${f.in_guv ? 'guv' : 'offen'}">${f.in_guv ? '✓ G&V' : 'offen'}</span></td>
          </tr>`).join('')}
        <tr class="total">
          <td colspan="5">Gesamt</td>
          <td class="r">${fmtKm(totalKm)}</td>
          <td></td>
          <td class="r">€ ${fmt(totalBetrag)}</td>
          <td></td>
        </tr>
      </table>
      <div style="margin-top:24px;font-size:9px;color:#aaa">
        Erstellt mit BelegFix · km-Satz § 26 EStG Österreich
      </div>
      </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
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
  const jahre = [new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2]

  // ── Render ─────────────────────────────────────────────────────────────────
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
          🚗 KM-Buch
        </h2>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Fahrtenbuch · km-Satz € {kmSatz.toFixed(4)}/km · Österreich § 26 EStG
        </div>
        {/* Jahr-Tabs */}
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
          { label: 'Gesamt km',  value: `${fmtKm(totalKm)} km`, sub: 'gefahren',               color: GOLD  },
          { label: 'KM-Geld',    value: `€ ${fmt(totalBetrag)}`, sub: `${fmtKm(totalKm)} × ${kmSatz.toFixed(2)}`, color: BLAU  },
          { label: 'Fahrten',    value: gefiltert.length,       sub: 'Einträge',               color: GRUEN },
          { label: 'G&V offen',  value: gefiltert.filter(f => !f.in_guv).length, sub: 'noch nicht übertragen', color: ROT },
        ].map(s => (
          <div key={s.label} style={{ ...card, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#1a2a3a' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => oeffneForm()} style={{
          background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, color: '#0a0a0a',
          border: 'none', borderRadius: 10, padding: '9px 18px',
          fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(200,169,110,0.35)',
        }}>+ Neue Fahrt</button>
        <button onClick={drucken} style={{ background: '#f4f1eb', color: '#555', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🖨 PDF drucken
        </button>
        <button onClick={exportCSV} style={{ background: '#f4f1eb', color: '#555', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          📊 Excel/CSV
        </button>
      </div>

      {/* Monat-Filter */}
      {monate.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterMonat('Alle')} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            background: filterMonat === 'Alle' ? '#1a2a3a' : '#f4f1eb',
            color: filterMonat === 'Alle' ? 'white' : '#888',
          }}>Alle ({fahrten.length})</button>
          {monate.map(m => {
            const count = fahrten.filter(f => f.datum?.startsWith(m)).length
            return (
              <button key={m} onClick={() => setFilterMonat(m)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: filterMonat === m ? '#1a2a3a' : '#f4f1eb',
                color: filterMonat === m ? 'white' : '#888',
              }}>
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
          <div style={{ fontSize: 15, color: '#aaa', marginBottom: 8 }}>Noch keine Fahrten für {filterJahr}</div>
          <div style={{ fontSize: 12, color: '#ccc' }}>Klicke „+ Neue Fahrt" für den ersten Eintrag</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Desktop-Header */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr 1fr 70px 100px 110px 90px', padding: '8px 16px', background: '#f8f6f2', borderRadius: 10, gap: 8 }}>
              {['Datum','Von','Nach','km','KM-Stand','Zweck / Betrag',''].map((h,i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</div>
              ))}
            </div>
          )}

          {gefiltert.map(f => (
            <div key={f.id} style={{
              background: 'white', borderRadius: 12,
              border: '1px solid #f0ece4',
              borderLeft: `4px solid ${f.in_guv ? GRUEN : GOLD}`,
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              {isMobile ? (
                /* Mobile */
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>
                        📅 {f.datum ? new Date(f.datum).toLocaleDateString('de-AT') : '—'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.zweck || '—'}
                      </div>
                      {f.rechnung_nummer && (
                        <div style={{ fontSize: 11, color: BLAU, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{f.rechnung_typ === 'angebot' ? '📝' : '🧾'}</span>
                          <span style={{ fontWeight: 600 }}>{f.rechnung_nummer}</span>
                          {f.rechnung_projekt && <span style={{ color: '#aaa' }}>– {f.rechnung_projekt}</span>}
                        </div>
                      )}
                      {(f.start_adresse || f.ziel_adresse) && (
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {(f.start_adresse||'?').split(',')[0]} → {(f.ziel_adresse||'?').split(',')[0]}
                        </div>
                      )}
                      {(f.km_start || f.km_ende) && (
                        <div style={{ fontSize: 11, color: '#bbb' }}>
                          Tacho: {f.km_start||'?'} → {f.km_ende||'?'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: BLAU }}>
                        {Number(f.km_gefahren).toFixed(1)} km
                      </div>
                      <div style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>
                        € {fmt(Number(f.km_gefahren) * kmSatz)}
                      </div>
                      {f.in_guv && (
                        <div style={{ fontSize: 10, color: GRUEN, fontWeight: 700, marginTop: 2 }}>✓ in G&V</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                        {(f.start_adresse || f.start_lat) && (
                          <button onClick={() => oeffneMaps(f)} title="Route auf Google Maps" style={{ background: '#e8f0fe', color: BLAU, border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🗺️</button>
                        )}
                        <button onClick={() => zuGuv(f)} disabled={f.in_guv} title={f.in_guv ? 'Bereits in G&V' : 'Zur G&V übertragen'} style={{ background: f.in_guv ? '#d1fae5' : '#fdf8f0', color: f.in_guv ? GRUEN : GOLD, border: 'none', borderRadius: 6, width: 30, height: 30, cursor: f.in_guv ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                          {f.in_guv ? '✓' : '↓'}
                        </button>
                        <button onClick={() => oeffneForm(f)} style={{ background: '#f4f1eb', color: '#555', border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✏️</button>
                        <button onClick={() => loeschen(f.id)} style={{ background: '#fef2f2', color: ROT, border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop */
                <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr 1fr 70px 100px 110px 90px', padding: '12px 16px', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {f.datum ? new Date(f.datum).toLocaleDateString('de-AT') : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.start_adresse}>
                    {f.start_adresse ? f.start_adresse.split(',')[0] : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.ziel_adresse}>
                    {f.ziel_adresse ? f.ziel_adresse.split(',')[0] : '—'}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: BLAU }}>{Number(f.km_gefahren).toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>km</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>
                    {f.km_start ? `${f.km_start} → ${f.km_ende||'?'}` : '—'}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.zweck}</div>
                    <div style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>€ {fmt(Number(f.km_gefahren) * kmSatz)}</div>
                    {f.rechnung_nummer && (
                      <div style={{ fontSize: 10, color: BLAU, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {f.rechnung_typ === 'angebot' ? '📝' : '🧾'} {f.rechnung_nummer}{f.rechnung_projekt ? ` – ${f.rechnung_projekt}` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    {(f.start_adresse || f.start_lat) && (
                      <button onClick={() => oeffneMaps(f)} title="Route auf Google Maps öffnen"
                        style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'color 0.15s' }}
                        onMouseEnter={ev => ev.currentTarget.style.color = BLAU}
                        onMouseLeave={ev => ev.currentTarget.style.color = '#bbb'}
                      >🗺️</button>
                    )}
                    <button onClick={() => zuGuv(f)} disabled={f.in_guv} title={f.in_guv ? 'Bereits in G&V' : 'Zur G&V übertragen'}
                      style={{ background: 'none', border: 'none', color: f.in_guv ? GRUEN : '#bbb', cursor: f.in_guv ? 'default' : 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'color 0.15s' }}
                      onMouseEnter={ev => { if (!f.in_guv) ev.currentTarget.style.color = GOLD }}
                      onMouseLeave={ev => { if (!f.in_guv) ev.currentTarget.style.color = '#bbb' }}
                    >{f.in_guv ? '✓' : '↓'}</button>
                    <button onClick={() => oeffneForm(f)} title="Bearbeiten"
                      style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'color 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#555'}
                      onMouseLeave={ev => ev.currentTarget.style.color = '#bbb'}
                    >✏️</button>
                    <button onClick={() => loeschen(f.id)} title="Löschen"
                      style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'color 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = ROT}
                      onMouseLeave={ev => ev.currentTarget.style.color = '#ddd'}
                    >✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Gesamt-Zeile */}
          <div style={{ ...card, background: '#1a2a3a', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: isMobile ? 8 : 28, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Gesamt</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#93c5fd' }}>{fmtKm(totalKm)} km</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>×</div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>€ {kmSatz.toFixed(4)}/km</span>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>=</div>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: GOLD }}>€ {fmt(totalBetrag)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Modal ───────────────────────────────────────────────────────── */}
      {formOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setFormOffen(false)}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}
            onClick={ev => ev.stopPropagation()}>

            {/* Modal-Header */}
            <div style={{ padding: '16px 22px', background: '#1a2a3a', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'white' }}>
                🚗 {editFahrt ? 'Fahrt bearbeiten' : 'Neue Fahrt eintragen'}
              </div>
              <button onClick={() => setFormOffen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Form-Body */}
            <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Datum */}
              <div>
                <label style={lbl}>📅 Datum der Fahrt *</label>
                <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={inp} />
              </div>

              {/* Startadresse */}
              <div style={{ position: 'relative' }}>
                <label style={lbl}>📍 Startadresse</label>
                <input
                  value={form.start_adresse}
                  onChange={e => onStartChange(e.target.value)}
                  onFocus={() => setStartFokus(true)}
                  onBlur={() => setTimeout(() => setStartFokus(false), 200)}
                  placeholder="z.B. Mariahilfer Straße 1, Wien"
                  style={{ ...inp, borderColor: startKoord ? GRUEN : '#e5e0d8' }}
                />
                {startKoord && <div style={{ fontSize: 10, color: GRUEN, marginTop: 3 }}>✓ Koordinaten gespeichert – Route kann berechnet werden</div>}
                {startVorschlaege.length > 0 && startFokus && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200, background: 'white', borderRadius: 10, border: '1px solid #e5e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    {startVorschlaege.map((v, i) => (
                      <div key={i} onMouseDown={() => waehleStart(v)}
                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 12, color: '#1a2a3a', borderBottom: '1px solid #f4f1eb' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = '#fdf8f0'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                        📍 {v.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zieladresse */}
              <div style={{ position: 'relative' }}>
                <label style={lbl}>🏁 Zieladresse / Reiseziel</label>
                <input
                  value={form.ziel_adresse}
                  onChange={e => onZielChange(e.target.value)}
                  onFocus={() => setZielFokus(true)}
                  onBlur={() => setTimeout(() => setZielFokus(false), 200)}
                  placeholder="z.B. Hauptplatz 5, Graz"
                  style={{ ...inp, borderColor: zielKoord ? GRUEN : '#e5e0d8' }}
                />
                {zielKoord && <div style={{ fontSize: 10, color: GRUEN, marginTop: 3 }}>✓ Koordinaten gespeichert</div>}
                {zielVorschlaege.length > 0 && zielFokus && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200, background: 'white', borderRadius: 10, border: '1px solid #e5e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    {zielVorschlaege.map((v, i) => (
                      <div key={i} onMouseDown={() => waehleZiel(v)}
                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 12, color: '#1a2a3a', borderBottom: '1px solid #f4f1eb' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = '#fdf8f0'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                        🏁 {v.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Route-Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={berechneRoute} disabled={!startKoord || !zielKoord || routeLaden}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                    cursor: startKoord && zielKoord ? 'pointer' : 'default',
                    background: startKoord && zielKoord ? `linear-gradient(135deg, ${GOLD}, #e8c98e)` : '#f4f1eb',
                    color: startKoord && zielKoord ? '#0a0a0a' : '#aaa',
                    fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                    boxShadow: startKoord && zielKoord ? '0 4px 14px rgba(200,169,110,0.3)' : 'none',
                  }}>
                  {routeLaden ? '⏳ Berechne Route...' : '🗺️ km automatisch berechnen'}
                </button>
                {form.start_adresse && form.ziel_adresse && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/${encodeURIComponent(form.start_adresse)}/${encodeURIComponent(form.ziel_adresse)}`, '_blank')}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e0ecff', background: '#f0f4ff', color: BLAU, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    📍 Maps
                  </button>
                )}
              </div>

              {/* Trennlinie */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#f0ece4' }} />
                <span style={{ fontSize: 10, color: '#ccc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>oder manuell eingeben</span>
                <div style={{ flex: 1, height: 1, background: '#f0ece4' }} />
              </div>

              {/* KM-Stand + km gefahren */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>KM-Stand Anfang</label>
                  <input type="number" value={form.km_start} onChange={e => setForm(f => ({ ...f, km_start: e.target.value }))} placeholder="z.B. 45200" style={inp} />
                </div>
                <div>
                  <label style={lbl}>KM-Stand Ende</label>
                  <input type="number" value={form.km_ende} onChange={e => setForm(f => ({ ...f, km_ende: e.target.value }))} placeholder="z.B. 45350" style={inp} />
                </div>
                <div>
                  <label style={{ ...lbl, color: GOLD }}>km gefahren *</label>
                  <input type="number" step="0.1" value={form.km_gefahren} onChange={e => setForm(f => ({ ...f, km_gefahren: e.target.value }))} placeholder="150.0" style={{ ...inp, borderColor: form.km_gefahren ? GOLD : '#e5e0d8', fontWeight: 700 }} />
                </div>
              </div>

              {/* Zweck */}
              <div>
                <label style={lbl}>🎯 Zweck der Fahrt *</label>
                <input value={form.zweck} onChange={e => setForm(f => ({ ...f, zweck: e.target.value }))} placeholder="z.B. Kundenbesuch Firma Müller GmbH, Materialeinkauf Baumarkt" style={inp} />
              </div>

              {/* Notiz */}
              <div>
                <label style={lbl}>Notiz (optional)</label>
                <input value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} placeholder="z.B. Maut A1: €8,50, Parkticket" style={inp} />
              </div>

              {/* Zuordnung zu Rechnung / Angebot */}
              <div style={{ position: 'relative' }}>
                <label style={lbl}>📋 Zuordnung – Rechnung / Angebot (optional)</label>
                {rechnungGewählt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#eff6ff', border: `1px solid ${BLAU}44`, borderRadius: 10 }}>
                    <span style={{ fontSize: 18 }}>{rechnungGewählt.typ === 'angebot' ? '📝' : '🧾'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a' }}>{rechnungGewählt.nummer}</div>
                      {rechnungGewählt.projektName && <div style={{ fontSize: 11, color: '#888' }}>{rechnungGewählt.projektName}</div>}
                    </div>
                    <button onClick={() => setRechnungGewählt(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>✕</button>
                  </div>
                ) : (
                  <div>
                    <input
                      value={rechnungSuche}
                      onChange={e => { setRechnungSuche(e.target.value); setRechnungDropdownOffen(true) }}
                      onFocus={() => setRechnungDropdownOffen(true)}
                      onBlur={() => setTimeout(() => setRechnungDropdownOffen(false), 200)}
                      placeholder="Rechnung/Angebot suchen: Nummer, Projekt, Kunde..."
                      style={inp}
                    />
                    {rechnungDropdownOffen && gefilterteRechnungen.length > 0 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 300, background: 'white', borderRadius: 10, border: '1px solid #e5e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                        {gefilterteRechnungen.map(r => {
                          const kunde = r.firma || [r.vorname, r.nachname].filter(Boolean).join(' ')
                          return (
                            <div key={r.id}
                              onMouseDown={() => { setRechnungGewählt(r); setRechnungSuche(''); setRechnungDropdownOffen(false) }}
                              style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f4f1eb', display: 'flex', alignItems: 'center', gap: 10 }}
                              onMouseEnter={ev => ev.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                              <span style={{ fontSize: 16, flexShrink: 0 }}>{r.typ === 'angebot' ? '📝' : '🧾'}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.nummer}{r.projektName ? ` – ${r.projektName}` : ''}
                                </div>
                                {kunde && <div style={{ fontSize: 11, color: '#aaa' }}>{kunde}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {rechnungDropdownOffen && rechnungenListe.length === 0 && (
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Keine Rechnungen / Angebote vorhanden</div>
                    )}
                  </div>
                )}
              </div>

              {/* KM-Geld Vorschau */}
              {form.km_gefahren && !isNaN(parseFloat(form.km_gefahren)) && (
                <div style={{ background: '#fdf8f0', border: `1px solid ${GOLD}44`, borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>KM-Geld Vorschau</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a2a3a' }}>
                    {parseFloat(form.km_gefahren).toFixed(1)} km × € {kmSatz.toFixed(4)} ={' '}
                    <span style={{ color: GOLD }}>€ {fmt(parseFloat(form.km_gefahren) * kmSatz)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    Steuerfreies KM-Geld gem. § 26 EStG
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f0ece4', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setFormOffen(false)} style={{ background: '#f4f1eb', color: '#555', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button onClick={speichern} style={{
                background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, color: '#0a0a0a',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(200,169,110,0.35)',
              }}>✓ Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
