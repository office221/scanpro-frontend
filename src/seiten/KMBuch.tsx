import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  beweis_name?: string
  beweis_typ?: string
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

// ── Leaflet Karten-Vorschau Komponente ─────────────────────────────────────
function RouteKarte({ startKoord, zielKoord, routeGeometry, startAdresse, zielAdresse }: {
  startKoord: { lat: string; lon: string }
  zielKoord:  { lat: string; lon: string }
  routeGeometry: [number, number][] | null
  startAdresse: string
  zielAdresse:  string
}) {
  const divRef  = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<any>(null)
  const [bereit, setBereit] = useState(!!(window as any).L)

  // Leaflet CSS + JS einmalig laden
  useEffect(() => {
    if ((window as any).L) { setBereit(true); return }
    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link')
      l.id = 'leaflet-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    if (!document.getElementById('leaflet-js')) {
      const s = document.createElement('script')
      s.id = 'leaflet-js'
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => setBereit(true)
      document.head.appendChild(s)
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  const karteAktualisieren = useCallback(() => {
    const L = (window as any).L
    if (!L || !divRef.current) return

    // Alte Karte entfernen und neu erstellen (sicherstes Vorgehen)
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(divRef.current, { zoomControl: true, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    mapRef.current = map

    const sLat = parseFloat(startKoord.lat), sLon = parseFloat(startKoord.lon)
    const zLat = parseFloat(zielKoord.lat),  zLon = parseFloat(zielKoord.lon)

    const iconStyle = (bg: string, label: string) => L.divIcon({
      html: `<div style="background:${bg};color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
      className: '', iconSize: [26, 26], iconAnchor: [13, 13]
    })

    L.marker([sLat, sLon], { icon: iconStyle('#10b981', 'S') }).addTo(map)
      .bindPopup(`<b>Start</b><br>${startAdresse || ''}`)
    L.marker([zLat, zLon], { icon: iconStyle('#ef4444', 'Z') }).addTo(map)
      .bindPopup(`<b>Ziel</b><br>${zielAdresse || ''}`)

    if (routeGeometry && routeGeometry.length > 1) {
      const latLons = routeGeometry.map(([lon, lat]: [number, number]) => [lat, lon])
      L.polyline(latLons, { color: '#6366f1', weight: 5, opacity: 0.85 }).addTo(map)
      map.fitBounds(L.latLngBounds(latLons as any), { padding: [28, 28] })
    } else {
      map.fitBounds(L.latLngBounds([[sLat, sLon], [zLat, zLon]]), { padding: [48, 48] })
    }
  }, [startKoord, zielKoord, routeGeometry, startAdresse, zielAdresse])

  useEffect(() => { if (bereit) karteAktualisieren() }, [bereit, karteAktualisieren])

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e0d8', background: '#f0ece4' }}>
      <div style={{ padding: '8px 12px', background: '#1a2a3a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          🗺️ Routenvorschau
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
          {routeGeometry ? '● Route berechnet' : '○ Nur Marker (Route noch nicht berechnet)'}
        </span>
      </div>
      <div ref={divRef} style={{ width: '100%', height: 280 }} />
      <div style={{ padding: '6px 12px', background: '#f9f6f1', display: 'flex', gap: 14, fontSize: 11 }}>
        <span><span style={{ color: '#10b981', fontWeight: 700 }}>S</span> {startAdresse?.split(',')[0] || 'Start'}</span>
        <span style={{ color: '#aaa' }}>→</span>
        <span><span style={{ color: '#ef4444', fontWeight: 700 }}>Z</span> {zielAdresse?.split(',')[0] || 'Ziel'}</span>
      </div>
    </div>
  )
}

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
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)
  const [detailFahrt, setDetailFahrt] = useState<Fahrt | null>(null)
  const [gpsLadenStart, setGpsLadenStart] = useState(false)
  const [gpsLadenZiel, setGpsLadenZiel]  = useState(false)
  const [confirmModal, setConfirmModal]   = useState<{ text: string; onJa: () => void } | null>(null)
  const [rueckfahrtModal, setRueckfahrtModal] = useState<{ vorlage: Fahrt } | null>(null)

  // Beweis / Foto-Anhang
  const [beweisData, setBeweisData] = useState<string | null>(null)
  const [beweisName, setBeweisName] = useState<string | null>(null)
  const [beweisTyp, setBeweisTyp]   = useState<string | null>(null)
  const [beweisGeaendert, setBeweisGeaendert] = useState(false)
  const [beweisModal, setBeweisModal] = useState<{ data: string; typ: string; name: string } | null>(null)
  const [beweisLaden, setBeweisLaden] = useState(false)

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

  // ── GPS Standort holen & Adresse ermitteln ────────────────────────────────
  const holGpsPosition = (ziel: 'start' | 'ziel') => {
    if (!navigator.geolocation) {
      zeigeToast('GPS nicht verfügbar auf diesem Gerät', false); return
    }
    if (ziel === 'start') setGpsLadenStart(true)
    else setGpsLadenZiel(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        let adresse = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
        try {
          // Versuche zuerst Backend-Proxy
          const r = await api.get(`/km-buch/geocode-reverse?lat=${lat}&lon=${lon}`)
          if (r.data?.display_name) adresse = r.data.display_name
        } catch {
          try {
            // Fallback: direkt Nominatim (hat CORS-Support)
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
              { headers: { 'Accept-Language': 'de' } }
            )
            const data = await r.json()
            if (data?.display_name) adresse = data.display_name
          } catch { /* Koordinaten als Fallback */ }
        }
        if (ziel === 'start') {
          setForm(f => ({ ...f, start_adresse: adresse }))
          setStartKoord({ lat: String(lat), lon: String(lon) })
        } else {
          setForm(f => ({ ...f, ziel_adresse: adresse }))
          setZielKoord({ lat: String(lat), lon: String(lon) })
        }
        zeigeToast(`✅ ${ziel === 'start' ? 'Startadresse' : 'Zieladresse'} per GPS übernommen`)
        if (ziel === 'start') setGpsLadenStart(false)
        else setGpsLadenZiel(false)
      },
      (err) => {
        const msg = err.code === 1
          ? 'GPS-Zugriff verweigert – bitte im Browser erlauben'
          : err.code === 3 ? 'GPS-Zeitüberschreitung' : 'GPS-Position nicht ermittelbar'
        zeigeToast(msg, false)
        if (ziel === 'start') setGpsLadenStart(false)
        else setGpsLadenZiel(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
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
        // Geometrie (GeoJSON) für Kartenvorschau speichern
        const coords = data.routes[0].geometry?.coordinates
        if (coords) setRouteGeometry(coords)
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

  // ── Neue Fahrt ohne Rückfahrt-Check (direkt öffnen) ────────────────────────
  const oeffneFormNeu = () => {
    setStartVorschlaege([]); setZielVorschlaege([])
    setRechnungSuche(''); setRechnungDropdownOffen(false)
    setEditFahrt(null)
    setForm(emptyForm())
    setStartKoord(null); setZielKoord(null)
    setRouteGeometry(null)
    setRechnungGewählt(null)
    setBeweisData(null); setBeweisName(null); setBeweisTyp(null); setBeweisGeaendert(false)
    setFormOffen(true)
  }

  // ── Rückfahrt eintragen (Start ↔ Ziel tauschen) ────────────────────────────
  const oeffneRueckfahrt = (vorlage: Fahrt) => {
    setRueckfahrtModal(null)
    setStartVorschlaege([]); setZielVorschlaege([])
    setRechnungSuche(''); setRechnungDropdownOffen(false)
    setEditFahrt(null)
    setForm({
      datum: new Date().toISOString().split('T')[0],
      start_adresse: vorlage.ziel_adresse || '',   // ← getauscht
      ziel_adresse:  vorlage.start_adresse || '',   // ← getauscht
      km_start: '', km_ende: '',
      km_gefahren: vorlage.km_gefahren?.toString() || '',
      zweck: vorlage.zweck ? `Rückfahrt – ${vorlage.zweck}` : 'Rückfahrt',
      notiz: '',
    })
    // Koordinaten ebenfalls tauschen
    setStartKoord(vorlage.ziel_lat ? { lat: String(vorlage.ziel_lat), lon: String(vorlage.ziel_lon) } : null)
    setZielKoord (vorlage.start_lat ? { lat: String(vorlage.start_lat), lon: String(vorlage.start_lon) } : null)
    setRechnungGewählt(null)
    setBeweisData(null); setBeweisName(null); setBeweisTyp(null); setBeweisGeaendert(false)
    setFormOffen(true)
  }

  // ── Form öffnen ────────────────────────────────────────────────────────────
  const oeffneForm = (f?: Fahrt) => {
    setStartVorschlaege([]); setZielVorschlaege([])
    setRechnungSuche(''); setRechnungDropdownOffen(false)

    // Neue Fahrt: prüfen ob heute schon eine Fahrt existiert → Rückfahrt anbieten
    if (!f) {
      const heute = new Date().toISOString().split('T')[0]
      const heuteFahrten = fahrten.filter(x => (x.datum || '').split('T')[0] === heute)
      if (heuteFahrten.length > 0) {
        const letzteHeuteFahrt = heuteFahrten[heuteFahrten.length - 1]
        setRueckfahrtModal({ vorlage: letzteHeuteFahrt })
        return
      }
    }

    if (f) {
      setEditFahrt(f)
      // Beweis: name/typ für Anzeige, data bleibt null (wird erst bei Bedarf geladen)
      setBeweisData(null)
      setBeweisName(f.beweis_name || null)
      setBeweisTyp(f.beweis_typ || null)
      setBeweisGeaendert(false)
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
      setBeweisData(null); setBeweisName(null); setBeweisTyp(null); setBeweisGeaendert(false)
    }
    setFormOffen(true)
  }

  const speichern = async () => {
    if (!form.datum || !form.zweck || !form.km_gefahren) {
      zeigeToast('Datum, Zweck und km sind Pflichtfelder', false); return
    }
    try {
      const payload: any = {
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
        // Beweis nur mitsenden wenn geändert (verhindert Überschreiben)
        ...(beweisGeaendert && {
          beweis_data: beweisData,
          beweis_typ: beweisTyp,
          beweis_name: beweisName,
        }),
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

  const loeschen = (id: number) => {
    setConfirmModal({
      text: 'Möchten Sie diese Fahrt wirklich löschen?',
      onJa: async () => {
        setConfirmModal(null)
        await api.delete(`/km-buch/${id}`)
        setFahrten(prev => prev.filter(f => f.id !== id))
        zeigeToast('Fahrt gelöscht')
      }
    })
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

  // ── Beweis / Foto-Anhang ────────────────────────────────────────────────────
  const handleBeweisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      zeigeToast('Datei zu groß – max. 10 MB erlaubt', false); return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setBeweisData(result)
      setBeweisName(file.name)
      setBeweisTyp(file.type)
      setBeweisGeaendert(true)
    }
    reader.readAsDataURL(file)
    // Input zurücksetzen damit gleiche Datei nochmal wählbar
    e.target.value = ''
  }

  const zeigeBeweis = async (fahrt: Fahrt) => {
    setBeweisLaden(true)
    try {
      const res = await api.get(`/km-buch/${fahrt.id}/beweis`)
      const { data, typ, name } = res.data
      if (typ?.startsWith('image/')) {
        setBeweisModal({ data, typ, name })
      } else {
        // PDF oder andere Datei: in neuem Tab öffnen
        const win = window.open()
        if (win) {
          win.document.write(
            `<html><head><title>${name || 'Beweis'}</title></head>` +
            `<body style="margin:0;background:#222">` +
            `<embed src="${data}" style="width:100%;height:100vh" type="${typ || 'application/pdf'}" />` +
            `</body></html>`
          )
        }
      }
    } catch { zeigeToast('Fehler beim Laden des Beweises', false) }
    setBeweisLaden(false)
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
            <div key={f.id} onClick={() => setDetailFahrt(f)} style={{
              background: 'white', borderRadius: 12,
              border: '1px solid #f0ece4',
              borderLeft: `4px solid ${f.in_guv ? GRUEN : GOLD}`,
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden',
              cursor: 'pointer',
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
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
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
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
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

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {detailFahrt && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900 }} onClick={() => setDetailFahrt(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: isMobile ? '95vw' : 560, maxHeight: '90vh', overflowY: 'auto',
            background: 'white', borderRadius: 18, zIndex: 901,
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)', fontFamily: 'DM Sans, sans-serif',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 22px', background: '#1a2a3a', borderRadius: '18px 18px 0 0', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: detailFahrt.in_guv ? '#d1fae5' : '#fdf8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detailFahrt.zweck || 'Fahrt'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {detailFahrt.datum ? new Date(detailFahrt.datum).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: GOLD }}>
                  € {fmt(Number(detailFahrt.km_gefahren) * kmSatz)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                  {Number(detailFahrt.km_gefahren).toFixed(1)} km
                </div>
              </div>
              <button onClick={() => setDetailFahrt(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Inhalt */}
            <div style={{ padding: '20px 22px' }}>

              {/* Route */}
              {(detailFahrt.start_adresse || detailFahrt.ziel_adresse) && (
                <div style={{ marginBottom: 16, background: '#f8f6f2', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>🗺️ Route</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: GRUEN, fontWeight: 700, marginBottom: 2 }}>VON</div>
                      <div style={{ fontSize: 13, color: '#1a2a3a' }}>{detailFahrt.start_adresse || '—'}</div>
                    </div>
                    <div style={{ fontSize: 20, color: '#ccc', paddingTop: 16 }}>→</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: ROT, fontWeight: 700, marginBottom: 2 }}>NACH</div>
                      <div style={{ fontSize: 13, color: '#1a2a3a' }}>{detailFahrt.ziel_adresse || '—'}</div>
                    </div>
                  </div>
                  {detailFahrt.start_adresse && detailFahrt.ziel_adresse && (
                    <button onClick={() => oeffneMaps(detailFahrt)} style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${BLAU}33`, background: '#eff6ff', color: BLAU, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      🗺️ Google Maps Route öffnen
                    </button>
                  )}
                </div>
              )}

              {/* Details Zeilen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '📏', label: 'km gefahren', value: `${Number(detailFahrt.km_gefahren).toFixed(1)} km` },
                  { icon: '💰', label: 'KM-Geld', value: `€ ${fmt(Number(detailFahrt.km_gefahren) * kmSatz)} (${Number(detailFahrt.km_gefahren).toFixed(1)} × € ${kmSatz.toFixed(4)})` },
                  detailFahrt.km_start ? { icon: '🔢', label: 'KM-Stand', value: `${detailFahrt.km_start} → ${detailFahrt.km_ende || '?'}` } : null,
                  detailFahrt.notiz ? { icon: '📝', label: 'Notiz', value: detailFahrt.notiz } : null,
                  detailFahrt.rechnung_nummer ? { icon: detailFahrt.rechnung_typ === 'angebot' ? '📝' : '🧾', label: 'Zugeordnet zu', value: `${detailFahrt.rechnung_nummer}${detailFahrt.rechnung_projekt ? ' – ' + detailFahrt.rechnung_projekt : ''}${detailFahrt.rechnung_kunde ? ' · ' + detailFahrt.rechnung_kunde : ''}` } : null,
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', fontWeight: 700, marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: '#1a2a3a', fontWeight: 500 }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* G&V Status */}
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: detailFahrt.in_guv ? '#d1fae5' : '#fdf8f0', border: `1px solid ${detailFahrt.in_guv ? '#a7f3d0' : GOLD + '44'}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: detailFahrt.in_guv ? GRUEN : GOLD }}>
                  {detailFahrt.in_guv ? '✅ In G&V übertragen' : '⏳ Noch nicht in G&V'}
                </div>
              </div>

              {/* Beweis / Foto */}
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: detailFahrt.beweis_name ? '#f0fdf4' : '#fafaf8', border: `1px solid ${detailFahrt.beweis_name ? '#a7f3d044' : '#f0ece4'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: detailFahrt.beweis_name ? GRUEN : '#ccc', marginBottom: 8 }}>
                  📎 Fahrtbeweis
                </div>
                {detailFahrt.beweis_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>
                      {detailFahrt.beweis_typ?.startsWith('image/') ? '🖼️' : detailFahrt.beweis_typ?.includes('pdf') ? '📄' : '📎'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {detailFahrt.beweis_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Finanzamt-Nachweis angehängt</div>
                    </div>
                    <button
                      onClick={() => zeigeBeweis(detailFahrt)}
                      disabled={beweisLaden}
                      style={{ background: GRUEN, color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: beweisLaden ? 0.6 : 1 }}>
                      {beweisLaden ? '⏳' : '👁 Anzeigen'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#bbb' }}>
                    Kein Beweis angehängt ·{' '}
                    <span
                      style={{ color: BLAU, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => { setDetailFahrt(null); oeffneForm(detailFahrt) }}>
                      Jetzt hinzufügen ✏️
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Aktionen */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f0ece4', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { setDetailFahrt(null); oeffneForm(detailFahrt) }}
                style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                ✏️ Bearbeiten
              </button>
              {!detailFahrt.in_guv && (
                <button onClick={() => { zuGuv(detailFahrt); setDetailFahrt(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1.5px solid ${GOLD}66`, background: '#fdf8f0', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: GOLD }}>
                  ↓ Zu G&V übertragen
                </button>
              )}
              <button onClick={() => { setDetailFahrt(null); loeschen(detailFahrt.id) }}
                style={{ padding: '10px 16px', borderRadius: 9, border: '1.5px solid #fde8e6', background: 'white', fontSize: 13, cursor: 'pointer', color: ROT }}>
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
              <div>
                <label style={lbl}>📍 Startadresse</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      value={form.start_adresse}
                      onChange={e => onStartChange(e.target.value)}
                      onFocus={() => setStartFokus(true)}
                      onBlur={() => setTimeout(() => setStartFokus(false), 200)}
                      placeholder="z.B. Mariahilfer Straße 1, Wien"
                      style={{ ...inp, borderColor: startKoord ? GRUEN : '#e5e0d8' }}
                    />
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
                  <button
                    onClick={() => holGpsPosition('start')}
                    disabled={gpsLadenStart}
                    title="Aktuellen GPS-Standort als Startadresse übernehmen"
                    style={{
                      padding: '0 12px', borderRadius: 10, border: `1px solid ${gpsLadenStart ? '#e5e0d8' : GRUEN + '66'}`,
                      background: gpsLadenStart ? '#f4f1eb' : '#ecfdf5',
                      color: gpsLadenStart ? '#aaa' : GRUEN,
                      cursor: gpsLadenStart ? 'default' : 'pointer',
                      fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', minWidth: 46, whiteSpace: 'nowrap',
                    }}>
                    {gpsLadenStart ? '⏳' : '📍'}
                  </button>
                </div>
                {startKoord && <div style={{ fontSize: 10, color: GRUEN, marginTop: 3 }}>✓ Koordinaten gespeichert – Route kann berechnet werden</div>}
              </div>

              {/* Zieladresse */}
              <div>
                <label style={lbl}>🏁 Zieladresse / Reiseziel</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      value={form.ziel_adresse}
                      onChange={e => onZielChange(e.target.value)}
                      onFocus={() => setZielFokus(true)}
                      onBlur={() => setTimeout(() => setZielFokus(false), 200)}
                      placeholder="z.B. Hauptplatz 5, Graz"
                      style={{ ...inp, borderColor: zielKoord ? GRUEN : '#e5e0d8' }}
                    />
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
                  <button
                    onClick={() => holGpsPosition('ziel')}
                    disabled={gpsLadenZiel}
                    title="Wenn angekommen: aktuellen GPS-Standort als Zieladresse übernehmen"
                    style={{
                      padding: '0 12px', borderRadius: 10, border: `1px solid ${gpsLadenZiel ? '#e5e0d8' : ROT + '66'}`,
                      background: gpsLadenZiel ? '#f4f1eb' : '#fef2f2',
                      color: gpsLadenZiel ? '#aaa' : ROT,
                      cursor: gpsLadenZiel ? 'default' : 'pointer',
                      fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', minWidth: 46, whiteSpace: 'nowrap',
                    }}>
                    {gpsLadenZiel ? '⏳' : '🏁'}
                  </button>
                </div>
                {zielKoord && <div style={{ fontSize: 10, color: GRUEN, marginTop: 3 }}>✓ Koordinaten gespeichert</div>}
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

              {/* ── Karten-Vorschau ── */}
              {startKoord && zielKoord && (
                <RouteKarte
                  startKoord={startKoord}
                  zielKoord={zielKoord}
                  routeGeometry={routeGeometry}
                  startAdresse={form.start_adresse}
                  zielAdresse={form.ziel_adresse}
                />
              )}

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

              {/* ── Beweis / Foto-Anhang ── */}
              <div>
                <label style={lbl}>📎 Fahrtbeweis (optional) – Foto / PDF / E-Mail</label>
                {/* Vorschau wenn Datei geladen */}
                {(beweisData || beweisName) && (
                  <div style={{ marginBottom: 10, background: '#f8f6f2', borderRadius: 12, padding: '12px 14px', border: '1px solid #e5e0d8' }}>
                    {beweisData && beweisTyp?.startsWith('image/') ? (
                      <img src={beweisData} alt="Beweis" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain', display: 'block', marginBottom: 8 }} />
                    ) : (
                      <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>
                        {beweisTyp?.includes('pdf') ? '📄' : beweisTyp?.includes('image') ? '🖼️' : '📎'}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {beweisName || 'Datei angehängt'}
                        {!beweisData && beweisName && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: GRUEN, fontWeight: 700 }}>✓ vorhanden</span>
                        )}
                      </span>
                      <button
                        onClick={() => { setBeweisData(null); setBeweisName(null); setBeweisTyp(null); setBeweisGeaendert(true) }}
                        style={{ background: '#fef2f2', border: 'none', color: ROT, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                        ✕ Entfernen
                      </button>
                    </div>
                    {!beweisData && beweisName && (
                      <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
                        Neues Foto hochladen um vorhandenen Beweis zu ersetzen
                      </div>
                    )}
                  </div>
                )}
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 10, cursor: 'pointer',
                  border: `2px dashed ${beweisData || beweisName ? GRUEN : '#d1cdc7'}`,
                  background: beweisData || beweisName ? '#f0fdf4' : '#fafaf8',
                  color: beweisData || beweisName ? GRUEN : '#aaa',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 18 }}>📷</span>
                  {beweisData || beweisName ? '🔄 Anderen Beweis hochladen' : 'Foto / PDF / Screenshot hochladen'}
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf,.eml,.msg,.png,.jpg,.jpeg,.webp,.heic"
                    onChange={handleBeweisUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 5 }}>
                  Foto, PDF, Screenshot als Nachweis fürs Finanzamt · max. 10 MB
                </div>
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
      {/* ── Beweis Lightbox ────────────────────────────────────────────────── */}
      {beweisModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setBeweisModal(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            onClick={ev => ev.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {beweisModal.name}
              </div>
              <a href={beweisModal.data} download={beweisModal.name}
                style={{ background: GOLD, color: '#0a0a0a', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                ⬇ Herunterladen
              </a>
              <button onClick={() => setBeweisModal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>
            <img
              src={beweisModal.data}
              alt={beweisModal.name}
              style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}

      {/* ── Rückfahrt-Modal ──────────────────────────────────────────────────── */}
      {rueckfahrtModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}
          onClick={() => setRueckfahrtModal(null)}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
            onClick={ev => ev.stopPropagation()}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a2a3a' }}>Rückfahrt eintragen?</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Du hast heute bereits eine Fahrt eingetragen</div>
            </div>

            {/* Vorschau der heutigen Fahrt */}
            <div style={{ background: '#f5f3ef', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', fontWeight: 700, marginBottom: 8 }}>Letzte Fahrt heute</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a' }}>📍 {rueckfahrtModal.vorlage.start_adresse || '—'}</div>
                  <div style={{ fontSize: 11, color: '#888', margin: '3px 0' }}>↓ {rueckfahrtModal.vorlage.km_gefahren} km</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a' }}>🏁 {rueckfahrtModal.vorlage.ziel_adresse || '—'}</div>
                </div>
              </div>
            </div>

            {/* Rückfahrt-Vorschau */}
            <div style={{ background: '#e8f5e9', borderRadius: 12, padding: '14px 16px', marginBottom: 24, border: '1.5px solid #a5d6a7' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#2e7d32', fontWeight: 700, marginBottom: 8 }}>Rückfahrt (wird eingetragen)</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a' }}>📍 {rueckfahrtModal.vorlage.ziel_adresse || '—'}</div>
              <div style={{ fontSize: 11, color: '#888', margin: '3px 0' }}>↓ {rueckfahrtModal.vorlage.km_gefahren} km</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a' }}>🏁 {rueckfahrtModal.vorlage.start_adresse || '—'}</div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRueckfahrtModal(null); oeffneFormNeu() }}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#555' }}>
                + Neue Fahrt
              </button>
              <button onClick={() => oeffneRueckfahrt(rueckfahrtModal.vorlage)}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: 'white', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                ↩ Ja, Rückfahrt!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
