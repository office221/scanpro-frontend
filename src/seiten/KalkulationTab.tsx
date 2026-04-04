import React, { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://scanpro-backend-production.up.railway.app/api'

const STANDARD_GEWERKE = [
  '01 Baustelleneinrichtung',
  '02 Erdarbeiten',
  '03 Beton- und Stahlbetonarbeiten',
  '04 Maurerarbeiten',
  '05 Zimmerarbeiten',
  '06 Dachdeckerarbeiten',
  '07 Klempnerarbeiten',
  '08 Putz- und Stuckarbeiten',
  '09 Estricharbeiten',
  '10 Fliesenarbeiten',
  '11 Tischlerarbeiten',
  '12 Bodenbelagsarbeiten',
  '13 Malerarbeiten',
  '14 Elektroinstallation',
  '15 Heizungsanlage',
  '16 Sanitärinstallation',
  '17 Lüftung / Klima',
  '18 Außenanlagen',
  'Sonstiges',
]

const EINHEITEN = ['m²', 'm³', 'm', 'lfm', 'Stk', 'Psch', 'h', 'kg', 't']

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Entwurf:    { bg: '#fef3c7', color: '#92400e' },
  Freigegeben:{ bg: '#d1f5e0', color: '#2d6a4f' },
  Abgeschlossen: { bg: '#dbeafe', color: '#1e40af' },
  Storniert:  { bg: '#fee2e2', color: '#991b1b' },
}

interface LV {
  id: number
  name: string
  beschreibung: string
  datum: string | null
  status: string
  objektId: number
}

interface Gewerk {
  id: number
  lvId: number
  position: number
  name: string
}

