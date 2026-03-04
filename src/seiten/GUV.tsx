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
  const [detailLaden, setDetailLaden] = useState(false)

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

  const loeschen = async (id: number) => {
    if (!window.confirm('Eintrag aus G&V entfernen?')) return
    await api.delete(`/guv/${id}`)
    await ladeEintraege()
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
    setDetailLaden(true)
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
        }
      } catch {}
    }
    setDetailLaden(false)
    setDetailModal({ eintrag: e, extra })
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

      {/* ── Filter ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
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
                          }}>👁 Datei</button>
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
                      >👁</button>
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

      {/* ── Beleg-Detail-Lade-Spinner ──────────────────────────────────────── */}
      {detailLaden && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 48px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            <div style={{ fontSize: 13, color: '#666' }}>Wird geladen...</div>
          </div>
        </div>
      )}

      {/* ── Beleg-Detail-Modal ─────────────────────────────────────────────── */}
      {detailModal && (() => {
        const e = detailModal.eintrag
        const x = detailModal.extra || {}
        const isEin = e.typ === 'einnahme'
        const row = (label: string, value: React.ReactNode) => value ? (
          <div key={label} style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr',
            gap: isMobile ? 2 : 12, padding: '12px 0',
            borderBottom: '1px solid #f4f1eb',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.7, paddingTop: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 14, color: '#1a2a3a', fontWeight: 500 }}>{value}</div>
          </div>
        ) : null
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }} onClick={() => setDetailModal(null)}>
            <div style={{
              background: 'white', borderRadius: 20,
              width: '100%', maxWidth: 520,
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }} onClick={ev => ev.stopPropagation()}>

              {/* Header */}
              <div style={{
                background: isEin ? GRUEN : ROT,
                padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    {isEin ? '↑ Einnahme' : '↓ Ausgabe'} · {e.quelle}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif' }}>
                    {e.bezeichnung || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif' }}>
                    {isEin ? '+' : '−'} € {fmt(Number(e.brutto))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Brutto</div>
                </div>
              </div>

              {/* Felder */}
              <div style={{ padding: '4px 22px 16px', overflowY: 'auto' }}>
                {row('Datum', e.datum ? new Date(e.datum).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' }) : null)}
                {row('Kategorie',
                  <span style={{
                    background: '#fdf8f0', color: GOLD,
                    padding: '3px 12px', borderRadius: 12,
                    border: `1px solid ${GOLD}44`, fontSize: 13, fontWeight: 600,
                  }}>{e.kategorie}</span>
                )}
                {row('Netto', `€ ${fmt(Number(e.netto))}`)}
                {row('MwSt', Number(e.mwst_betrag) > 0 ? `€ ${fmt(Number(e.mwst_betrag))}` : '0 % (Kleinunternehmer)')}
                {row('Brutto', `€ ${fmt(Number(e.brutto))}`)}
                {x.lieferant && row('Lieferant / Von', x.lieferant)}
                {x.rechnungsnummer && row('Rechnungsnummer', x.rechnungsnummer)}
                {x.dateiname && row('Anhang', x.dateiname)}
                {x.notiz && row('Notiz', x.notiz)}
                {row('Quelle', e.quelle === 'beleg' ? 'Belegscanner' : e.quelle === 'rechnung' ? 'Rechnung' : 'Manuell')}
              </div>

              {/* Footer */}
              <div style={{
                padding: '14px 22px', borderTop: '1px solid #f0ece4',
                display: 'flex', gap: 8, justifyContent: 'flex-end',
              }}>
                {e.quelle_id && e.quelle !== 'manuell' && (
                  <button onClick={() => { setDetailModal(null); dateiOeffnen(e) }} style={{
                    background: '#f4f1eb', color: '#1a2a3a', border: 'none',
                    borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}>👁 Datei ansehen</button>
                )}
                <button onClick={() => setDetailModal(null)} style={{
                  background: '#1a2a3a', color: 'white', border: 'none',
                  borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}>Schließen</button>
              </div>
            </div>
          </div>
        )
      })()}

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
