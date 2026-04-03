import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import api from '../services/api'

interface Projekt {
  id: number
  name: string
  kundeId?: number
  vorname?: string
  nachname?: string
  firma?: string
  stundensatz: number
  beschreibung: string
  status: string
  gesamt_stunden: number
}

interface Eintrag {
  id: number
  datum: string
  beschreibung: string
  stunden: number
}

interface Kunde {
  id: number
  vorname: string
  nachname: string
  firma?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e0d8',
  borderRadius: 7, fontFamily: 'DM Sans, sans-serif', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', background: 'white'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 5
}

export default function Stunden({ onNavigate }: { onNavigate?: (seite: string) => void } = {}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [aktivProjekt, setAktivProjekt] = useState<Projekt | null>(null)
  const [logoBase64, setLogoBase64] = useState('')
  const [firmaName, setFirmaName] = useState('')
  const [eintraege, setEintraege] = useState<Eintrag[]>([])
  const [formOffen, setFormOffen] = useState(false)
  const [eintragFormOffen, setEintragFormOffen] = useState(false)
  const [bearbeitenEintragId, setBearbeitenEintragId] = useState<number | null>(null)

  // Projekt-Formular
  const [pName, setPName] = useState('')
  const [pKunde, setPKunde] = useState<number | ''>('')
  const [pSatz, setPSatz] = useState('')
  const [pBeschreibung, setPBeschreibung] = useState('')
  const [bearbeitenProjektId, setBearbeitenProjektId] = useState<number | null>(null)

  // Eintrag-Formular
  const [eDatum, setEDatum] = useState(new Date().toISOString().split('T')[0])
  const [eBeschreibung, setEBeschreibung] = useState('')
  const [eStunden, setEStunden] = useState('')

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { ladeProjekte(); ladeKunden(); ladeEinstellungen() }, [])
  useEffect(() => { if (aktivProjekt) ladeEintraege(aktivProjekt.id) }, [aktivProjekt])

  const ladeEinstellungen = async () => {
    try {
      const r = await api.get('/einstellungen')
      setLogoBase64(r.data.logoBase64 || '')
      setFirmaName(r.data.firma || '')
    } catch {}
  }

  const ladeProjekte = async () => {
    try { const r = await api.get('/stunden/projekte'); setProjekte(r.data) } catch {}
  }
  const ladeKunden = async () => {
    try { const r = await api.get('/kunden'); setKunden(r.data) } catch {}
  }
  const ladeEintraege = async (pid: number) => {
    try { const r = await api.get(`/stunden/eintraege?projektId=${pid}`); setEintraege(r.data) } catch {}
  }

  const projektSpeichern = async () => {
    if (!pName.trim()) return alert('Projektname ist pflicht')
    const daten = { name: pName, kundeId: pKunde || null, stundensatz: parseFloat(pSatz) || 0, beschreibung: pBeschreibung }
    try {
      if (bearbeitenProjektId) {
        await api.put(`/stunden/projekte/${bearbeitenProjektId}`, daten)
      } else {
        await api.post('/stunden/projekte', daten)
      }
      setFormOffen(false); setPName(''); setPKunde(''); setPSatz(''); setPBeschreibung(''); setBearbeitenProjektId(null)
      await ladeProjekte()
    } catch (e: any) { alert('Fehler: ' + (e?.response?.data?.fehler || e.message)) }
  }

  const projektBearbeiten = (p: Projekt) => {
    setBearbeitenProjektId(p.id); setPName(p.name); setPKunde(p.kundeId || ''); setPSatz(p.stundensatz > 0 ? String(p.stundensatz) : ''); setPBeschreibung(p.beschreibung || ''); setFormOffen(true)
  }

  const projektLoeschen = async (id: number) => {
    if (!window.confirm('Projekt und alle Einträge löschen?')) return
    await api.delete(`/stunden/projekte/${id}`)
    if (aktivProjekt?.id === id) setAktivProjekt(null)
    ladeProjekte()
  }

  const eintragSpeichern = async () => {
    if (!aktivProjekt) return
    if (!eStunden || parseFloat(eStunden) <= 0) return alert('Bitte Stunden eingeben')
    const daten = { projektId: aktivProjekt.id, datum: eDatum, beschreibung: eBeschreibung, stunden: parseFloat(eStunden) }
    try {
      if (bearbeitenEintragId) {
        await api.put(`/stunden/eintraege/${bearbeitenEintragId}`, daten)
      } else {
        await api.post('/stunden/eintraege', daten)
      }
      setEintragFormOffen(false); setEDatum(new Date().toISOString().split('T')[0]); setEBeschreibung(''); setEStunden(''); setBearbeitenEintragId(null)
      ladeEintraege(aktivProjekt.id); ladeProjekte()
    } catch (e: any) { alert('Fehler: ' + (e?.response?.data?.fehler || e.message)) }
  }

  const eintragBearbeiten = (e: Eintrag) => {
    setBearbeitenEintragId(e.id); setEDatum(e.datum.split('T')[0]); setEBeschreibung(e.beschreibung); setEStunden(String(e.stunden)); setEintragFormOffen(true)
  }

  const eintragLoeschen = async (id: number) => {
    if (!window.confirm('Eintrag löschen?')) return
    await api.delete(`/stunden/eintraege/${id}`)
    if (aktivProjekt) ladeEintraege(aktivProjekt.id)
    ladeProjekte()
  }

  const buildDruckHtml = () => {
    if (!aktivProjekt) return ''
    const p = aktivProjekt
    const kundenName = p.firma || (p.vorname ? `${p.vorname} ${p.nachname}` : '')
    const gesamtStd = eintraege.reduce((s, e) => s + Number(e.stunden), 0)
    const gesamtBet = p.stundensatz > 0 ? gesamtStd * p.stundensatz : null
    const fmt = (n: number) => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="Logo" style="max-width:280px;max-height:110px;object-fit:contain;object-position:left center;" />`
      : `<div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">${firmaName || 'Stundenliste'}</div>`

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>Stundenliste – ${p.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: white; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
  .projekt-info { text-align: right; }
  .projekt-name { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .projekt-sub { font-size: 12px; color: #888; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f8f6f2; padding: 9px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 700; border-bottom: 1px solid #e5e0d8; }
  th.right, td.right { text-align: right; white-space: nowrap; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0ede8; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .totals { border-top: 2px solid #1a1a1a; padding-top: 16px; display: flex; justify-content: flex-end; gap: 40px; }
  .total-item { text-align: right; }
  .total-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
  .total-value { font-size: 20px; font-weight: 800; }
  .total-value.betrag { color: #c8a96e; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e0d8; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
  @media print { body { padding: 20px; } @page { margin: 1.5cm; } }
</style>
</head><body>
<div class="header">
  <div>${logoHtml}</div>
  <div class="projekt-info">
    <div class="projekt-name">${p.name}</div>
    ${kundenName ? `<div class="projekt-sub">Kunde: ${kundenName}</div>` : ''}
    <div class="projekt-sub">Ausgedruckt: ${new Date().toLocaleDateString('de-AT')}</div>
  </div>
</div>
${p.beschreibung ? `<div style="margin-bottom:20px;padding:12px 16px;background:#f8f6f2;border-radius:8px;font-size:12px;color:#555;">${p.beschreibung}</div>` : ''}
<h2>Stundennachweis</h2>
<table>
  <thead><tr>
    <th>Datum</th><th>Beschreibung</th><th class="right">Stunden</th>
    ${p.stundensatz > 0 ? '<th class="right">Betrag</th>' : ''}
  </tr></thead>
  <tbody>
    ${eintraege.map(e => `<tr>
      <td style="white-space:nowrap">${new Date(e.datum).toLocaleDateString('de-AT')}</td>
      <td>${e.beschreibung || '—'}</td>
      <td class="right">${Number(e.stunden).toFixed(2).replace('.', ',')} h</td>
      ${p.stundensatz > 0 ? `<td class="right">€ ${fmt(Number(e.stunden) * p.stundensatz)}</td>` : ''}
    </tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <div class="total-item">
    <div class="total-label">Gesamt Stunden</div>
    <div class="total-value">${gesamtStd.toFixed(2).replace('.', ',')} h</div>
  </div>
  ${gesamtBet !== null ? `<div class="total-item">
    <div class="total-label">Gesamt Betrag</div>
    <div class="total-value betrag">€ ${fmt(gesamtBet)}</div>
  </div>` : ''}
</div>
<div class="footer">
  <span>${p.stundensatz > 0 ? `Stundensatz: € ${Number(p.stundensatz).toFixed(2).replace('.', ',')}` : ''}</span>
  <span>${firmaName}</span>
</div>
<script>window.onload = () => window.print()</script>
</body></html>`
  }

  const drucken = () => {
    const html = buildDruckHtml()
    if (!html) return
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const [pdfLaden, setPdfLaden] = useState(false)

  const pdfSpeichern = async () => {
    if (!aktivProjekt || pdfLaden) return
    setPdfLaden(true)
    try {
      const token = localStorage.getItem('token')
      const baseURL = (process.env.REACT_APP_API_URL || 'https://scanpro-backend-production.up.railway.app/api').replace(/\/$/, '')
      const res = await fetch(`${baseURL}/stunden/pdf/${aktivProjekt.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ fehler: `HTTP ${res.status}` }))
        throw new Error(err.fehler || `HTTP ${res.status}`)
      }
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/pdf')) {
        const text = await res.text()
        throw new Error('Kein PDF: ' + text.slice(0, 80))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Stundenliste-${aktivProjekt.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e: any) { alert('PDF-Fehler: ' + e.message) }
    finally { setPdfLaden(false) }
  }

  const gesamtStunden = eintraege.reduce((s, e) => s + Number(e.stunden), 0)
  const gesamtBetrag = aktivProjekt && aktivProjekt.stundensatz > 0 ? gesamtStunden * aktivProjekt.stundensatz : null

  return (
    <div style={{ padding: isMobile ? 12 : 28, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>⏱ Stundenliste</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Projekte anlegen · Stunden erfassen · Drucken</div>
        </div>
        <button onClick={() => { setBearbeitenProjektId(null); setPName(''); setPKunde(''); setPSatz(''); setPBeschreibung(''); setFormOffen(true) }}
          style={{ padding: '10px 20px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Neues Projekt
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Projektliste */}
        <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#888', fontWeight: 700, marginBottom: 10 }}>Projekte</div>
          {projekte.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13, background: 'white', borderRadius: 10, border: '1px solid #f0ede8' }}>
              Noch keine Projekte
            </div>
          )}
          {projekte.map(p => {
            const aktiv = aktivProjekt?.id === p.id
            const kundenName = p.firma || (p.vorname ? `${p.vorname} ${p.nachname}` : null)
            return (
              <div key={p.id} onClick={() => setAktivProjekt(p)}
                style={{ padding: '12px 14px', marginBottom: 8, borderRadius: 10, border: `1.5px solid ${aktiv ? '#c8a96e' : '#f0ede8'}`, background: aktiv ? '#fdf8f0' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: aktiv ? '#c8a96e' : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {kundenName && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{kundenName}</div>}
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {Number(p.gesamt_stunden).toFixed(2).replace('.', ',')} h
                      {p.stundensatz > 0 && ` · € ${(Number(p.gesamt_stunden) * p.stundensatz).toFixed(2).replace('.', ',')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); projektBearbeiten(p) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: '#888' }} title="Bearbeiten">✏️</button>
                    <button onClick={e => { e.stopPropagation(); projektLoeschen(p.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: '#888' }} title="Löschen">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Einträge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!aktivProjekt ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aaa', background: 'white', borderRadius: 12, border: '1px solid #f0ede8' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Projekt auswählen</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Klicke links auf ein Projekt um Stunden zu sehen</div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0ede8', overflow: 'hidden' }}>
              {/* Projekt-Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#faf8f5' }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>{aktivProjekt.name}</div>
                  {aktivProjekt.stundensatz > 0 && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Stundensatz: € {Number(aktivProjekt.stundensatz).toFixed(2)}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setBearbeitenEintragId(null); setEDatum(new Date().toISOString().split('T')[0]); setEBeschreibung(''); setEStunden(''); setEintragFormOffen(true) }}
                    style={{ padding: '8px 16px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                    + Eintrag
                  </button>
                  <button onClick={drucken}
                    style={{ padding: '8px 16px', background: '#f0ede8', color: '#555', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🖨 Drucken
                  </button>
                  <button onClick={pdfSpeichern} disabled={pdfLaden}
                    style={{ padding: '8px 16px', background: pdfLaden ? '#f0f0f0' : '#e8f5e9', color: pdfLaden ? '#aaa' : '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: pdfLaden ? 'default' : 'pointer' }}>
                    {pdfLaden ? '⏳ PDF...' : '💾 PDF'}
                  </button>
                  {onNavigate && (
                    <button onClick={() => { sessionStorage.setItem('stundenProjektId', String(aktivProjekt!.id)); onNavigate('Rechnungen') }}
                      style={{ padding: '8px 16px', background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      → Zu Rechnung
                    </button>
                  )}
                </div>
              </div>

              {/* Einträge Tabelle */}
              {eintraege.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  Noch keine Einträge — klicke "+ Eintrag"
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#faf8f5' }}>
                        {['Datum', 'Beschreibung', 'Stunden', aktivProjekt.stundensatz > 0 ? 'Betrag' : '', ''].map((h, i) => h && (
                          <th key={i} style={{ padding: '9px 14px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 700, borderBottom: '1px solid #e5e0d8', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {eintraege.map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f5f2ee' }}>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{new Date(e.datum).toLocaleDateString('de-AT')}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#1a1a1a' }}>{e.beschreibung || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{Number(e.stunden).toFixed(2).replace('.', ',')} h</td>
                          {aktivProjekt.stundensatz > 0 && (
                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>€ {(Number(e.stunden) * aktivProjekt.stundensatz).toFixed(2).replace('.', ',')}</td>
                          )}
                          <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={() => eintragBearbeiten(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 6px', color: '#888' }}>✏️</button>
                            <button onClick={() => eintragLoeschen(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 6px', color: '#aaa' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              {eintraege.length > 0 && (
                <div style={{ padding: '14px 20px', borderTop: '2px solid #e5e0d8', display: 'flex', justifyContent: 'flex-end', gap: 32, background: '#faf8f5' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 }}>Gesamt Stunden</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{gesamtStunden.toFixed(2).replace('.', ',')} h</div>
                  </div>
                  {gesamtBetrag !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 }}>Gesamt Betrag</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#c8a96e' }}>€ {gesamtBetrag.toFixed(2).replace('.', ',')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PROJEKT MODAL ── */}
      {formOffen && ReactDOM.createPortal((
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }} onClick={() => setFormOffen(false)} />
          <div style={{ position: 'fixed', zIndex: 10000, background: 'white', borderRadius: isMobile ? 0 : 14, width: isMobile ? '100vw' : 480, left: isMobile ? 0 : '50%', top: isMobile ? 0 : '50%', transform: isMobile ? 'none' : 'translate(-50%,-50%)', height: isMobile ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e0d8', display: 'flex', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, flex: 1 }}>{bearbeitenProjektId ? '✏️ Projekt bearbeiten' : '📁 Neues Projekt'}</div>
              <button onClick={() => setFormOffen(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Projektname *</label>
                <input style={inputStyle} value={pName} onChange={e => setPName(e.target.value)} placeholder="z.B. Renovierung Wohnung Wien" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Kunde</label>
                <select style={inputStyle} value={pKunde} onChange={e => setPKunde(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Kein Kunde</option>
                  {kunden.map(k => <option key={k.id} value={k.id}>{k.vorname} {k.nachname}{k.firma ? ` (${k.firma})` : ''}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Stundensatz (€)</label>
                <input style={inputStyle} type="number" value={pSatz} onChange={e => setPSatz(e.target.value)} placeholder="0.00 = kein Stundensatz" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Beschreibung / Notiz</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={pBeschreibung} onChange={e => setPBeschreibung(e.target.value)} placeholder="Optionale Beschreibung..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={projektSpeichern} style={{ flex: 1, padding: 13, background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✅ Speichern</button>
                <button onClick={() => setFormOffen(false)} style={{ padding: 13, background: '#f0ede8', color: '#888', border: 'none', borderRadius: 9, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </div>
          </div>
        </>
      ), document.body)}

      {/* ── EINTRAG MODAL ── */}
      {eintragFormOffen && ReactDOM.createPortal((
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }} onClick={() => setEintragFormOffen(false)} />
          <div style={{ position: 'fixed', zIndex: 10000, background: 'white', borderRadius: isMobile ? 0 : 14, width: isMobile ? '100vw' : 420, left: isMobile ? 0 : '50%', top: isMobile ? 0 : '50%', transform: isMobile ? 'none' : 'translate(-50%,-50%)', height: isMobile ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e0d8', display: 'flex', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, flex: 1 }}>{bearbeitenEintragId ? '✏️ Eintrag bearbeiten' : '⏱ Stunden eintragen'}</div>
              <button onClick={() => setEintragFormOffen(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Datum *</label>
                <input style={inputStyle} type="date" value={eDatum} onChange={e => setEDatum(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Beschreibung</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={eBeschreibung} onChange={e => setEBeschreibung(e.target.value)} placeholder="Was wurde gemacht?" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Stunden *</label>
                <input style={inputStyle} type="number" step="0.25" min="0.25" value={eStunden} onChange={e => setEStunden(e.target.value)} placeholder="z.B. 2.5" />
                {aktivProjekt?.stundensatz && eStunden && (
                  <div style={{ fontSize: 11, color: '#c8a96e', marginTop: 4 }}>
                    = € {(parseFloat(eStunden) * aktivProjekt.stundensatz).toFixed(2).replace('.', ',')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={eintragSpeichern} style={{ flex: 1, padding: 13, background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✅ Speichern</button>
                <button onClick={() => setEintragFormOffen(false)} style={{ padding: 13, background: '#f0ede8', color: '#888', border: 'none', borderRadius: 9, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </div>
          </div>
        </>
      ), document.body)}
    </div>
  )
}
