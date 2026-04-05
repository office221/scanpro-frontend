import React, { useState, useEffect } from 'react'
import api from '../services/api'

const GOLD  = '#c8a96e'
const GRUEN = '#10b981'
const ROT   = '#ef4444'
const BLAU  = '#6366f1'

interface GuvEintrag {
  id: number
  jahr: number
  datum: string
  bezeichnung: string
  kategorie: string
  typ: 'einnahme' | 'ausgabe'
  brutto: number
  netto: number
  mwst_betrag: number
  quelle: string
  quelle_id?: number
}

interface DateiModal { url: string; typ: string; name: string }

interface BelegDetail {
  eintrag: GuvEintrag
  extra?: {
    lieferant?: string
    rechnungsnummer?: string
    notiz?: string
    dateiname?: string
    datei_typ?: string
    buero_anteil?: number
    betrag_gesamt?: number
  }
}

const fmt = (n: number) =>
  n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function GUV() {
  const aktuellesJahr = new Date().getFullYear()
  const [jahr, setJahr]       = useState(aktuellesJahr)
  const [jahre, setJahre]     = useState<number[]>([aktuellesJahr])
  const [eintraege, setEintraege] = useState<GuvEintrag[]>([])
  const [laden, setLaden]     = useState(false)
  const [filter, setFilter]     = useState<'alle' | 'einnahme' | 'ausgabe'>('alle')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [dateiModal, setDateiModal] = useState<DateiModal | null>(null)
  const [dateiLaden, setDateiLaden] = useState(false)
  const [detailModal, setDetailModal] = useState<BelegDetail | null>(null)

  const [detailDateiUrl, setDetailDateiUrl] = useState<string | null>(null)
  const [dateiLadenFertig, setDateiLadenFertig] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ text: string; onJa: () => void } | null>(null)

  const [reiseDetail, setReiseDetail] = useState<any | null>(null)

  // Diagramm
  const [diagrammAnsicht, setDiagrammAnsicht] = useState<'jahr' | 'monat'>('jahr')
  const [diagrammMonat, setDiagrammMonat]     = useState<number>(new Date().getMonth() + 1)
  const [hoveredBar, setHoveredBar]           = useState<number | null>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { ladeJahre() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ladeEintraege() }, [jahr]) // eslint-disable-line react-hooks/exhaustive-deps

  const ladeJahre = async () => {
    try {
      const res = await api.get('/guv/jahre')
      const j: number[] = res.data
      // Immer die letzten 3 Jahre + aktuelles Jahr anzeigen
      for (let y = aktuellesJahr; y >= aktuellesJahr - 2; y--) {
        if (!j.includes(y)) j.push(y)
      }
      setJahre(j.sort((a, b) => b - a))
    } catch {}
  }

  const ladeEintraege = async () => {
    setLaden(true)
    try {
      const res = await api.get(`/guv?jahr=${jahr}`)
      setEintraege(res.data)
    } catch {}
    setLaden(false)
  }

  const loeschen = (id: number) => {
    setConfirmModal({
      text: 'Möchten Sie diesen G&V-Eintrag wirklich entfernen?',
      onJa: async () => {
        setConfirmModal(null)
        await api.delete(`/guv/${id}`)
        await ladeEintraege()
      }
    })
  }

  const dateiOeffnen = async (e: GuvEintrag) => {
    if (!e.quelle_id) return
    setDateiLaden(true)
    try {
      let res
      if (e.quelle === 'beleg') {
        // Belegscanner: hochgeladene Datei (PDF oder Bild)
        res = await api.get(`/belege/${e.quelle_id}/datei`, { responseType: 'blob' })
      } else if (e.quelle === 'rechnung') {
        // Rechnung: generierte PDF
        res = await api.get(`/pdf/${e.quelle_id}`, { responseType: 'blob' })
      } else if (e.quelle === 'reisekosten') {
        // Reisekosten: Detailkarte anzeigen (keine Datei, aber strukturierte Daten)
        setDateiLaden(false)
        const rRes = await api.get(`/reisekosten/${e.quelle_id}`)
        setReiseDetail(rRes.data)
        return
      } else {
        throw new Error('Keine Datei verfügbar')
      }
      const blobUrl = URL.createObjectURL(res.data)
      const typ = res.data.type || 'application/pdf'
      setDateiModal({ url: blobUrl, typ, name: e.bezeichnung || 'Beleg' })
    } catch {
      alert('Kein Dateianhang für diesen Eintrag vorhanden.')
    }
    setDateiLaden(false)
  }

  const dateiSchliessen = () => {
    if (dateiModal) URL.revokeObjectURL(dateiModal.url)
    setDateiModal(null)
  }

  const dateiDrucken = () => {
    if (!dateiModal) return
    const win = window.open('', '_blank')
    if (!win) return
    if (dateiModal.typ === 'application/pdf') {
      win.document.write(`<html><body style="margin:0"><embed src="${dateiModal.url}" type="application/pdf" width="100%" height="100%" /></body></html>`)
      setTimeout(() => win.print(), 800)
    } else {
      win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${dateiModal.url}" style="max-width:100%;max-height:100vh;object-fit:contain" onload="window.print()" /></body></html>`)
    }
  }

  const dateiHerunterladen = () => {
    if (!dateiModal) return
    const a = document.createElement('a')
    a.href = dateiModal.url
    a.download = dateiModal.name
    a.click()
  }

  const detailOeffnen = async (e: GuvEintrag) => {
    setDetailDateiUrl(null)
    setDateiLadenFertig(false)
    setDetailModal({ eintrag: e, extra: {} })

    // ── 1. Extra-Infos laden (getrennt vom Datei-Laden!) ──
    let extra: BelegDetail['extra'] = {}
    if (e.quelle === 'beleg' && e.quelle_id) {
      try {
        const res = await api.get(`/belege/${e.quelle_id}`)
        const b = res.data
        extra = {
          lieferant: b.lieferant,
          rechnungsnummer: b.rechnungsnummer,
          notiz: b.notiz,
          dateiname: b.dateiname,
          datei_typ: b.datei_typ,
          buero_anteil: b.buero_anteil != null ? Number(b.buero_anteil) : undefined,
          betrag_gesamt: b.betrag != null ? Number(b.betrag) : undefined,
        }
        setDetailModal({ eintrag: e, extra })
      } catch { /* Beleg-Metadaten nicht geladen */ }

      // ── 2. Datei laden – IMMER versuchen, unabhängig von Schritt 1 ──
      try {
        const dateiRes = await api.get(`/belege/${e.quelle_id}/datei`, { responseType: 'blob' })
        setDetailDateiUrl(URL.createObjectURL(dateiRes.data))
      } catch { /* keine Datei */ }

    } else if (e.quelle === 'rechnung' && e.quelle_id) {
      try {
        const dateiRes = await api.get(`/pdf/${e.quelle_id}`, { responseType: 'blob' })
        extra = { datei_typ: 'application/pdf', dateiname: `${e.bezeichnung}.pdf` }
        setDetailModal({ eintrag: e, extra })
        setDetailDateiUrl(URL.createObjectURL(dateiRes.data))
      } catch { /* kein PDF */ }
    }

    setDateiLadenFertig(true)
  }

  const detailSchliessen = () => {
    if (detailDateiUrl) URL.revokeObjectURL(detailDateiUrl)
    setDetailDateiUrl(null)
    setDateiLadenFertig(false)
    setDetailModal(null)
  }

  // ── Berechnungen ──────────────────────────────────────────────────────────
  const einnahmen = eintraege.filter(e => e.typ === 'einnahme')
  const ausgaben  = eintraege.filter(e => e.typ === 'ausgabe')

  const sumEBrutto = einnahmen.reduce((s, e) => s + Number(e.brutto), 0)
  const sumENetto  = einnahmen.reduce((s, e) => s + Number(e.netto),  0)
  const sumEMwst   = einnahmen.reduce((s, e) => s + Number(e.mwst_betrag), 0)
  const sumABrutto = ausgaben.reduce((s, e)  => s + Number(e.brutto), 0)
  const sumANetto  = ausgaben.reduce((s, e)  => s + Number(e.netto),  0)
  const sumAMwst   = ausgaben.reduce((s, e)  => s + Number(e.mwst_betrag), 0)

  const gewinnNetto  = sumENetto  - sumANetto
  const gewinnBrutto = sumEBrutto - sumABrutto
  const mwstSaldo    = sumEMwst   - sumAMwst

  const gefiltert = filter === 'alle'
    ? [...eintraege].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
    : eintraege.filter(e => e.typ === filter)

  const ausgabenNachKat = ausgaben.reduce((acc, e) => {
    const k = e.kategorie || 'Sonstiges'
    acc[k] = (acc[k] || 0) + Number(e.brutto)
    return acc
  }, {} as Record<string, number>)

  // ── Export-Funktionen ───────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Datum','Bezeichnung','Kategorie','Typ','Brutto €','Netto €','MwSt €','Quelle']
    const rows = gefiltert.map(e => [
      e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '',
      e.bezeichnung, e.kategorie,
      e.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
      fmt(Number(e.brutto)), fmt(Number(e.netto)), fmt(Number(e.mwst_betrag)),
      e.quelle || '',
    ])
    rows.push([])
    rows.push(['GESAMT','','','',fmt(gewinnBrutto),fmt(gewinnNetto),fmt(mwstSaldo),''])
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `G&V-${jahr}.csv`
    a.click()
  }

  const drucken = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const gewinn = gewinnBrutto
    win.document.write(`
      <html><head><title>G&V ${jahr}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; padding: 24px; color: #1a2a3a; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #888; font-size: 11px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .sbox { padding: 12px; border-radius: 8px; }
        .slabel { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .sbetrag { font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a2a3a; color: white; padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0ece4; vertical-align: top; font-size: 10px; }
        tr:nth-child(even) td { background: #fafaf8; }
        .r { text-align: right; }
        .ein { color: #059669; font-weight: bold; }
        .aus { color: #dc2626; font-weight: bold; }
        .total td { font-weight: bold; background: #f0ece4 !important; border-top: 2px solid #1a2a3a; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>📊 G&amp;V Abrechnung ${jahr}</h1>
      <div class="meta">Erstellt: ${new Date().toLocaleDateString('de-AT')} &nbsp;·&nbsp; ${gefiltert.length} Einträge &nbsp;·&nbsp; Filter: ${filter === 'alle' ? 'Alle' : filter === 'einnahme' ? 'Einnahmen' : 'Ausgaben'}</div>
      <div class="summary">
        <div class="sbox" style="background:#f0fdf4;border:1px solid #bbf7d0">
          <div class="slabel">↑ Einnahmen (Brutto)</div>
          <div class="sbetrag" style="color:#059669">€ ${fmt(sumEBrutto)}</div>
        </div>
        <div class="sbox" style="background:#fff5f5;border:1px solid #fecaca">
          <div class="slabel">↓ Ausgaben (Brutto)</div>
          <div class="sbetrag" style="color:#dc2626">€ ${fmt(sumABrutto)}</div>
        </div>
        <div class="sbox" style="background:#fdf8f0;border:1px solid #e8c98e">
          <div class="slabel">${gewinn >= 0 ? '✅ Gewinn' : '❌ Verlust'}</div>
          <div class="sbetrag" style="color:${gewinn >= 0 ? '#854d0e' : '#dc2626'}">€ ${fmt(Math.abs(gewinn))}</div>
        </div>
        <div class="sbox" style="background:#f0f0fe;border:1px solid #c7d2fe">
          <div class="slabel">MwSt-Saldo</div>
          <div class="sbetrag" style="color:#4338ca">€ ${fmt(mwstSaldo)}</div>
        </div>
      </div>
      <table>
        <tr><th>Datum</th><th>Bezeichnung</th><th>Kategorie</th><th>Typ</th><th class="r">Netto €</th><th class="r">MwSt €</th><th class="r">Brutto €</th><th>Quelle</th></tr>
        ${gefiltert.map(e => `
          <tr>
            <td>${e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '—'}</td>
            <td>${e.bezeichnung}</td>
            <td>${e.kategorie}</td>
            <td class="${e.typ === 'einnahme' ? 'ein' : 'aus'}">${e.typ === 'einnahme' ? '↑ Einnahme' : '↓ Ausgabe'}</td>
            <td class="r">€ ${fmt(Number(e.netto))}</td>
            <td class="r">€ ${fmt(Number(e.mwst_betrag))}</td>
            <td class="r"><strong>€ ${fmt(Number(e.brutto))}</strong></td>
            <td style="color:#aaa;font-size:9px">${e.quelle || ''}</td>
          </tr>`).join('')}
        <tr class="total">
          <td colspan="4">GESAMT</td>
          <td class="r">€ ${fmt(gewinnNetto)}</td>
          <td class="r">€ ${fmt(mwstSaldo)}</td>
          <td class="r">€ ${fmt(gewinn)}</td>
          <td></td>
        </tr>
      </table>
      <div style="margin-top:20px;font-size:9px;color:#aaa">Erstellt mit BelegFix · § 4 Abs. 3 EStG Österreich</div>
      </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // ── Jahresabschluss PDF ─────────────────────────────────────────────────────
  const jahresabschlussPDF = () => {
    const win = window.open('', '_blank')
    if (!win) return

    // Kategorien-Zusammenfassung
    const einnahmenNachKat = einnahmen.reduce((acc, e) => {
      const k = e.kategorie || 'Sonstiges'
      acc[k] = (acc[k] || 0) + Number(e.brutto)
      return acc
    }, {} as Record<string, number>)

    const ausgabenNachKatDetail = ausgaben.reduce((acc, e) => {
      const k = e.kategorie || 'Sonstiges'
      acc[k] = (acc[k] || 0) + Number(e.brutto)
      return acc
    }, {} as Record<string, number>)

    // Monatliche Übersicht
    const monate = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
    const monatsRows = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const mE = einnahmen.filter(e => new Date(e.datum).getMonth() + 1 === m)
      const mA = ausgaben.filter(e => new Date(e.datum).getMonth() + 1 === m)
      const sE = mE.reduce((s, e) => s + Number(e.brutto), 0)
      const sA = mA.reduce((s, e) => s + Number(e.brutto), 0)
      return { monat: monate[i], einnahmen: sE, ausgaben: sA, ergebnis: sE - sA }
    })

    const gewinn = gewinnBrutto

    win.document.write(`
      <html><head><title>Jahresabschluss ${jahr}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; padding: 32px 40px; color: #1a2a3a; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 22px; margin: 0 0 2px; border-bottom: 3px solid #1a2a3a; padding-bottom: 8px; }
        h2 { font-size: 14px; margin: 28px 0 10px; padding: 6px 10px; background: #1a2a3a; color: white; border-radius: 4px; }
        .meta { color: #888; font-size: 11px; margin-bottom: 24px; }
        .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
        .box { padding: 14px; border-radius: 8px; }
        .box-label { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .box-val { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { background: #f4f1eb; padding: 7px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e0dbd3; }
        td { padding: 6px 10px; border-bottom: 1px solid #f0ece4; font-size: 11px; }
        .r { text-align: right; }
        .bold { font-weight: bold; }
        .green { color: #059669; }
        .red { color: #dc2626; }
        .total-row td { font-weight: bold; background: #f4f1eb; border-top: 2px solid #1a2a3a; }
        .kat-bar { display: inline-block; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: middle; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0dbd3; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
        @media print { body { padding: 12px; } }
      </style></head><body>
      <h1>Jahresabschluss ${jahr}</h1>
      <div class="meta">Einnahmen-Ausgaben-Rechnung gem. § 4 Abs. 3 EStG &nbsp;·&nbsp; Erstellt: ${new Date().toLocaleDateString('de-AT')} &nbsp;·&nbsp; ${eintraege.length} Buchungen</div>

      <div class="grid4">
        <div class="box" style="background:#f0fdf4;border:1px solid #bbf7d0">
          <div class="box-label">Einnahmen Brutto</div>
          <div class="box-val green">\u20AC ${fmt(sumEBrutto)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">Netto: \u20AC ${fmt(sumENetto)}</div>
        </div>
        <div class="box" style="background:#fff5f5;border:1px solid #fecaca">
          <div class="box-label">Ausgaben Brutto</div>
          <div class="box-val red">\u20AC ${fmt(sumABrutto)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">Netto: \u20AC ${fmt(sumANetto)}</div>
        </div>
        <div class="box" style="background:${gewinn >= 0 ? '#fdf8f0' : '#fff5f5'};border:1px solid ${gewinn >= 0 ? '#e8c98e' : '#fecaca'}">
          <div class="box-label">${gewinn >= 0 ? 'Gewinn' : 'Verlust'} Brutto</div>
          <div class="box-val" style="color:${gewinn >= 0 ? '#854d0e' : '#dc2626'}">\u20AC ${fmt(Math.abs(gewinn))}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">Netto: \u20AC ${fmt(Math.abs(gewinnNetto))}</div>
        </div>
        <div class="box" style="background:#f0f0fe;border:1px solid #c7d2fe">
          <div class="box-label">USt-Zahllast</div>
          <div class="box-val" style="color:#4338ca">\u20AC ${fmt(mwstSaldo)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">Eingangs-USt: \u20AC ${fmt(sumAMwst)}</div>
        </div>
      </div>

      <h2>Monatliche \u00DCbersicht</h2>
      <table>
        <tr><th>Monat</th><th class="r">Einnahmen</th><th class="r">Ausgaben</th><th class="r">Ergebnis</th></tr>
        ${monatsRows.map(m => `
          <tr>
            <td>${m.monat}</td>
            <td class="r green">\u20AC ${fmt(m.einnahmen)}</td>
            <td class="r red">\u20AC ${fmt(m.ausgaben)}</td>
            <td class="r bold" style="color:${m.ergebnis >= 0 ? '#059669' : '#dc2626'}">\u20AC ${fmt(m.ergebnis)}</td>
          </tr>`).join('')}
        <tr class="total-row">
          <td>GESAMT</td>
          <td class="r green">\u20AC ${fmt(sumEBrutto)}</td>
          <td class="r red">\u20AC ${fmt(sumABrutto)}</td>
          <td class="r" style="color:${gewinn >= 0 ? '#059669' : '#dc2626'}">\u20AC ${fmt(gewinn)}</td>
        </tr>
      </table>

      <h2>Einnahmen nach Kategorie</h2>
      <table>
        <tr><th>Kategorie</th><th class="r">Betrag Brutto</th><th class="r">Anteil</th></tr>
        ${Object.entries(einnahmenNachKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
          <tr>
            <td><span class="kat-bar" style="width:${Math.round(v / sumEBrutto * 200)}px;background:#10b981"></span>${k}</td>
            <td class="r green">\u20AC ${fmt(v)}</td>
            <td class="r">${sumEBrutto > 0 ? Math.round(v / sumEBrutto * 100) : 0}%</td>
          </tr>`).join('')}
        <tr class="total-row"><td>Summe</td><td class="r">\u20AC ${fmt(sumEBrutto)}</td><td class="r">100%</td></tr>
      </table>

      <h2>Ausgaben nach Kategorie</h2>
      <table>
        <tr><th>Kategorie</th><th class="r">Betrag Brutto</th><th class="r">Anteil</th></tr>
        ${Object.entries(ausgabenNachKatDetail).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
          <tr>
            <td><span class="kat-bar" style="width:${Math.round(v / sumABrutto * 200)}px;background:#ef4444"></span>${k}</td>
            <td class="r red">\u20AC ${fmt(v)}</td>
            <td class="r">${sumABrutto > 0 ? Math.round(v / sumABrutto * 100) : 0}%</td>
          </tr>`).join('')}
        <tr class="total-row"><td>Summe</td><td class="r">\u20AC ${fmt(sumABrutto)}</td><td class="r">100%</td></tr>
      </table>

      <h2>Alle Buchungen</h2>
      <table>
        <tr><th>Datum</th><th>Bezeichnung</th><th>Kategorie</th><th>Typ</th><th class="r">Netto</th><th class="r">MwSt</th><th class="r">Brutto</th></tr>
        ${gefiltert.map(e => `
          <tr>
            <td>${e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '\u2014'}</td>
            <td>${e.bezeichnung}</td>
            <td>${e.kategorie}</td>
            <td class="${e.typ === 'einnahme' ? 'green' : 'red'}">${e.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'}</td>
            <td class="r">\u20AC ${fmt(Number(e.netto))}</td>
            <td class="r">\u20AC ${fmt(Number(e.mwst_betrag))}</td>
            <td class="r bold">\u20AC ${fmt(Number(e.brutto))}</td>
          </tr>`).join('')}
        <tr class="total-row">
          <td colspan="4">GESAMT</td>
          <td class="r">\u20AC ${fmt(gewinnNetto)}</td>
          <td class="r">\u20AC ${fmt(mwstSaldo)}</td>
          <td class="r">\u20AC ${fmt(gewinn)}</td>
        </tr>
      </table>

      <div class="footer">
        <span>Erstellt mit BelegFix \u00B7 Einnahmen-Ausgaben-Rechnung gem. \u00A7 4 Abs. 3 EStG</span>
        <span>Seite 1</span>
      </div>
      </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // ── BMD Export ──────────────────────────────────────────────────────────────
  const exportBMD = () => {
    // BMD-kompatibles Format: Satzart;Datum;Belegnummer;Buchungstext;Konto;Gegenkonto;Betrag;USt-Code;USt-Betrag
    // Konto-Mapping für EA-Rechnung (vereinfacht)
    const kontoMapping: Record<string, string> = {
      'Honorare': '4000', 'Dienstleistungen': '4000', 'Verkauf': '4000',
      'Provisionen': '4010', 'Vermietung': '4800',
      'Material': '5000', 'Werkzeug': '5100', 'Büromaterial': '7600',
      'Miete': '7200', 'Strom': '7210', 'Telefon': '7300', 'Internet': '7300',
      'Versicherung': '7500', 'KFZ': '7100', 'Reisekosten': '7400',
      'Werbung': '7700', 'Fortbildung': '7800', 'Beratung': '7750',
      'Sonstiges': '7900',
    }

    const ustCode = (mwst: number, brutto: number) => {
      if (mwst === 0 || brutto === 0) return '0'
      const satz = Math.round((mwst / (brutto - mwst)) * 100)
      if (satz === 20) return '1'
      if (satz === 10) return '2'
      if (satz === 13) return '3'
      return '0'
    }

    const headers = ['Satzart','Datum','Belegnummer','Buchungstext','Konto','Gegenkonto','Betrag','USt-Code','USt-Betrag','Währung']
    const rows = gefiltert.map((e, i) => {
      const konto = kontoMapping[e.kategorie] || (e.typ === 'einnahme' ? '4000' : '7900')
      const gegenkonto = e.typ === 'einnahme' ? '2700' : '2700' // Kassa/Bank
      const betrag = e.typ === 'einnahme'
        ? fmt(Number(e.brutto))
        : fmt(Number(e.brutto))
      return [
        '0', // Satzart 0 = Buchung
        e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '',
        `${e.typ === 'einnahme' ? 'ER' : 'AR'}${String(i + 1).padStart(4, '0')}`,
        e.bezeichnung.substring(0, 60),
        konto,
        gegenkonto,
        betrag,
        ustCode(Number(e.mwst_betrag), Number(e.brutto)),
        fmt(Number(e.mwst_betrag)),
        'EUR',
      ]
    })

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BMD-Export-${jahr}.csv`
    a.click()
  }

  // ── Monatliche Aggregate für Diagramm ──────────────────────────────────────
  const MONATSNAMEN = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  const MONATSNAMEN_LANG = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const monatsDaten = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mE = einnahmen.filter(e => new Date(e.datum).getMonth() + 1 === m)
    const mA = ausgaben.filter(e =>  new Date(e.datum).getMonth() + 1 === m)
    const sumE = mE.reduce((s, e) => s + Number(e.brutto), 0)
    const sumA = mA.reduce((s, e) => s + Number(e.brutto), 0)
    return {
      monat: m,
      label: MONATSNAMEN[i],
      labelLang: MONATSNAMEN_LANG[i],
      einnahmen: sumE,
      ausgaben:  sumA,
      gewinn:    mE.reduce((s, e) => s + Number(e.netto), 0) - mA.reduce((s, e) => s + Number(e.netto), 0),
      hatDaten:  mE.length > 0 || mA.length > 0,
      anzahlE:   mE.length,
      anzahlA:   mA.length,
    }
  })
  const maxWertJahr = Math.max(...monatsDaten.map(m => Math.max(m.einnahmen, m.ausgaben)), 1)

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    padding: '20px',
    border: '1px solid #f0ece4',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  }

  return (
    <div style={{
      padding: isMobile ? '16px' : '28px',
      fontFamily: 'DM Sans, sans-serif',
      maxWidth: 960,
      margin: '0 auto',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 20 : 24,
          fontWeight: 800, margin: 0, color: '#1a2a3a',
        }}>
          📊 Gewinn & Verlust
        </h2>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          {einnahmen.length} Einnahmen · {ausgaben.length} Ausgaben · Jahr {jahr}
        </div>

        {/* Jahr-Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {jahre.map(j => (
            <button key={j} onClick={() => setJahr(j)} style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              background: j === jahr
                ? `linear-gradient(135deg, ${GOLD}, #e8c98e)`
                : '#f4f1eb',
              color: j === jahr ? '#0a0a0a' : '#888',
              boxShadow: j === jahr ? '0 4px 14px rgba(200,169,110,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>{j}</button>
          ))}
        </div>
      </div>

      {/* ── Karten oben ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {/* Einnahmen */}
        <div style={{ ...card, borderTop: `3px solid ${GRUEN}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GRUEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            ↑ Einnahmen
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 17 : 21, fontWeight: 800, color: GRUEN, lineHeight: 1.1 }}>
            € {fmt(sumEBrutto)}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>Netto € {fmt(sumENetto)}</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>MwSt € {fmt(sumEMwst)}</div>
        </div>

        {/* Ausgaben */}
        <div style={{ ...card, borderTop: `3px solid ${ROT}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: ROT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            ↓ Ausgaben
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 17 : 21, fontWeight: 800, color: ROT, lineHeight: 1.1 }}>
            € {fmt(sumABrutto)}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>Netto € {fmt(sumANetto)}</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>MwSt € {fmt(sumAMwst)}</div>
        </div>

        {/* Gewinn / Verlust */}
        <div style={{ ...card, borderTop: `3px solid ${gewinnNetto >= 0 ? GOLD : ROT}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: gewinnNetto >= 0 ? GOLD : ROT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {gewinnNetto >= 0 ? '✅ Gewinn' : '❌ Verlust'}
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 17 : 21, fontWeight: 800, color: gewinnNetto >= 0 ? '#1a6a40' : ROT, lineHeight: 1.1 }}>
            € {fmt(Math.abs(gewinnNetto))}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>Netto</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>Brutto € {fmt(Math.abs(gewinnBrutto))}</div>
        </div>

        {/* MwSt-Saldo */}
        <div style={{ ...card, borderTop: `3px solid ${BLAU}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BLAU, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            📋 MwSt-Saldo
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 17 : 21, fontWeight: 800, color: mwstSaldo >= 0 ? BLAU : GRUEN, lineHeight: 1.1 }}>
            € {fmt(Math.abs(mwstSaldo))}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>{mwstSaldo >= 0 ? 'Zahllast' : 'Guthaben'}</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>ans Finanzamt</div>
        </div>
      </div>

      {/* ── Diagramm ────────────────────────────────────────────────────────── */}
      {eintraege.length > 0 && (() => {
        const CHART_H = 180
        const aktMonat = new Date().getMonth() + 1

        return (
          <div style={{ ...card, marginBottom: 20 }}>

            {/* Header + Toggle */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#1a2a3a' }}>
                  📊 Einnahmen & Ausgaben – {jahr}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
                  {diagrammAnsicht === 'jahr'
                    ? '12-Monats-Balkendiagramm · Brutto-Beträge · Hover für Details'
                    : `Monatsdetail: ${MONATSNAMEN_LANG[diagrammMonat - 1]} ${jahr}`}
                </div>
              </div>
              {/* Toggle Jahr / Monat */}
              <div style={{ display: 'flex', background: '#f4f1eb', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
                {([{ k: 'jahr', l: '📅 Jahresansicht' }, { k: 'monat', l: '📆 Monatsdetail' }] as const).map(t => (
                  <button key={t.k} onClick={() => setDiagrammAnsicht(t.k)} style={{
                    padding: '7px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    background: diagrammAnsicht === t.k ? 'white' : 'transparent',
                    color: diagrammAnsicht === t.k ? '#1a2a3a' : '#aaa',
                    boxShadow: diagrammAnsicht === t.k ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s',
                  }}>{t.l}</button>
                ))}
              </div>
            </div>

            {diagrammAnsicht === 'jahr' ? (
              /* ── JAHRES-BALKENDIAGRAMM ─────────────────────────────────── */
              <>
                <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
                  {/* Y-Achse */}
                  <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', height: CHART_H + 22, paddingBottom: 22, marginRight: 8, flexShrink: 0 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ fontSize: 9, color: '#ccc', textAlign: 'right', minWidth: 38, lineHeight: 1 }}>
                        {i === 0 ? '€ 0' : `€ ${(maxWertJahr * i / 4).toLocaleString('de-AT', { maximumFractionDigits: 0 })}`}
                      </div>
                    ))}
                  </div>

                  {/* Chart-Area */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    {/* Gitterlinien */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: 0, right: 0,
                        bottom: 22 + Math.round(p * CHART_H),
                        height: 1, background: i === 0 ? '#e5e0d8' : '#f4f1eb', zIndex: 0,
                      }} />
                    ))}

                    {/* Balken */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: CHART_H + 22, paddingBottom: 22, gap: isMobile ? 2 : 4 }}>
                      {monatsDaten.map((m, i) => {
                        const eH = Math.round((m.einnahmen / maxWertJahr) * CHART_H)
                        const aH = Math.round((m.ausgaben  / maxWertJahr) * CHART_H)
                        const istAktMonat = m.monat === aktMonat && jahr === aktuellesJahr
                        const isHov = hoveredBar === i
                        return (
                          <div key={i}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }}
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}>

                            {/* Tooltip */}
                            {isHov && (
                              <div style={{
                                position: 'absolute', bottom: CHART_H + 28, left: '50%', transform: 'translateX(-50%)',
                                background: '#1a2a3a', color: 'white', borderRadius: 10, padding: '10px 14px',
                                fontSize: 11, fontWeight: 600, zIndex: 20, whiteSpace: 'nowrap',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.25)', pointerEvents: 'none',
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{m.labelLang} {jahr}</div>
                                <div style={{ color: GRUEN, marginBottom: 3 }}>↑ Einnahmen: € {fmt(m.einnahmen)}</div>
                                <div style={{ color: '#ff8080', marginBottom: 3 }}>↓ Ausgaben: &nbsp; € {fmt(m.ausgaben)}</div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 6, paddingTop: 6, color: m.gewinn >= 0 ? GOLD : '#ff6b6b', fontWeight: 800 }}>
                                  {m.gewinn >= 0 ? '✓ Gewinn' : '✗ Verlust'}: € {fmt(Math.abs(m.gewinn))}
                                </div>
                              </div>
                            )}

                            {/* Balken-Gruppe */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, width: '100%', justifyContent: 'center' }}>
                              {/* Einnahmen */}
                              <div style={{
                                flex: 1, height: eH || (m.einnahmen > 0 ? 2 : 0),
                                background: isHov ? GRUEN : `${GRUEN}bb`,
                                borderRadius: '4px 4px 0 0',
                                transition: 'background 0.15s',
                                minWidth: isMobile ? 4 : 6,
                                boxShadow: isHov ? `0 0 0 1px ${GRUEN}` : 'none',
                              }} />
                              {/* Ausgaben */}
                              <div style={{
                                flex: 1, height: aH || (m.ausgaben > 0 ? 2 : 0),
                                background: isHov ? ROT : `${ROT}bb`,
                                borderRadius: '4px 4px 0 0',
                                transition: 'background 0.15s',
                                minWidth: isMobile ? 4 : 6,
                                boxShadow: isHov ? `0 0 0 1px ${ROT}` : 'none',
                              }} />
                            </div>

                            {/* X-Label */}
                            <div style={{
                              fontSize: isMobile ? 8 : 10, marginTop: 5,
                              color: istAktMonat ? BLAU : m.hatDaten ? '#666' : '#ccc',
                              fontWeight: istAktMonat ? 800 : 600,
                            }}>{m.label}</div>
                            {istAktMonat && <div style={{ width: 4, height: 4, borderRadius: '50%', background: BLAU, marginTop: 1 }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Legende */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: GRUEN }} />
                      <span style={{ color: '#555', fontWeight: 600 }}>Einnahmen</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: ROT }} />
                      <span style={{ color: '#555', fontWeight: 600 }}>Ausgaben</span>
                    </div>
                    {jahr === aktuellesJahr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: BLAU }} />
                        <span style={{ color: '#aaa' }}>aktueller Monat</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#ccc' }}>← Hover für Details</span>
                </div>

                {/* Gewinn/Verlust Mini-Chips je Monat */}
                {monatsDaten.some(m => m.hatDaten) && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: '#faf8f5', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                      Gewinn / Verlust pro Monat (Netto)
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {monatsDaten.filter(m => m.hatDaten).map((m, i) => (
                        <div key={i} style={{
                          padding: '4px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                          background: m.gewinn >= 0 ? '#d1fae5' : '#fee2e2',
                          color: m.gewinn >= 0 ? '#065f46' : '#991b1b',
                        }}>
                          {m.label} {m.gewinn >= 0 ? '+' : ''}€ {fmt(Math.abs(m.gewinn))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>

            ) : (
              /* ── MONATSDETAIL ──────────────────────────────────────────── */
              <>
                {/* Monat-Selector */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
                  {monatsDaten.map((m, i) => (
                    <button key={i} onClick={() => setDiagrammMonat(m.monat)} style={{
                      padding: '6px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      background: diagrammMonat === m.monat ? '#1a2a3a' : m.hatDaten ? '#f4f1eb' : '#fafafa',
                      color:      diagrammMonat === m.monat ? 'white'    : m.hatDaten ? '#555'    : '#ccc',
                      boxShadow:  diagrammMonat === m.monat ? '0 3px 10px rgba(0,0,0,0.15)' : 'none',
                      position: 'relative',
                    }}>
                      {m.label}
                      {m.hatDaten && <span style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: GOLD, display: 'block' }} />}
                    </button>
                  ))}
                </div>

                {/* Monats-Inhalt */}
                {(() => {
                  const mDat = monatsDaten[diagrammMonat - 1]
                  const monatEintraege = eintraege.filter(e => new Date(e.datum).getMonth() + 1 === diagrammMonat)
                  const monatE = monatEintraege.filter(e => e.typ === 'einnahme')
                  const monatA = monatEintraege.filter(e => e.typ === 'ausgabe')

                  if (monatEintraege.length === 0) return (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: '#ccc' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Keine Daten für {mDat.labelLang}</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>Monate mit Daten sind mit ● markiert</div>
                    </div>
                  )

                  // Kategorien berechnen
                  const katMap: Record<string, { ein: number; aus: number }> = {}
                  monatEintraege.forEach(e => {
                    const k = e.kategorie || 'Sonstiges'
                    if (!katMap[k]) katMap[k] = { ein: 0, aus: 0 }
                    if (e.typ === 'einnahme') katMap[k].ein += Number(e.brutto)
                    else katMap[k].aus += Number(e.brutto)
                  })
                  const maxKat = Math.max(...Object.values(katMap).flatMap(v => [v.ein, v.aus]), 1)
                  const gewinnMonat = mDat.einnahmen - mDat.ausgaben

                  return (
                    <>
                      {/* 3 Kennzahlen-Karten */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: `${GRUEN}12`, borderRadius: 12, padding: '12px 16px', border: `1px solid ${GRUEN}22` }}>
                          <div style={{ fontSize: 10, color: GRUEN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>↑ Einnahmen</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: GRUEN }}>€ {fmt(mDat.einnahmen)}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{monatE.length} Einträge</div>
                        </div>
                        <div style={{ background: `${ROT}10`, borderRadius: 12, padding: '12px 16px', border: `1px solid ${ROT}22` }}>
                          <div style={{ fontSize: 10, color: ROT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>↓ Ausgaben</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: ROT }}>€ {fmt(mDat.ausgaben)}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{monatA.length} Einträge</div>
                        </div>
                        <div style={{ background: gewinnMonat >= 0 ? '#fdf8f0' : '#fff5f5', borderRadius: 12, padding: '12px 16px', border: `1px solid ${gewinnMonat >= 0 ? GOLD : ROT}33`, gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                          <div style={{ fontSize: 10, color: gewinnMonat >= 0 ? GOLD : ROT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                            {gewinnMonat >= 0 ? '✅ Gewinn' : '❌ Verlust'}
                          </div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: gewinnMonat >= 0 ? '#1a6a40' : ROT }}>€ {fmt(Math.abs(gewinnMonat))}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Brutto</div>
                        </div>
                      </div>

                      {/* Horizontale Balken nach Kategorie */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                        Aufschlüsselung nach Kategorie
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(katMap)
                          .sort((a, b) => (b[1].ein + b[1].aus) - (a[1].ein + a[1].aus))
                          .map(([kat, v]) => (
                          <div key={kat}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a' }}>{kat}</span>
                              <span style={{ fontSize: 12, display: 'flex', gap: 10 }}>
                                {v.ein > 0 && <span style={{ color: GRUEN, fontWeight: 700 }}>+€ {fmt(v.ein)}</span>}
                                {v.aus > 0 && <span style={{ color: ROT,   fontWeight: 700 }}>−€ {fmt(v.aus)}</span>}
                              </span>
                            </div>
                            {v.ein > 0 && (
                              <div style={{ height: 9, background: '#f0fdf4', borderRadius: 5, overflow: 'hidden', marginBottom: 3, border: '1px solid #d1fae5' }}>
                                <div style={{ height: '100%', width: `${(v.ein / maxKat) * 100}%`, background: `linear-gradient(90deg, ${GRUEN}, #34d399)`, borderRadius: 5, transition: 'width 0.6s' }} />
                              </div>
                            )}
                            {v.aus > 0 && (
                              <div style={{ height: 9, background: '#fff5f5', borderRadius: 5, overflow: 'hidden', border: '1px solid #fee2e2' }}>
                                <div style={{ height: '100%', width: `${(v.aus / maxKat) * 100}%`, background: `linear-gradient(90deg, ${ROT}, #f87171)`, borderRadius: 5, transition: 'width 0.6s' }} />
                              </div>
                            )}
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

      {/* ── Kategorien-Chips ────────────────────────────────────────────────── */}
      {Object.keys(ausgabenNachKat).length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            Ausgaben nach Kategorie
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(ausgabenNachKat)
              .sort((a, b) => b[1] - a[1])
              .map(([kat, summe]) => (
                <div key={kat} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', background: '#fdf8f0',
                  borderRadius: 20, border: `1px solid ${GOLD}33`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2a3a' }}>{kat}</span>
                  <span style={{ fontSize: 12, color: ROT, fontWeight: 700 }}>€ {fmt(summe)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Filter + Export ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'alle',     label: 'Alle',      count: eintraege.length },
          { key: 'einnahme', label: '↑ Einnahmen', count: einnahmen.length },
          { key: 'ausgabe',  label: '↓ Ausgaben',  count: ausgaben.length },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)} style={{
            padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            background: filter === t.key ? '#1a2a3a' : '#f4f1eb',
            color: filter === t.key ? 'white' : '#888',
            transition: 'all 0.2s',
          }}>
            {t.label} ({t.count})
          </button>
        ))}
        {eintraege.length > 0 && (
          <>
            <div style={{ flex: 1 }} />
            <button onClick={exportCSV} style={{
              padding: '7px 13px', borderRadius: 9, border: '1px solid #e5e0d8',
              background: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#555',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button onClick={exportBMD} style={{
              padding: '7px 13px', borderRadius: 9, border: '1px solid #c7d2fe',
              background: '#f0f0fe', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#4338ca',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              BMD
            </button>
            <button onClick={drucken} style={{
              padding: '7px 13px', borderRadius: 9, border: '1px solid #e5e0d8',
              background: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#555',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PDF
            </button>
            <button onClick={jahresabschlussPDF} style={{
              padding: '7px 13px', borderRadius: 9, border: 'none',
              background: GOLD, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Jahresabschluss
            </button>
          </>
        )}
      </div>

      {/* ── Liste ──────────────────────────────────────────────────────────── */}
      {laden ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#ccc' }}>Lädt...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '50px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, color: '#aaa', marginBottom: 6 }}>
            Noch keine Einträge für {jahr}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Bezahlte Rechnungen → ⬇ Gold-Button → G&V<br/>
            Belege → ⬇ Gold-Button → G&V
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Desktop: Tabellen-Header */}
          {!isMobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 130px 90px 90px 100px 70px',
              padding: '8px 18px',
              background: '#f8f6f2',
              borderRadius: 10,
              gap: 8,
            }}>
              {['Datum', 'Bezeichnung', 'Kategorie', 'Netto', 'MwSt', 'Brutto', ''].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, color: '#bbb',
                  textTransform: 'uppercase', letterSpacing: 0.7,
                  textAlign: i >= 3 && i <= 5 ? 'right' : 'left',
                }}>{h}</div>
              ))}
            </div>
          )}

          {/* Einträge */}
          {gefiltert.map(e => (
            <div key={e.id}
              onClick={() => detailOeffnen(e)}
              style={{
                background: 'white',
                borderRadius: 12,
                border: '1px solid #f0ece4',
                borderLeft: `4px solid ${e.typ === 'einnahme' ? GRUEN : ROT}`,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, background 0.15s',
              }}
              onMouseEnter={ev => (ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
              onMouseLeave={ev => (ev.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)')}
            >
              {isMobile ? (
                /* ── Mobile Karte ── */
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Typ-Badge + Bezeichnung */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 20,
                          background: e.typ === 'einnahme' ? `${GRUEN}18` : `${ROT}18`,
                          color: e.typ === 'einnahme' ? GRUEN : ROT,
                        }}>
                          {e.typ === 'einnahme' ? '↑ Einnahme' : '↓ Ausgabe'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: '#1a2a3a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}>
                        {e.bezeichnung || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#aaa' }}>
                        <span>📅 {e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '—'}</span>
                        <span style={{
                          background: '#fdf8f0', color: GOLD,
                          padding: '1px 8px', borderRadius: 10,
                          border: `1px solid ${GOLD}33`, fontSize: 10, fontWeight: 600,
                        }}>{e.kategorie}</span>
                      </div>
                    </div>

                    {/* Betrag rechts */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800,
                        color: e.typ === 'einnahme' ? GRUEN : ROT,
                      }}>
                        {e.typ === 'einnahme' ? '+' : '−'} € {fmt(Number(e.brutto))}
                      </div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        Netto € {fmt(Number(e.netto))}
                      </div>
                      {Number(e.mwst_betrag) > 0 && (
                        <div style={{ fontSize: 11, color: '#ccc' }}>
                          MwSt € {fmt(Number(e.mwst_betrag))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }} onClick={ev => ev.stopPropagation()}>
                        {e.quelle_id && e.quelle !== 'manuell' && (
                          <button onClick={() => dateiOeffnen(e)} style={{
                            background: 'none', border: '1px solid #e0ecff',
                            borderRadius: 6, color: BLAU, cursor: 'pointer',
                            fontSize: 11, padding: '3px 8px',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            {e.quelle === 'reisekosten' ? 'Details' : 'Datei'}
                          </button>
                        )}
                        <button onClick={() => loeschen(e.id)} style={{
                          background: 'none', border: '1px solid #f0ece4',
                          borderRadius: 6, color: '#ccc', cursor: 'pointer',
                          fontSize: 11, padding: '3px 8px',
                        }}>✕ entfernen</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Desktop Zeile ── */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 130px 90px 90px 100px 70px',
                  padding: '13px 18px',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '—'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#1a2a3a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.bezeichnung}</div>
                    {e.quelle !== 'manuell' && (
                      <div style={{ fontSize: 10, color: '#bbb' }}>via {e.quelle}</div>
                    )}
                  </div>
                  <div>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 12,
                      background: '#fdf8f0', color: GOLD,
                      border: `1px solid ${GOLD}33`, whiteSpace: 'nowrap',
                    }}>{e.kategorie}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#666' }}>
                    € {fmt(Number(e.netto))}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#aaa' }}>
                    € {fmt(Number(e.mwst_betrag))}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                    color: e.typ === 'einnahme' ? GRUEN : ROT,
                  }}>
                    {e.typ === 'einnahme' ? '+' : '−'} € {fmt(Number(e.brutto))}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={ev => ev.stopPropagation()}>
                    {e.quelle_id && e.quelle !== 'manuell' && (
                      <button
                        onClick={() => dateiOeffnen(e)}
                        title="Datei ansehen"
                        style={{
                          background: 'none', border: 'none',
                          color: '#bbb', cursor: 'pointer', fontSize: 15,
                          width: 28, height: 28, borderRadius: 6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={ev => (ev.currentTarget.style.color = BLAU)}
                        onMouseLeave={ev => (ev.currentTarget.style.color = '#bbb')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    )}
                    <button
                      onClick={() => loeschen(e.id)}
                      title="Entfernen"
                      style={{
                        background: 'none', border: 'none',
                        color: '#ddd', cursor: 'pointer', fontSize: 16,
                        width: 28, height: 28, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={ev => (ev.currentTarget.style.color = ROT)}
                      onMouseLeave={ev => (ev.currentTarget.style.color = '#ddd')}
                    >✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ── Gesamt-Zeile ── */}
          {gefiltert.length > 0 && (
            <div style={{
              ...card,
              marginTop: 4,
              borderTop: `3px solid #1a2a3a`,
              background: '#1a2a3a',
            }}>
              {filter === 'alle' ? (
                /* Alle: zeige + Einnahmen − Ausgaben = Ergebnis */
                isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: GRUEN, fontWeight: 700 }}>+ Einnahmen</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: GRUEN, fontFamily: 'Syne, sans-serif' }}>
                        € {fmt(sumEBrutto)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: ROT, fontWeight: 700 }}>− Ausgaben</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ROT, fontFamily: 'Syne, sans-serif' }}>
                        € {fmt(sumABrutto)}
                      </span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {gewinnBrutto >= 0 ? '= Gewinn' : '= Verlust'}
                      </span>
                      <span style={{
                        fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif',
                        color: gewinnBrutto >= 0 ? GOLD : ROT,
                      }}>
                        {gewinnBrutto >= 0 ? '+' : '−'} € {fmt(Math.abs(gewinnBrutto))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: GRUEN, fontWeight: 700 }}>+ Einnahmen</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: GRUEN, fontFamily: 'Syne, sans-serif' }}>
                        € {fmt(sumEBrutto)}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>−</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: ROT, fontWeight: 700 }}>Ausgaben</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: ROT, fontFamily: 'Syne, sans-serif' }}>
                        € {fmt(sumABrutto)}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>=</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {gewinnBrutto >= 0 ? 'Gewinn' : 'Verlust'}
                      </span>
                      <span style={{
                        fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif',
                        color: gewinnBrutto >= 0 ? GOLD : ROT,
                      }}>
                        {gewinnBrutto >= 0 ? '+' : '−'} € {fmt(Math.abs(gewinnBrutto))}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                /* Nur Einnahmen oder nur Ausgaben: einfache Summe */
                <div style={{ display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Gesamt
                  </span>
                  <span style={{
                    fontSize: isMobile ? 18 : 20, fontWeight: 800, fontFamily: 'Syne, sans-serif',
                    color: filter === 'einnahme' ? GRUEN : ROT,
                  }}>
                    {filter === 'einnahme' ? '+' : '−'} € {fmt(gefiltert.reduce((s, e) => s + Number(e.brutto), 0))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Beleg-Detail-Modal ─────────────────────────────────────────────── */}
      {detailModal && (() => {
        const e = detailModal.eintrag
        const x = detailModal.extra || {}
        const isEin = e.typ === 'einnahme'
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }} onClick={detailSchliessen}>
            <div style={{
              background: 'white', borderRadius: 20,
              width: '100%', maxWidth: isMobile ? 520 : 820,
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              fontFamily: 'DM Sans, sans-serif',
            }} onClick={ev => ev.stopPropagation()}>

              {/* ── Header: hell wie Belegscanner ── */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ece4', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: isEin ? '#d1fae5' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {isEin ? '💰' : '🛒'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.bezeichnung || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {e.datum ? new Date(e.datum).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: isEin ? '#059669' : '#ef4444' }}>
                    {isEin ? '+' : '−'} € {fmt(Number(e.brutto))}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, marginTop: 4, display: 'inline-block',
                    background: isEin ? '#d1fae5' : '#fee2e2',
                    color: isEin ? '#065f46' : '#991b1b',
                    padding: '2px 10px', borderRadius: 20,
                  }}>
                    {isEin ? '↑ Einnahme' : '↓ Ausgabe'}
                  </span>
                </div>
                <button onClick={detailSchliessen} style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: '#555', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* ── Inhalt: Info links + Datei-Vorschau rechts ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', flex: 1, overflow: 'hidden' }}>

                {/* Info-Felder – Icon-Box-Stil wie Belegscanner */}
                <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, borderRight: isMobile ? 'none' : '1px solid #f0ece4' }}>
                  {([
                    { icon: '🏢', bg: '#f0f0f0', label: 'Lieferant',    value: x.lieferant },
                    { icon: '📂', bg: '#e8f0fe', label: 'Kategorie',    value: e.kategorie },
                    { icon: '📅', bg: '#fff3e0', label: 'Datum',        value: e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : null },
                    { icon: '#️⃣', bg: '#f3e5f5', label: 'Rechnungsnr.', value: x.rechnungsnummer },
                    { icon: '💵', bg: '#e8f5e9', label: 'MwSt',         value: Number(e.mwst_betrag) > 0 ? `€ ${fmt(Number(e.mwst_betrag))}` : '0 % (Kleinunternehmer)' },
                    { icon: '📝', bg: '#fce4ec', label: 'Notiz',        value: x.notiz },
                    { icon: '📌', bg: '#f3f4f6', label: 'Quelle',       value: e.quelle === 'beleg' ? 'Belegscanner' : e.quelle === 'rechnung' ? 'Rechnung' : e.quelle === 'km' ? 'KM-Buch' : 'Manuell' },
                  ] as { icon: string; bg: string; label: string; value: string | undefined | null }[])
                    .filter(r => r.value)
                    .map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {r.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', fontWeight: 700, marginBottom: 3 }}>{r.label}</div>
                          <div style={{ fontSize: 14, color: '#1a2a3a', fontWeight: 600 }}>{r.value}</div>
                        </div>
                      </div>
                    ))
                  }

                  {/* Büro/Privat-Aufteilung Info-Box */}
                  {x.buero_anteil != null && x.buero_anteil < 100 && x.betrag_gesamt != null && (
                    <div style={{ background: '#ede9fe', borderRadius: 10, padding: '12px 14px', border: '1px solid #c4b5fd' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7c3aed', fontWeight: 700, marginBottom: 8 }}>
                        🏢 Büro/Privat-Aufteilung
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 2 }}>🏢 Büroanteil ({x.buero_anteil}%)</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>
                            € {fmt(x.betrag_gesamt * x.buero_anteil / 100)}
                          </div>
                          <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 1 }}>✓ wurde übertragen</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#9333ea', fontWeight: 700, marginBottom: 2 }}>🏠 Privatanteil ({100 - x.buero_anteil}%)</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#9333ea' }}>
                            € {fmt(x.betrag_gesamt * (100 - x.buero_anteil) / 100)}
                          </div>
                          <div style={{ fontSize: 10, color: '#d8b4fe', marginTop: 1 }}>✗ nicht übertragen</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#6d28d9', background: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '5px 8px' }}>
                        Gesamtbetrag: € {fmt(x.betrag_gesamt)} · nur {x.buero_anteil}% (€ {fmt(x.betrag_gesamt * x.buero_anteil / 100)}) wurden zur G&V übertragen
                      </div>
                    </div>
                  )}

                  {/* G&V Status – großer Button wie Belegscanner */}
                  <div style={{
                    width: '100%', padding: '13px 18px', borderRadius: 12,
                    background: '#d1fae5', border: '1px solid #a7f3d0',
                    fontSize: 14, fontWeight: 800, color: '#065f46',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    ✅ In G&V eingetragen
                  </div>
                </div>

                {/* Datei-Vorschau rechts */}
                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', background: '#faf8f5' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8 }}>📎 Beleg-Datei</div>
                  {detailDateiUrl ? (
                    <>
                      {x.datei_typ === 'application/pdf' ? (
                        <embed src={detailDateiUrl} type="application/pdf"
                          style={{ width: '100%', flex: 1, minHeight: 280, borderRadius: 12, border: '1px solid #e5e0d8' }} />
                      ) : (
                        <img src={detailDateiUrl} alt="Vorschau"
                          style={{ width: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 12, border: '1px solid #e5e0d8', background: 'white', cursor: 'zoom-in' }}
                          onClick={() => { detailSchliessen(); setTimeout(() => dateiOeffnen(e), 100) }} />
                      )}
                      <button onClick={() => { detailSchliessen(); setTimeout(() => dateiOeffnen(e), 100) }}
                        style={{ background: '#fdf8f0', border: `1px solid ${GOLD}44`, borderRadius: 10, padding: '11px', fontSize: 13, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
                        🔍 Vollbild anzeigen
                      </button>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#ccc', minHeight: 200 }}>
                      <div style={{ fontSize: 48 }}>
                        {e.quelle === 'reisekosten' ? '✈️' : (!dateiLadenFertig && e.quelle !== 'manuell' ? '⏳' : '📄')}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#bbb', textAlign: 'center' }}>
                        {e.quelle === 'manuell'
                          ? 'Manuell erfasst'
                          : e.quelle === 'reisekosten'
                          ? 'Reisekostenabrechnung'
                          : !dateiLadenFertig
                          ? 'Wird geladen…'
                          : 'Kein Beleg vorhanden'}
                      </div>
                      {e.quelle === 'reisekosten' && e.quelle_id && (
                        <button onClick={() => { detailSchliessen(); dateiOeffnen(e) }}
                          style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}66`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: '#7a5c1e', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Reisekosten-Details
                        </button>
                      )}
                      {e.quelle_id && e.quelle !== 'manuell' && e.quelle !== 'reisekosten' && dateiLadenFertig && (
                        <button onClick={() => { detailSchliessen(); dateiOeffnen(e) }}
                          style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Datei öffnen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer – wie Belegscanner */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #f0ece4', display: 'flex', gap: 8 }}>
                <button onClick={detailSchliessen} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e0d8',
                  background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#555',
                }}>✕ Schließen</button>
                <button onClick={() => { detailSchliessen(); loeschen(e.id) }} style={{
                  padding: '11px 16px', borderRadius: 10, border: '1.5px solid #fde8e6',
                  background: 'white', fontSize: 14, cursor: 'pointer', color: ROT,
                }}>🗑</button>
              </div>
            </div>
          </div>
        )
      })()}

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

      {/* ── Reisekosten-Detail-Modal (aus G&V heraus) ──────────────────────── */}
      {reiseDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.65)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, maxWidth: 520, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${GOLD}, #e8c98e)`, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#0a0a0a' }}>✈️ {reiseDetail.zielort}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>{reiseDetail.zweck}</div>
            </div>
            {/* Inhalt */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto' }}>
              {[
                { icon: '📅', bg: '#fff3e0', label: 'Datum', value: reiseDetail.datum ? new Date(reiseDetail.datum).toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { icon: '🕐', bg: '#f0f0fe', label: 'Reisezeit', value: reiseDetail.uhrzeit_start && reiseDetail.uhrzeit_ende ? `${reiseDetail.uhrzeit_start} – ${reiseDetail.uhrzeit_ende} (${Number(reiseDetail.stunden_dauer || 0).toFixed(1)} Std.)` : '—' },
                { icon: '📏', bg: '#f0fdf4', label: 'Strecke', value: `${Number(reiseDetail.km_einfach).toFixed(1)} km einfach · ${(Number(reiseDetail.km_einfach) * 2).toFixed(1)} km gesamt` },
                { icon: '🍽', bg: '#fff0f0', label: 'Mahlzeit gestellt', value: reiseDetail.essen_bekommen ? 'Ja – Taggeld um € 15,00 reduziert' : 'Nein' },
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
              {(reiseDetail.km_fahrt_hin_id || reiseDetail.km_fahrt_rueck_id) && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔗</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>KM-Buch Verknüpfung</div>
                    {reiseDetail.km_fahrt_hin_id && (
                      <div style={{ fontSize: 13, color: GRUEN, fontWeight: 600, marginBottom: 3 }}>
                        ↗ Hinfahrt: {reiseDetail.km_hin_ziel?.split(',').slice(0, 2).join(',') || '—'} · {Number(reiseDetail.km_hin_km || 0).toFixed(1)} km
                      </div>
                    )}
                    {reiseDetail.km_fahrt_rueck_id && (
                      <div style={{ fontSize: 13, color: BLAU, fontWeight: 600 }}>
                        ↙ Rückfahrt: {reiseDetail.km_rueck_ziel?.split(',').slice(0, 2).join(',') || '—'} · {Number(reiseDetail.km_rueck_km || 0).toFixed(1)} km
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Abrechnung Box */}
              <div style={{ background: '#fdf8f0', borderRadius: 14, padding: '14px 16px', border: `1px solid ${GOLD}44` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Abrechnung § 26 EStG 2026</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: BLAU, fontWeight: 700, marginBottom: 4 }}>KM-Geld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: BLAU }}>€ {fmt(Number(reiseDetail.km_geld))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: GRUEN, fontWeight: 700, marginBottom: 4 }}>Taggeld</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: GRUEN }}>€ {fmt(Number(reiseDetail.taggeld))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7a5c1e', fontWeight: 700, marginBottom: 4 }}>Gesamt</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#7a5c1e' }}>€ {fmt(Number(reiseDetail.gesamt))}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* G&V Banner – immer grün, da aus G&V heraus geöffnet */}
            <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#d1fae5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>In G&V eingetragen</div>
                <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                  {(reiseDetail.km_fahrt_hin_id || reiseDetail.km_fahrt_rueck_id)
                    ? `Taggeld € ${fmt(Number(reiseDetail.taggeld))} übertragen (KM-Geld via KM-Buch)`
                    : `Gesamt € ${fmt(Number(reiseDetail.gesamt))} übertragen`}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f0ece4' }}>
              <button onClick={() => setReiseDetail(null)} style={{
                width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #e5e0d8',
                background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#555',
              }}>✕ Schließen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Datei-Lade-Spinner ─────────────────────────────────────────────── */}
      {dateiLaden && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 48px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, color: '#666' }}>Datei wird geladen...</div>
          </div>
        </div>
      )}

      {/* ── Datei-Viewer Modal ─────────────────────────────────────────────── */}
      {dateiModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', zIndex: 1000,
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', background: '#1a2a3a', flexShrink: 0,
          }}>
            <span style={{ flex: 1, fontSize: 13, color: 'white', fontWeight: 600 }}>
              📄 {dateiModal.name}
            </span>
            <button onClick={dateiDrucken} style={{
              background: GOLD, color: '#000', border: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>🖨 Drucken</button>
            <button onClick={dateiHerunterladen} style={{
              background: '#334155', color: 'white', border: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>⬇ Speichern</button>
            <button onClick={dateiSchliessen} style={{
              background: '#ef4444', color: 'white', border: 'none', borderRadius: 8,
              padding: '7px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>✕</button>
          </div>
          {/* Inhalt */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dateiModal.typ === 'application/pdf' ? (
              <embed
                src={dateiModal.url}
                type="application/pdf"
                style={{ width: '100%', height: '100%', minHeight: '80vh' }}
              />
            ) : (
              <img
                src={dateiModal.url}
                alt={dateiModal.name}
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