interface Position {
  id: number
  gewerkeId: number
  lvId: number
  posNr: string
  bezeichnung: string
  einheit: string
  menge: number
  einheitspreis: number
  gesamtpreis: number
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export default function KalkulationTab({ objektId }: { objektId: number }) {
  const [lvListe, setLvListe] = useState<LV[]>([])
  const [aktivLV, setAktivLV] = useState<LV | null>(null)
  const [gewerke, setGewerke] = useState<Gewerk[]>([])
  const [positionen, setPositionen] = useState<Position[]>([])
  const [ladenLV, setLadenLV] = useState(false)
  const [ladenDetails, setLadenDetails] = useState(false)
  const [pdfLaden, setPdfLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  // LV Form
  const [lvFormOffen, setLvFormOffen] = useState(false)
  const [lvEditId, setLvEditId] = useState<number | null>(null)
  const [lvName, setLvName] = useState('')
  const [lvBeschreibung, setLvBeschreibung] = useState('')
  const [lvDatum, setLvDatum] = useState('')
  const [lvStatus, setLvStatus] = useState('Entwurf')

  // Gewerk Dropdown
  const [gewerkDropdownOffen, setGewerkDropdownOffen] = useState(false)
  const [eigeneGewerkEingabe, setEigeneGewerkEingabe] = useState(false)
  const [eigeneGewerkName, setEigeneGewerkName] = useState('')

  // Gewerk-Collapse
  const [gewerkeCollapsed, setGewerkeCollapsed] = useState<Record<number, boolean>>({})

  // Inline-Bearbeitung Gewerk-Name
  const [gewerkEditId, setGewerkEditId] = useState<number | null>(null)
  const [gewerkEditName, setGewerkEditName] = useState('')

  // Positionen-Edit-Puffer: id -> Felder
  const [posEdit, setPosEdit] = useState<Record<number, Partial<Position>>>({})

  // Materialien
  const [materialien, setMaterialien] = useState<any[]>([])
  const [materialExpanded, setMaterialExpanded] = useState<Record<number, boolean>>({})

  const ladeLVListe = useCallback(async () => {
    setLadenLV(true)
    try {
      const r = await fetch(`${BASE_URL}/kalkulation/lv/${objektId}`, { headers: authHeaders() })
      if (r.ok) setLvListe(await r.json())
    } catch {}
    setLadenLV(false)
  }, [objektId])

  const ladeDetails = useCallback(async (lv: LV) => {
    setLadenDetails(true)
    try {
      const [gR, pR, mR] = await Promise.all([
        fetch(`${BASE_URL}/kalkulation/gewerke/${lv.id}`, { headers: authHeaders() }),
        fetch(`${BASE_URL}/kalkulation/lv-vollstaendig/${lv.id}`, { headers: authHeaders() }),
        fetch(`${BASE_URL}/kalkulation/materialien/${lv.id}`, { headers: authHeaders() }),
      ])
      const gewerkeData: Gewerk[] = gR.ok ? await gR.json() : []
      const vollData = pR.ok ? await pR.json() : { gewerke: [] }
      const mData = mR.ok ? await mR.json() : []
      setGewerke(gewerkeData)
      const allePos: Position[] = vollData.gewerke
        ? vollData.gewerke.flatMap((g: any) => g.positionen || [])
        : []
      setPositionen(allePos)
      setMaterialien(mData)
    } catch {}
    setLadenDetails(false)
  }, [])

  useEffect(() => {
    ladeLVListe()
  }, [ladeLVListe])

  useEffect(() => {
    if (aktivLV) {
      setMaterialien([])
      ladeDetails(aktivLV)
    }
  }, [aktivLV, ladeDetails])

  const oeffneLVForm = (lv?: LV) => {
    if (lv) {
      setLvEditId(lv.id)
      setLvName(lv.name)
      setLvBeschreibung(lv.beschreibung || '')
      setLvDatum(lv.datum ? lv.datum.substring(0, 10) : '')
      setLvStatus(lv.status || 'Entwurf')
    } else {
      setLvEditId(null)
      setLvName('')
      setLvBeschreibung('')
      setLvDatum(new Date().toISOString().substring(0, 10))
      setLvStatus('Entwurf')
    }
    setLvFormOffen(true)
  }

  const speicherLV = async () => {
    if (!lvName.trim()) { setFehler('Name ist Pflichtfeld'); return }
    setFehler('')
    try {
      if (lvEditId) {
        await fetch(`${BASE_URL}/kalkulation/lv/${lvEditId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: lvName, beschreibung: lvBeschreibung, datum: lvDatum || null, status: lvStatus }),
        })
        setAktivLV(prev => prev ? { ...prev, name: lvName, beschreibung: lvBeschreibung, datum: lvDatum || null, status: lvStatus } : prev)
      } else {
        const r = await fetch(`${BASE_URL}/kalkulation/lv`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ objektId, name: lvName, beschreibung: lvBeschreibung, datum: lvDatum || null }),
        })
        if (r.ok) {
          const neu = await r.json()
          setAktivLV(neu)
        }
      }
      await ladeLVListe()
      setLvFormOffen(false)
    } catch (e: any) { setFehler(e.message) }
  }

  const loescheLV = async (id: number) => {
    if (!window.confirm('Leistungsverzeichnis wirklich löschen? Alle Gewerke und Positionen werden entfernt.')) return
    await fetch(`${BASE_URL}/kalkulation/lv/${id}`, { method: 'DELETE', headers: authHeaders() })
    if (aktivLV?.id === id) { setAktivLV(null); setGewerke([]); setPositionen([]); setMaterialien([]) }
    await ladeLVListe()
  }

  const fuegeGewerkHinzu = async (name: string) => {
    if (!aktivLV) return
    setGewerkDropdownOffen(false)
    const pos = gewerke.length + 1
    const r = await fetch(`${BASE_URL}/kalkulation/gewerke`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lvId: aktivLV.id, name, position: pos }),
    })
    if (r.ok) {
      const neu: Gewerk = await r.json()
      setGewerke(prev => [...prev, neu])
    }
  }

  const speicherGewerkName = async (id: number) => {
    await fetch(`${BASE_URL}/kalkulation/gewerke/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name: gewerkEditName }),
    })
    setGewerke(prev => prev.map(g => g.id === id ? { ...g, name: gewerkEditName } : g))
    setGewerkEditId(null)
  }

  const loescheGewerk = async (id: number) => {
    if (!window.confirm('Gewerk und alle Positionen löschen?')) return
    await fetch(`${BASE_URL}/kalkulation/gewerke/${id}`, { method: 'DELETE', headers: authHeaders() })
    setGewerke(prev => prev.filter(g => g.id !== id))
    setPositionen(prev => prev.filter(p => p.gewerkeId !== id))
  }

  const fuegePositionHinzu = async (gewerkeId: number) => {
    if (!aktivLV) return
    const existingPos = positionen.filter(p => p.gewerkeId === gewerkeId)
    const naechsteNr = String(existingPos.length + 1).padStart(2, '0')
    const r = await fetch(`${BASE_URL}/kalkulation/positionen`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        gewerkeId,
        lvId: aktivLV.id,
        posNr: naechsteNr,
        bezeichnung: '',
        einheit: 'm²',
        menge: 0,
        einheitspreis: 0,
      }),
    })
    if (r.ok) {
      const neu: Position = await r.json()
      setPositionen(prev => [...prev, neu])
    }
  }

  const aktualisierePosEdit = (posId: number, feld: keyof Position, wert: string | number) => {
    setPosEdit(prev => {
      const alt = prev[posId] || {}
      const neu = { ...alt, [feld]: wert }
      // GP berechnen
      const menge = Number(feld === 'menge' ? wert : (neu.menge ?? positionen.find(p => p.id === posId)?.menge ?? 0))
      const ep = Number(feld === 'einheitspreis' ? wert : (neu.einheitspreis ?? positionen.find(p => p.id === posId)?.einheitspreis ?? 0))
      neu.gesamtpreis = menge * ep
      return { ...prev, [posId]: neu }
    })
  }

  const getPosWert = <K extends keyof Position>(pos: Position, feld: K): Position[K] => {
    const edit = posEdit[pos.id]
    if (edit && feld in edit) return edit[feld] as Position[K]
    return pos[feld]
  }

  const speicherePosition = async (pos: Position) => {
    const edit = posEdit[pos.id] || {}
    const updated = { ...pos, ...edit }
    const gp = Number(updated.menge || 0) * Number(updated.einheitspreis || 0)
    await fetch(`${BASE_URL}/kalkulation/positionen/${pos.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        posNr: updated.posNr,
        bezeichnung: updated.bezeichnung,
        einheit: updated.einheit,
        menge: updated.menge,
        einheitspreis: updated.einheitspreis,
      }),
    })
    setPositionen(prev => prev.map(p => p.id === pos.id ? { ...p, ...edit, gesamtpreis: gp } : p))
    setPosEdit(prev => { const n = { ...prev }; delete n[pos.id]; return n })
  }

  const loeschePosition = async (id: number) => {
    await fetch(`${BASE_URL}/kalkulation/positionen/${id}`, { method: 'DELETE', headers: authHeaders() })
    setPositionen(prev => prev.filter(p => p.id !== id))
  }

  const fuegeMaterialHinzu = async () => {
    if (!aktivLV) return
    const r = await fetch(`${BASE_URL}/kalkulation/materialien`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ lvId: aktivLV.id, hersteller: '', artikel: '', artikelnummer: '', einheit: 'Stk', menge: 1, einheitspreis: 0 })
    })
    if (r.ok) { const neu = await r.json(); setMaterialien(prev => [...prev, neu]) }
  }

  const aktualisiereM = (id: number, feld: string, wert: string) => {
    setMaterialien(prev => prev.map(m => m.id === id ? { ...m, [feld]: wert, gesamtpreis: feld === 'menge' || feld === 'einheitspreis' ? (parseFloat(feld === 'menge' ? wert : m.menge)||0) * (parseFloat(feld === 'einheitspreis' ? wert : m.einheitspreis)||0) : m.gesamtpreis } : m))
  }

  const speicherMaterial = async (m: any) => {
    await fetch(`${BASE_URL}/kalkulation/materialien/${m.id}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    })
  }

  const loescheMaterial = async (id: number) => {
    await fetch(`${BASE_URL}/kalkulation/materialien/${id}`, { method: 'DELETE', headers: authHeaders() })
    setMaterialien(prev => prev.filter(m => m.id !== id))
  }

  const fotoHochladen = (id: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      // Resize/compress: max 800px, quality 0.7
      const canvas = document.createElement('canvas')
      const img = new Image()
      img.onload = async () => {
        const maxW = 800
        const scale = img.width > maxW ? maxW / img.width : 1
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const base64 = canvas.toDataURL('image/jpeg', 0.7)
        aktualisiereM(id, 'foto', base64)
        // immediately save
        const mat = materialien.find(m => m.id === id)
        if (mat) await speicherMaterial({ ...mat, foto: base64 })
      }
      img.src = URL.createObjectURL(file)
    }
    input.click()
  }

  const downloadPDF = async () => {
    if (!aktivLV) return
    setPdfLaden(true)
    setFehler('')
    try {
      const r = await fetch(`${BASE_URL}/kalkulation/pdf/${aktivLV.id}`, { headers: authHeaders() })
      if (!r.ok) {
        const text = await r.text()
        throw new Error('PDF-Fehler: ' + text.substring(0, 100))
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LV-${aktivLV.name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) { setFehler(e.message) }
    setPdfLaden(false)
  }

  const drucken = async () => {
    if (!aktivLV) return
    setPdfLaden(true)
    setFehler('')
    try {
      const r = await fetch(`${BASE_URL}/kalkulation/pdf/${aktivLV.id}`, { headers: authHeaders() })
      if (!r.ok) throw new Error('PDF konnte nicht geladen werden')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) { setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 1000) }
    } catch (e: any) { setFehler(e.message) }
    setPdfLaden(false)
  }

  const grandTotal = positionen.reduce((sum, p) => {
    const edit = posEdit[p.id]
    const gp = edit && 'gesamtpreis' in edit ? Number(edit.gesamtpreis) : Number(p.gesamtpreis || 0)
    return sum + gp
  }, 0)
  const mwst = grandTotal * 0.19
  const brutto = grandTotal + mwst

  // Styles
  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 12, border: '1px solid #e8e2d9', overflow: 'hidden', marginBottom: 12,
  }
  const inputSm: React.CSSProperties = {
    border: '1px solid #e5e0d8', borderRadius: 6, padding: '5px 8px', fontSize: 12,
    fontFamily: 'inherit', outline: 'none', background: 'white',
  }
  const btnPrimary: React.CSSProperties = {
    background: '#1a2a3a', color: 'white', border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    background: 'white', color: '#1a2a3a', border: '1px solid #e5e0d8', borderRadius: 8,
    padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }
  const btnDanger: React.CSSProperties = {
    background: 'none', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px',
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#1a2a3a' }}>
            Kalkulation / Leistungsverzeichnis
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>LBH22-orientierte Baukostenplanung</div>
        </div>
        <button style={btnPrimary} onClick={() => oeffneLVForm()}>+ Neues LV</button>
      </div>

      {fehler && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {fehler}
        </div>
      )}

      {/* LV Modal */}
      {lvFormOffen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLvFormOffen(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '90%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#1a2a3a' }}>
              {lvEditId ? 'LV bearbeiten' : 'Neues Leistungsverzeichnis'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>Name *</label>
                <input value={lvName} onChange={e => setLvName(e.target.value)}
                  style={{ ...inputSm, width: '100%', padding: '9px 12px', fontSize: 13 }}
                  placeholder="z.B. Sanierung Wohnung EG" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>Beschreibung</label>
                <textarea value={lvBeschreibung} onChange={e => setLvBeschreibung(e.target.value)} rows={3}
                  style={{ ...inputSm, width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
                  placeholder="Kurze Beschreibung des Projekts..." />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>Datum</label>
                  <input type="date" value={lvDatum} onChange={e => setLvDatum(e.target.value)}
                    style={{ ...inputSm, width: '100%', padding: '9px 12px', fontSize: 13 }} />
                </div>
                {lvEditId && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>Status</label>
                    <select value={lvStatus} onChange={e => setLvStatus(e.target.value)}
                      style={{ ...inputSm, width: '100%', padding: '9px 12px', fontSize: 13 }}>
                      {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setLvFormOffen(false)}>Abbrechen</button>
              <button style={btnPrimary} onClick={speicherLV}>{lvEditId ? 'Speichern' : 'LV erstellen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* LV Liste */}
      {ladenLV ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Lade...</div>
      ) : lvListe.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#888' }}>Noch kein Leistungsverzeichnis</div>
          <div style={{ fontSize: 12 }}>Erstellen Sie das erste LV für dieses Objekt</div>
          <button style={{ ...btnPrimary, marginTop: 16 }} onClick={() => oeffneLVForm()}>+ Neues LV erstellen</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* LV Auswahl-Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {lvListe.map(lv => {
              const sc = STATUS_COLORS[lv.status] || STATUS_COLORS.Entwurf
              const isActive = aktivLV?.id === lv.id
              return (
                <div key={lv.id} onClick={() => setAktivLV(lv)}
                  style={{
                    border: isActive ? '2px solid #1a2a3a' : '1px solid #e8e2d9',
                    borderRadius: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: isActive ? '#1a2a3a' : 'white',
                    color: isActive ? 'white' : '#333',
                    minWidth: 160,
                    maxWidth: 240,
                    flex: '0 0 auto',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lv.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sc.bg, color: sc.color }}>{lv.status}</span>
                    {lv.datum && <span style={{ fontSize: 10, opacity: 0.7 }}>{new Date(lv.datum).toLocaleDateString('de-AT')}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Aktives LV */}
          {aktivLV && (
            <div>
              {/* LV Header */}
              <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#1a2a3a' }}>{aktivLV.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: (STATUS_COLORS[aktivLV.status] || STATUS_COLORS.Entwurf).bg, color: (STATUS_COLORS[aktivLV.status] || STATUS_COLORS.Entwurf).color }}>
                        {aktivLV.status}
                      </span>
                    </div>
                    {aktivLV.beschreibung && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{aktivLV.beschreibung}</div>}
                    {aktivLV.datum && <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(aktivLV.datum).toLocaleDateString('de-AT')}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button style={{ ...btnSecondary, fontSize: 12 }} onClick={() => oeffneLVForm(aktivLV)}>Bearbeiten</button>
                    <button style={{ ...btnSecondary, fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => loescheLV(aktivLV.id)}>Löschen</button>
                    <button style={{ ...btnSecondary, fontSize: 12 }} onClick={drucken} disabled={pdfLaden}>🖨 Drucken</button>
                    <button style={{ ...btnPrimary, fontSize: 12 }} onClick={downloadPDF} disabled={pdfLaden}>
                      {pdfLaden ? 'Laden...' : '⬇ PDF'}
                    </button>
                  </div>
                </div>
              </div>

              {ladenDetails ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>Lade Positionen...</div>
              ) : (
                <>
                  {/* Gewerke */}
                  {gewerke.map(g => {
                    const posListe = positionen.filter(p => p.gewerkeId === g.id)
                    const gewerkSum = posListe.reduce((s, p) => {
                      const edit = posEdit[p.id]
                      return s + (edit && 'gesamtpreis' in edit ? Number(edit.gesamtpreis) : Number(p.gesamtpreis || 0))
                    }, 0)
                    const isCollapsed = gewerkeCollapsed[g.id]
                    return (
                      <div key={g.id} style={{ ...cardStyle, marginBottom: 12 }}>
                        {/* Gewerk-Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8f6f2', borderBottom: '1px solid #e8e2d9', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => setGewerkeCollapsed(prev => ({ ...prev, [g.id]: !prev[g.id] }))}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span style={{ fontSize: 14, color: '#999' }}>{isCollapsed ? '▶' : '▼'}</span>
                            {gewerkEditId === g.id ? (
                              <input
                                value={gewerkEditName}
                                onChange={e => setGewerkEditName(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onBlur={() => speicherGewerkName(g.id)}
                                onKeyDown={e => { if (e.key === 'Enter') speicherGewerkName(g.id) }}
                                style={{ ...inputSm, fontSize: 14, fontWeight: 700, flex: 1 }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2a3a' }}
                                onDoubleClick={e => { e.stopPropagation(); setGewerkEditId(g.id); setGewerkEditName(g.name) }}>
                                {g.name}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#888' }}>({posListe.length} Pos.)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1a2a3a' }}>€ {fmt(gewerkSum)}</span>
                            <button style={btnDanger} onClick={e => { e.stopPropagation(); loescheGewerk(g.id) }} title="Gewerk löschen">✕</button>
                          </div>
                        </div>

                        {/* Positionen */}
                        {!isCollapsed && (
                          <div>
                            {posListe.length > 0 && (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                                  <thead>
                                    <tr style={{ background: '#2c3e50' }}>
                                      {['Pos-Nr', 'Bezeichnung', 'Einheit', 'Menge', 'EP €/Einheit', 'GP €', ''].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'GP €' || h === 'EP €/Einheit' || h === 'Menge' ? 'right' : 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {posListe.map((pos, idx) => (
                                      <tr key={pos.id} style={{ background: idx % 2 === 0 ? 'white' : '#fdfcfb' }}>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 70 }}>
                                          <input
                                            value={String(getPosWert(pos, 'posNr'))}
                                            onChange={e => aktualisierePosEdit(pos.id, 'posNr', e.target.value)}
                                            onBlur={() => speicherePosition(pos)}
                                            style={{ ...inputSm, width: 55, textAlign: 'center' }}
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle' }}>
                                          <textarea
                                            value={String(getPosWert(pos, 'bezeichnung'))}
                                            onChange={e => aktualisierePosEdit(pos.id, 'bezeichnung', e.target.value)}
                                            onBlur={() => speicherePosition(pos)}
                                            rows={2}
                                            style={{ ...inputSm, width: '100%', minWidth: 180, resize: 'vertical', fontSize: 12 }}
                                            placeholder="Beschreibung der Leistung..."
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 80 }}>
                                          <select
                                            value={String(getPosWert(pos, 'einheit'))}
                                            onChange={e => { aktualisierePosEdit(pos.id, 'einheit', e.target.value); setTimeout(() => speicherePosition({ ...pos, einheit: e.target.value }), 50) }}
                                            style={{ ...inputSm, width: 70 }}>
                                            {EINHEITEN.map(e => <option key={e}>{e}</option>)}
                                          </select>
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 90 }}>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={getPosWert(pos, 'menge') ?? ''}
                                            onChange={e => aktualisierePosEdit(pos.id, 'menge', e.target.value)}
                                            onBlur={e => { const v = parseFloat(e.target.value.replace(',', '.')) || 0; aktualisierePosEdit(pos.id, 'menge', v); setTimeout(() => speicherePosition(pos), 0) }}
                                            onFocus={e => e.target.select()}
                                            style={{ ...inputSm, width: 80, textAlign: 'right' }}
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 110 }}>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={getPosWert(pos, 'einheitspreis') ?? ''}
                                            onChange={e => aktualisierePosEdit(pos.id, 'einheitspreis', e.target.value)}
                                            onBlur={e => { const v = parseFloat(e.target.value.replace(',', '.')) || 0; aktualisierePosEdit(pos.id, 'einheitspreis', v); setTimeout(() => speicherePosition(pos), 0) }}
                                            onFocus={e => e.target.select()}
                                            style={{ ...inputSm, width: 100, textAlign: 'right' }}
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 100, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#1a2a3a', whiteSpace: 'nowrap' }}>
                                          € {fmt(Number(getPosWert(pos, 'gesamtpreis')))}
                                        </td>
                                        <td style={{ padding: '6px 10px', verticalAlign: 'middle', width: 40, textAlign: 'center' }}>
                                          <button style={btnDanger} onClick={() => loeschePosition(pos.id)} title="Position löschen">✕</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Gewerk-Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#faf9f7', borderTop: posListe.length > 0 ? '1px solid #e8e2d9' : 'none' }}>
                              <button style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px' }}
                                onClick={() => fuegePositionHinzu(g.id)}>
                                + Position hinzufügen
                              </button>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a2a3a' }}>
                                Summe: <span style={{ color: '#c8a96e' }}>€ {fmt(gewerkSum)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Gewerk hinzufügen */}
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <button style={{ ...btnSecondary, width: '100%', textAlign: 'center' }}
                      onClick={() => setGewerkDropdownOffen(v => !v)}>
                      + Gewerk hinzufügen
                    </button>
                    {gewerkDropdownOffen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: 'white', border: '1px solid #e8e2d9', borderRadius: 10,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '8px 0', maxHeight: 320, overflowY: 'auto',
                        marginTop: 4,
                      }}>
                        {STANDARD_GEWERKE.map(name => (
                          <div key={name}
                            style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#333', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8f6f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => fuegeGewerkHinzu(name)}>
                            {name}
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid #e8e2d9', margin: '6px 0' }} />
                        {eigeneGewerkEingabe ? (
                          <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                            <input
                              autoFocus
                              value={eigeneGewerkName}
                              onChange={e => setEigeneGewerkName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && eigeneGewerkName.trim()) {
                                  fuegeGewerkHinzu(eigeneGewerkName.trim())
                                  setEigeneGewerkName('')
                                  setEigeneGewerkEingabe(false)
                                }
                                if (e.key === 'Escape') { setEigeneGewerkEingabe(false); setEigeneGewerkName('') }
                              }}
                              placeholder="Eigene Bezeichnung..."
                              style={{ flex: 1, padding: '6px 10px', border: '1px solid #c8a96e', borderRadius: 6, fontSize: 13, outline: 'none' }}
                            />
                            <button
                              onClick={() => {
                                if (eigeneGewerkName.trim()) {
                                  fuegeGewerkHinzu(eigeneGewerkName.trim())
                                  setEigeneGewerkName('')
                                  setEigeneGewerkEingabe(false)
                                }
                              }}
                              style={{ padding: '6px 12px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                              ✓
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#c8a96e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={e => { e.stopPropagation(); setEigeneGewerkEingabe(true) }}>
                            ✏️ Eigene Bezeichnung eingeben
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gesamtkalkulation */}
                  {gewerke.length > 0 && (
                    <div style={{ ...cardStyle, padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1a2a3a', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>Gesamtkalkulation</div>
                      <div style={{ maxWidth: 320, marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
                          <span style={{ color: '#666' }}>Nettobetrag:</span>
                          <span style={{ fontWeight: 600 }}>€ {fmt(grandTotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#888' }}>
                          <span>MwSt 19%:</span>
                          <span>€ {fmt(mwst)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#1a2a3a', borderRadius: 8, marginTop: 8, fontSize: 15 }}>
                          <span style={{ color: 'white', fontWeight: 700 }}>Gesamtbetrag brutto:</span>
                          <span style={{ color: '#c8a96e', fontWeight: 800 }}>€ {fmt(brutto)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Materialien */}
                  <div style={{ ...cardStyle, padding: '20px 24px', marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2a3a', fontFamily: 'Syne, sans-serif' }}>🔩 Materialien & Produkte</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Hersteller, Artikel, Mengen und Preise</div>
                      </div>
                      <button onClick={fuegeMaterialHinzu} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12 }}>+ Material hinzufügen</button>
                    </div>

                    {materialien.length === 0 ? (
                      <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Noch keine Materialien erfasst</div>
                    ) : (
                      <>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 90px 80px 70px 90px 90px 36px 36px', gap: 6, padding: '6px 4px', borderBottom: '2px solid #e8e2d9', marginBottom: 4 }}>
                          {['Hersteller', 'Artikel / Bezeichnung', 'Art.-Nr.', 'Einheit', 'Menge', 'EP (€)', 'GP (€)', '', ''].map((h, i) => (
                            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                          ))}
                        </div>
                        {materialien.map(m => (
                          <div key={m.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                            {/* Main row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 90px 80px 70px 90px 90px 36px 36px', gap: 6, padding: '6px 0', alignItems: 'center' }}>
                              {/* Hersteller */}
                              <div>
                                <input
                                  list={`hersteller-list-${m.id}`}
                                  value={m.hersteller || ''}
                                  onChange={e => aktualisiereM(m.id, 'hersteller', e.target.value)}
                                  onBlur={() => speicherMaterial(m)}
                                  placeholder="Hersteller..."
                                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' as const }}
                                />
                                <datalist id={`hersteller-list-${m.id}`}>
                                  {['Hornbach', 'OBI', 'Bauhaus', 'Hagebau', 'Würth', 'Knauf', 'Rigips', 'Mapei', 'Weber', 'Schüco', 'Velux', 'Isover', 'Rockwool', 'Sika', 'Baumit', 'Roto', 'Geberit', 'Viessmann', 'Buderus', 'Bosch', 'Siemens', 'Miele', 'Grohe', 'Hansgrohe'].map(h => <option key={h} value={h} />)}
                                </datalist>
                              </div>
                              <input value={m.artikel || ''} onChange={e => aktualisiereM(m.id, 'artikel', e.target.value)} onBlur={() => speicherMaterial(m)} placeholder="Artikel / Bezeichnung..." style={{ padding: '5px 8px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12 }} />
                              <input value={m.artikelnummer || ''} onChange={e => aktualisiereM(m.id, 'artikelnummer', e.target.value)} onBlur={() => speicherMaterial(m)} placeholder="Art.-Nr." style={{ padding: '5px 8px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12 }} />
                              <select value={m.einheit || 'Stk'} onChange={e => { const v = e.target.value; aktualisiereM(m.id, 'einheit', v); setTimeout(() => speicherMaterial({ ...m, einheit: v }), 0) }} style={{ padding: '5px 6px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12 }}>
                                {['Stk', 'm²', 'm³', 'm', 'lfm', 'Psch', 'kg', 't', 'l', 'Pkg', 'Rll'].map(e => <option key={e} value={e}>{e}</option>)}
                              </select>
                              <input type="text" inputMode="decimal" value={m.menge ?? ''} onChange={e => aktualisiereM(m.id, 'menge', e.target.value)} onBlur={e => { const v = parseFloat(e.target.value.replace(',','.')) || 0; aktualisiereM(m.id, 'menge', v); setTimeout(() => speicherMaterial(m), 0) }} onFocus={e => e.target.select()} placeholder="0" style={{ padding: '5px 8px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12, textAlign: 'right' as const }} />
                              <input type="text" inputMode="decimal" value={m.einheitspreis ?? ''} onChange={e => aktualisiereM(m.id, 'einheitspreis', e.target.value)} onBlur={e => { const v = parseFloat(e.target.value.replace(',','.')) || 0; aktualisiereM(m.id, 'einheitspreis', v); setTimeout(() => speicherMaterial(m), 0) }} onFocus={e => e.target.select()} placeholder="0,00" style={{ padding: '5px 8px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12, textAlign: 'right' as const }} />
                              <div style={{ padding: '5px 8px', fontSize: 12, fontWeight: 600, color: '#1a2a3a', textAlign: 'right' as const }}>€ {fmt((parseFloat(m.menge)||0) * (parseFloat(m.einheitspreis)||0))}</div>
                              {/* Expand toggle */}
                              <button
                                onClick={() => setMaterialExpanded(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                title={materialExpanded[m.id] ? 'Details schließen' : 'Link & Foto'}
                                style={{ background: materialExpanded[m.id] ? '#f0ede8' : 'none', border: '1px solid #e8e2d9', borderRadius: 6, cursor: 'pointer', fontSize: 14, padding: 0, width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {m.foto ? '🖼' : m.url ? '🔗' : '📎'}
                              </button>
                              {/* Delete */}
                              <button onClick={() => loescheMaterial(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e57373', fontSize: 16, padding: 0 }}>✕</button>
                            </div>

                            {/* Expanded details row */}
                            {materialExpanded[m.id] && (
                              <div style={{ background: '#fdfcfb', borderRadius: 8, padding: '12px 16px', marginBottom: 6, border: '1px solid #ede8e0', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                                {/* URL */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>🔗 Link / Internetseite</div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input
                                      value={m.url || ''}
                                      onChange={e => aktualisiereM(m.id, 'url', e.target.value)}
                                      onBlur={() => speicherMaterial(m)}
                                      placeholder="https://www.hornbach.at/produkt/..."
                                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12 }}
                                    />
                                    {m.url && (
                                      <a href={m.url} target="_blank" rel="noopener noreferrer"
                                        style={{ padding: '6px 10px', background: '#1a2a3a', color: 'white', borderRadius: 6, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                                        🔗 Öffnen
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Photo */}
                                <div style={{ minWidth: 160 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>📷 Foto (Preisschild, Angebot)</div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {m.foto ? (
                                      <>
                                        <img src={m.foto} alt="Produktfoto" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e2d9', cursor: 'pointer' }} onClick={() => window.open(m.foto, '_blank')} />
                                        <button onClick={() => { aktualisiereM(m.id, 'foto', ''); speicherMaterial({ ...m, foto: '' }) }}
                                          style={{ fontSize: 11, color: '#e57373', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ entfernen</button>
                                      </>
                                    ) : (
                                      <button onClick={() => fotoHochladen(m.id)}
                                        style={{ padding: '8px 14px', background: '#f0ede8', border: '1px solid #e8e2d9', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#555' }}>
                                        📷 Foto hochladen
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Materialien Total */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTop: '2px solid #e8e2d9' }}>
                          <span style={{ fontSize: 13, color: '#666' }}>Materialkosten gesamt:</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2a3a' }}>€ {fmt(materialien.reduce((s, m) => s + (parseFloat(m.menge)||0)*(parseFloat(m.einheitspreis)||0), 0))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click-outside für Dropdown */}
      {gewerkDropdownOffen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setGewerkDropdownOffen(false); setEigeneGewerkEingabe(false); setEigeneGewerkName('') }} />
      )}
    </div>
  )
}
