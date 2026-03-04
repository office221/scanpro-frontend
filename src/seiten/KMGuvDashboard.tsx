import React, { useState, useEffect } from 'react'
import api from '../services/api'

const GOLD  = '#c8a96e'
const BLAU  = '#6366f1'
const GRUEN = '#10b981'
const ROT   = '#ef4444'

interface KmFahrt {
  id: number; datum: string; start_adresse: string; ziel_adresse: string
  km_gefahren: number; zweck: string; notiz?: string; in_guv: boolean
  rechnung_nummer?: string; rechnung_typ?: string
}
interface GuvEintrag {
  id: number; datum: string; bezeichnung: string; kategorie: string
  typ: 'einnahme' | 'ausgabe'; brutto: number; netto: number
  mwst_betrag: number; quelle: string
}

const fmt   = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtKm = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function KMGuvDashboard() {
  const [jahr, setJahr]           = useState(new Date().getFullYear())
  const [kmFahrten, setKmFahrten] = useState<KmFahrt[]>([])
  const [guv, setGuv]             = useState<GuvEintrag[]>([])
  const [kmSatz, setKmSatz]       = useState(0.42)
  const [laden, setLaden]         = useState(false)
  const [ansicht, setAnsicht]     = useState<'beide' | 'km' | 'guv'>('beide')
  const [filterGuv, setFilterGuv] = useState<'alle' | 'einnahme' | 'ausgabe'>('alle')
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    api.get('/einstellungen').then(r => setKmSatz(parseFloat(r.data.km_satz) || 0.42)).catch(() => {})
  }, [])

  useEffect(() => { ladeDaten() }, [jahr]) // eslint-disable-line

  const ladeDaten = async () => {
    setLaden(true)
    try {
      const [r1, r2] = await Promise.all([
        api.get(`/km-buch?jahr=${jahr}`),
        api.get(`/guv?jahr=${jahr}`),
      ])
      setKmFahrten(r1.data)
      setGuv(r2.data)
    } catch {}
    setLaden(false)
  }

  // ── KM Berechnungen ──────────────────────────────────────────────────────
  const totalKm      = kmFahrten.reduce((s, f) => s + Number(f.km_gefahren), 0)
  const totalKmGeld  = totalKm * kmSatz
  const kmInGuv      = kmFahrten.filter(f => f.in_guv)
  const kmOffen      = kmFahrten.filter(f => !f.in_guv)
  const kmGeldInGuv  = kmInGuv.reduce((s, f) => s + Number(f.km_gefahren), 0) * kmSatz

  // ── G&V Berechnungen ─────────────────────────────────────────────────────
  const einnahmen   = guv.filter(e => e.typ === 'einnahme')
  const ausgaben    = guv.filter(e => e.typ === 'ausgabe')
  const sumEBrutto  = einnahmen.reduce((s, e) => s + Number(e.brutto), 0)
  const sumABrutto  = ausgaben.reduce((s, e) => s + Number(e.brutto), 0)
  const sumENetto   = einnahmen.reduce((s, e) => s + Number(e.netto), 0)
  const sumANetto   = ausgaben.reduce((s, e) => s + Number(e.netto), 0)
  const sumEMwst    = einnahmen.reduce((s, e) => s + Number(e.mwst_betrag), 0)
  const sumAMwst    = ausgaben.reduce((s, e) => s + Number(e.mwst_betrag), 0)
  const gewinnNetto  = sumENetto - sumANetto
  const gewinnBrutto = sumEBrutto - sumABrutto
  const mwstSaldo    = sumEMwst - sumAMwst

  // ── Filter für G&V-Liste ─────────────────────────────────────────────────
  const gefilterteGuv = filterGuv === 'alle' ? guv
    : guv.filter(e => e.typ === filterGuv)

  const jahre = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]

  // ── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'white', borderRadius: 14, border: '1px solid #f0ece4',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  }

  return (
    <div style={{ padding: isMobile ? '14px' : '24px 28px', fontFamily: 'DM Sans, sans-serif', background: '#f8f6f2', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 19 : 23, fontWeight: 800, margin: 0, color: '#1a2a3a' }}>
          🚗💰 KM & G&V Übersicht
        </h2>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>
          Fahrten + Buchführung auf einen Blick
        </div>
        {/* Jahr-Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {jahre.map(j => (
            <button key={j} onClick={() => setJahr(j)} style={{
              padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              background: j === jahr ? `linear-gradient(135deg, ${GOLD}, #e8c98e)` : '#f4f1eb',
              color: j === jahr ? '#0a0a0a' : '#888',
              boxShadow: j === jahr ? '0 4px 14px rgba(200,169,110,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>{j}</button>
          ))}
        </div>
      </div>

      {/* ── Haupt-Layout: Links + Rechts ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '270px 1fr',
        gap: 18, alignItems: 'start',
      }}>

        {/* ════════════════ LINKE SPALTE (Übersicht) ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── KM-Buch Block ── */}
          <div style={{ ...card, borderTop: `3px solid ${GOLD}`, padding: '18px 18px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              🚗 KM-Buch {jahr}
            </div>

            {[
              { label: 'Gesamt km',     value: `${fmtKm(totalKm)} km`,   color: '#1a2a3a', big: true },
              { label: 'KM-Geld gesamt',value: `€ ${fmt(totalKmGeld)}`, color: GOLD,      big: true },
              { label: 'Fahrten',       value: kmFahrten.length,          color: '#555',    big: false },
              { label: 'Bereits in G&V',value: kmInGuv.length,            color: GRUEN,     big: false },
              { label: 'Noch offen',    value: kmOffen.length,            color: kmOffen.length > 0 ? ROT : '#aaa', big: false },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f4f1eb' }}>
                <span style={{ fontSize: 11, color: '#999' }}>{row.label}</span>
                <span style={{ fontFamily: row.big ? 'Syne, sans-serif' : 'DM Sans, sans-serif', fontSize: row.big ? 15 : 13, fontWeight: row.big ? 800 : 700, color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 10, padding: '8px 10px', background: '#fdf8f0', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600 }}>KM-Geld in G&V</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: GOLD }}>€ {fmt(kmGeldInGuv)}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#ccc', textAlign: 'right' }}>
              Satz: € {kmSatz.toFixed(4)}/km · § 26 EStG
            </div>
          </div>

          {/* ── G&V Block ── */}
          <div style={{ ...card, borderTop: `3px solid ${BLAU}`, padding: '18px 18px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: BLAU, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>
              💰 G&V {jahr}
            </div>

            {[
              { label: 'Einnahmen (brutto)', value: `+€ ${fmt(sumEBrutto)}`, color: GRUEN, big: true },
              { label: 'Ausgaben (brutto)',  value: `−€ ${fmt(sumABrutto)}`,  color: ROT,   big: true },
              { label: 'Einnahmen (netto)',  value: `€ ${fmt(sumENetto)}`,    color: '#555', big: false },
              { label: 'Ausgaben (netto)',   value: `€ ${fmt(sumANetto)}`,    color: '#555', big: false },
              { label: 'Einträge gesamt',    value: guv.length,               color: '#888', big: false },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f4f1eb' }}>
                <span style={{ fontSize: 11, color: '#999' }}>{row.label}</span>
                <span style={{ fontFamily: row.big ? 'Syne, sans-serif' : 'DM Sans, sans-serif', fontSize: row.big ? 14 : 12, fontWeight: row.big ? 800 : 700, color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Gewinn/Verlust Box */}
            <div style={{
              marginTop: 12, padding: '12px 14px', borderRadius: 10,
              background: gewinnNetto >= 0 ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${gewinnNetto >= 0 ? GRUEN + '44' : ROT + '44'}`,
            }}>
              <div style={{ fontSize: 9, color: gewinnNetto >= 0 ? GRUEN : ROT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {gewinnNetto >= 0 ? '✅ Gewinn (netto)' : '⚠️ Verlust (netto)'}
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 19, fontWeight: 800, color: gewinnNetto >= 0 ? GRUEN : ROT }}>
                {gewinnNetto >= 0 ? '+' : '−'} € {fmt(Math.abs(gewinnNetto))}
              </div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                Brutto: {gewinnBrutto >= 0 ? '+' : '−'} € {fmt(Math.abs(gewinnBrutto))}
              </div>
            </div>

            {/* MwSt-Saldo */}
            <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: '#f0f4ff', border: `1px solid ${BLAU}22` }}>
              <div style={{ fontSize: 9, color: BLAU, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                MwSt.-Saldo (Zahllast)
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: mwstSaldo > 0 ? ROT : GRUEN }}>
                {mwstSaldo > 0 ? 'zahlen: ' : 'erhalten: '} € {fmt(Math.abs(mwstSaldo))}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ RECHTE SPALTE (Listen) ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Ansicht-Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([['beide', '🗂 Beide'], ['km', '🚗 KM-Buch'], ['guv', '💰 G&V']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setAnsicht(k)} style={{
                padding: '8px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                background: ansicht === k ? '#1a2a3a' : 'white',
                color: ansicht === k ? 'white' : '#888',
                border: ansicht === k ? 'none' : '1px solid #f0ece4',
                boxShadow: ansicht === k ? '0 4px 14px rgba(26,42,58,0.3)' : 'none',
                transition: 'all 0.2s',
              }}>{l}</button>
            ))}
          </div>

          {/* ── KM-Fahrten Liste ── */}
          {(ansicht === 'beide' || ansicht === 'km') && (
            <div style={card}>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f4f1eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: 1 }}>
                  🚗 Fahrten {ansicht === 'beide' ? '(letzte 6)' : `(${kmFahrten.length} gesamt)`}
                </div>
                {ansicht === 'km' && (
                  <div style={{ fontSize: 11, color: '#aaa' }}>
                    Gesamt: {fmtKm(totalKm)} km · € {fmt(totalKmGeld)}
                  </div>
                )}
              </div>
              {laden ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#ccc', fontSize: 13 }}>⏳ Lädt...</div>
              ) : kmFahrten.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#ccc', fontSize: 13 }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>🚗</div>
                  Keine Fahrten für {jahr}
                </div>
              ) : (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[...kmFahrten].reverse().slice(0, ansicht === 'beide' ? 6 : kmFahrten.length).map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                      borderRadius: 9, background: '#fafaf8', border: '1px solid #f0ece4',
                      borderLeft: `3px solid ${f.in_guv ? GRUEN : GOLD}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.zweck || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📅 {f.datum ? new Date(f.datum).toLocaleDateString('de-AT') : '—'}
                          {f.start_adresse ? ` · 📍 ${f.start_adresse.split(',')[0]}` : ''}
                          {f.ziel_adresse ? ` → ${f.ziel_adresse.split(',')[0]}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: BLAU }}>
                          {Number(f.km_gefahren).toFixed(1)} km
                        </div>
                        <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>
                          € {fmt(Number(f.km_gefahren) * kmSatz)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: f.in_guv ? '#d1fae5' : '#fef3c7',
                        color: f.in_guv ? GRUEN : '#92400e', flexShrink: 0,
                      }}>
                        {f.in_guv ? '✓ G&V' : 'offen'}
                      </div>
                    </div>
                  ))}
                  {ansicht === 'beide' && kmFahrten.length > 6 && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '6px', marginTop: 2 }}>
                      + {kmFahrten.length - 6} weitere Fahrten → Tab „🚗 KM-Buch" öffnen
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── G&V Liste ── */}
          {(ansicht === 'beide' || ansicht === 'guv') && (
            <div style={card}>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f4f1eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: BLAU, textTransform: 'uppercase', letterSpacing: 1 }}>
                  💰 G&V Einträge {ansicht === 'beide' ? '(letzte 8)' : `(${gefilterteGuv.length})`}
                </div>
                {ansicht === 'guv' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['alle', 'einnahme', 'ausgabe'] as const).map(f => (
                      <button key={f} onClick={() => setFilterGuv(f)} style={{
                        padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: filterGuv === f ? '#1a2a3a' : '#f4f1eb',
                        color: filterGuv === f ? 'white' : '#888',
                      }}>
                        {f === 'alle' ? 'Alle' : f === 'einnahme' ? '↑ Einnahmen' : '↓ Ausgaben'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {laden ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#ccc', fontSize: 13 }}>⏳ Lädt...</div>
              ) : gefilterteGuv.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#ccc', fontSize: 13 }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>💰</div>
                  Keine Einträge für {jahr}
                </div>
              ) : (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[...gefilterteGuv].reverse().slice(0, ansicht === 'beide' ? 8 : gefilterteGuv.length).map(e => (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                      borderRadius: 9, background: '#fafaf8', border: '1px solid #f0ece4',
                      borderLeft: `3px solid ${e.typ === 'einnahme' ? GRUEN : ROT}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.bezeichnung || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
                          📅 {e.datum ? new Date(e.datum).toLocaleDateString('de-AT') : '—'} · 📂 {e.kategorie}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: e.typ === 'einnahme' ? GRUEN : ROT }}>
                          {e.typ === 'einnahme' ? '+' : '−'} € {fmt(Number(e.brutto))}
                        </div>
                        <div style={{ fontSize: 10, color: '#bbb' }}>{e.quelle}</div>
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                        background: e.typ === 'einnahme' ? '#d1fae5' : '#fee2e2',
                        color: e.typ === 'einnahme' ? GRUEN : ROT,
                      }}>
                        {e.typ === 'einnahme' ? '↑ Ein' : '↓ Aus'}
                      </div>
                    </div>
                  ))}
                  {ansicht === 'beide' && gefilterteGuv.length > 8 && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '6px', marginTop: 2 }}>
                      + {gefilterteGuv.length - 8} weitere → Tab „💰 G&V" öffnen
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
