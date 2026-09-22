import React, { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

// Statistik: Umsatz, Ausgaben und Gewinn pro Monat aus der G&V, dazu offene
// Rechnungen und die umsatzstärksten Kunden. Gewinn = Einnahmen − Ausgaben brutto
// (Kleinunternehmer: keine Vorsteuer, die Ausgaben zählen voll).

interface GuvEintrag { datum: string; typ: 'einnahme' | 'ausgabe'; brutto: string }
interface Rechnung { id: number; typ: string; status: string; gesamt: string; datum: string; bezahltAm: string | null; kundeId: number }
interface Kunde { id: number; vorname: string; nachname: string; firma: string }

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const KLEINUNTERNEHMER_GRENZE = 55000

// Farben geprüft (Farbsehschwäche, Kontrast) für hell und dunkel
const FARBEN = {
  hell:   { umsatz: '#6366f1', ausgaben: '#b7791f' },
  dunkel: { umsatz: '#7b7ef0', ausgaben: '#b8822a' },
}

const eur = (n: number) => '€ ' + n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const eurKurz = (n: number) => Math.abs(n) >= 1000
  ? '€ ' + (n / 1000).toLocaleString('de-AT', { maximumFractionDigits: 1 }) + 'k'
  : '€ ' + Math.round(n).toLocaleString('de-AT')

const kundenName = (k?: Kunde) => !k ? 'Unbekannt' : (k.firma || `${k.vorname || ''} ${k.nachname || ''}`.trim() || 'Unbekannt')

export default function Statistik() {
  const aktuellesJahr = new Date().getFullYear()
  const [jahr, setJahr] = useState(aktuellesJahr)
  const [guv, setGuv] = useState<GuvEintrag[]>([])
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [laden, setLaden] = useState(true)
  const [monat, setMonat] = useState<number | null>(null)
  const [tabelle, setTabelle] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    Promise.all([api.get('/rechnungen'), api.get('/kunden')])
      .then(([r, k]) => { setRechnungen(r.data); setKunden(k.data) })
      .catch(e => console.error(e))
  }, [])

  useEffect(() => {
    setLaden(true)
    setMonat(null)
    api.get(`/guv?jahr=${jahr}`)
      .then(r => setGuv(Array.isArray(r.data) ? r.data : []))
      .catch(() => setGuv([]))
      .finally(() => setLaden(false))
  }, [jahr])

  const dunkel = localStorage.getItem('belegfix_dark') !== 'false'
  const farbe = dunkel ? FARBEN.dunkel : FARBEN.hell

  const monate = useMemo(() => {
    const m = MONATE.map((label, i) => ({ label, i, umsatz: 0, ausgaben: 0, gewinn: 0 }))
    guv.forEach(e => {
      const d = new Date(e.datum)
      if (isNaN(d.getTime()) || d.getFullYear() !== jahr) return
      const betrag = Number(e.brutto) || 0
      if (e.typ === 'einnahme') m[d.getMonth()].umsatz += betrag
      else m[d.getMonth()].ausgaben += betrag
    })
    m.forEach(x => { x.gewinn = x.umsatz - x.ausgaben })
    return m
  }, [guv, jahr])

  // Bis zum aktuellen Monat zählen, damit der Monatsschnitt nicht durch leere Zukunftsmonate sinkt
  const letzterMonat = jahr === aktuellesJahr ? new Date().getMonth() : 11
  const umsatz   = monate.reduce((s, m) => s + m.umsatz, 0)
  const ausgaben = monate.reduce((s, m) => s + m.ausgaben, 0)
  const gewinn   = umsatz - ausgaben
  const marge    = umsatz > 0 ? (gewinn / umsatz) * 100 : 0
  const schnitt  = umsatz / (letzterMonat + 1)

  const offen = rechnungen.filter(r => r.typ === 'Rechnung' && !['Bezahlt', 'Storniert', 'Entwurf'].includes(r.status))
  const offenSumme = offen.reduce((s, r) => s + (parseFloat(r.gesamt) || 0), 0)

  const topKunden = useMemo(() => {
    const summe: Record<number, number> = {}
    rechnungen
      .filter(r => r.typ === 'Rechnung' && r.status === 'Bezahlt')
      .filter(r => new Date(r.bezahltAm || r.datum).getFullYear() === jahr)
      .forEach(r => { summe[r.kundeId] = (summe[r.kundeId] || 0) + (parseFloat(r.gesamt) || 0) })
    return Object.entries(summe)
      .map(([id, betrag]) => ({ name: kundenName(kunden.find(k => k.id === Number(id))), betrag }))
      .sort((a, b) => b.betrag - a.betrag)
      .slice(0, 5)
  }, [rechnungen, kunden, jahr])

  const jahre = [aktuellesJahr, aktuellesJahr - 1, aktuellesJahr - 2]

  const karte: React.CSSProperties = {
    background: 'var(--bf-card)', borderRadius: 16, border: '1px solid var(--bf-border)',
    boxShadow: 'var(--bf-shadow)', padding: isMobile ? 16 : 20,
  }
  const titel: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--bf-text)' }
  const unter: React.CSSProperties = { fontSize: 11, color: 'var(--bf-text-muted)', marginTop: 2 }

  const kacheln = [
    { label: 'Umsatz', wert: eur(umsatz), sub: `Ø ${eur(schnitt)} / Monat` },
    { label: 'Ausgaben', wert: eur(ausgaben), sub: 'brutto' },
    { label: 'Gewinn', wert: eur(gewinn), sub: umsatz > 0 ? `Marge ${marge.toLocaleString('de-AT', { maximumFractionDigits: 0 })} %` : '—', negativ: gewinn < 0 },
    { label: 'Offene Rechnungen', wert: eur(offenSumme), sub: `${offen.length} ${offen.length === 1 ? 'Rechnung' : 'Rechnungen'}` },
  ]

  // ── Diagramm-Geometrie ──────────────────────────────────────────────────
  const H = 180
  const maxBalken = Math.max(1, ...monate.map(m => Math.max(m.umsatz, m.ausgaben)))
  const kumuliert = monate.reduce<number[]>((acc, m, i) => { acc.push((acc[i - 1] || 0) + m.gewinn); return acc }, [])
    .slice(0, letzterMonat + 1)
  const kMax = Math.max(0, ...kumuliert), kMin = Math.min(0, ...kumuliert)
  const kSpanne = Math.max(1, kMax - kMin)
  const W = 600, LH = 160
  const kx = (i: number) => 24 + (i / 11) * (W - 48)
  const ky = (v: number) => 12 + (1 - (v - kMin) / kSpanne) * (LH - 24)
  const gewaehlt = monat !== null ? monate[monat] : null

  return (
    <div style={{ padding: isMobile ? 0 : 28, fontFamily: 'DM Sans, sans-serif', maxWidth: 960, margin: '0 auto', color: 'var(--bf-text)' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0 }}>Statistik</h2>
        <div style={{ fontSize: 12, color: 'var(--bf-text-muted)', marginTop: 4 }}>Umsatz, Ausgaben und Gewinn {jahr} · aus der G&V</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {jahre.map(j => (
            <button key={j} onClick={() => setJahr(j)} style={{
              padding: '8px 18px', minHeight: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              background: j === jahr ? 'var(--bf-text)' : 'var(--bf-soft)',
              color: j === jahr ? 'var(--bf-card)' : 'var(--bf-text-muted)',
            }}>{j}</button>
          ))}
        </div>
      </div>

      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {kacheln.map(k => (
          <div key={k.label} style={karte}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--bf-text-muted)' }}>{k.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 17 : 21, fontWeight: 800, marginTop: 8, lineHeight: 1.15,
              color: k.negativ ? '#dc2626' : 'var(--bf-text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{k.wert}</div>
            <div style={unter}>{k.sub}</div>
          </div>
        ))}
      </div>

      {laden ? (
        <div style={{ ...karte, textAlign: 'center', color: 'var(--bf-text-muted)' }}>Laden…</div>
      ) : (
        <>
          {/* Umsatz & Ausgaben pro Monat */}
          <div style={{ ...karte, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <div style={titel}>Umsatz & Ausgaben pro Monat</div>
                <div style={unter}>Monat antippen für Details</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--bf-text-soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: farbe.umsatz }} />Umsatz</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: farbe.ausgaben }} />Ausgaben</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 2 : 6, height: H, borderBottom: '1px solid var(--bf-border)' }}>
              {monate.map(m => {
                const aktiv = monat === m.i
                return (
                  <button key={m.i} onClick={() => setMonat(aktiv ? null : m.i)}
                    title={`${m.label}: Umsatz ${eur(m.umsatz)} · Ausgaben ${eur(m.ausgaben)} · Gewinn ${eur(m.gewinn)}`}
                    aria-label={`${m.label}: Umsatz ${eur(m.umsatz)}, Ausgaben ${eur(m.ausgaben)}`}
                    style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2,
                      background: aktiv ? 'var(--bf-hover)' : 'transparent', border: 'none', borderRadius: '6px 6px 0 0', padding: 0, cursor: 'pointer',
                      opacity: monat === null || aktiv ? 1 : 0.45 }}>
                    <span style={{ width: '42%', maxWidth: 14, height: `${(m.umsatz / maxBalken) * 100}%`, minHeight: m.umsatz > 0 ? 2 : 0, background: farbe.umsatz, borderRadius: '4px 4px 0 0' }} />
                    <span style={{ width: '42%', maxWidth: 14, height: `${(m.ausgaben / maxBalken) * 100}%`, minHeight: m.ausgaben > 0 ? 2 : 0, background: farbe.ausgaben, borderRadius: '4px 4px 0 0' }} />
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 2 : 6, marginTop: 6 }}>
              {monate.map(m => (
                <div key={m.i} style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 9 : 10, color: monat === m.i ? 'var(--bf-text)' : 'var(--bf-text-muted)', fontWeight: monat === m.i ? 700 : 400 }}>{m.label}</div>
              ))}
            </div>
            {gewaehlt && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bf-soft)', display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 13 }}>
                <strong style={{ minWidth: 40 }}>{gewaehlt.label} {jahr}</strong>
                <span>Umsatz <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{eur(gewaehlt.umsatz)}</strong></span>
                <span>Ausgaben <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{eur(gewaehlt.ausgaben)}</strong></span>
                <span>Gewinn <strong style={{ fontVariantNumeric: 'tabular-nums', color: gewaehlt.gewinn < 0 ? '#dc2626' : 'var(--bf-text)' }}>{eur(gewaehlt.gewinn)}</strong></span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 3fr) minmax(0, 2fr)', gap: 16, marginBottom: 16 }}>
            {/* Gewinn kumuliert */}
            <div style={karte}>
              <div style={titel}>Gewinn seit Jahresbeginn</div>
              <div style={unter}>Umsatz − Ausgaben, laufend aufsummiert</div>
              <svg viewBox={`0 0 ${W} ${LH + 18}`} style={{ width: '100%', height: 'auto', marginTop: 12, display: 'block' }} role="img"
                aria-label={`Gewinn seit Jahresbeginn: ${eur(kumuliert[kumuliert.length - 1] || 0)}`}>
                <line x1={0} x2={W} y1={ky(0)} y2={ky(0)} stroke="var(--bf-border)" strokeWidth={1} />
                {kumuliert.length > 1 && (
                  <>
                    <path d={`M${kx(0)},${ky(0)} ` + kumuliert.map((v, i) => `L${kx(i)},${ky(v)}`).join(' ') + ` L${kx(kumuliert.length - 1)},${ky(0)} Z`}
                      fill={farbe.umsatz} opacity={0.1} />
                    <polyline points={kumuliert.map((v, i) => `${kx(i)},${ky(v)}`).join(' ')}
                      fill="none" stroke={farbe.umsatz} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </>
                )}
                {kumuliert.length > 0 && (
                  <circle cx={kx(kumuliert.length - 1)} cy={ky(kumuliert[kumuliert.length - 1])} r={5} fill={farbe.umsatz} stroke="var(--bf-card)" strokeWidth={2} />
                )}
                {MONATE.map((l, i) => i % (isMobile ? 2 : 1) === 0 && (
                  <text key={l} x={kx(i)} y={LH + 14} textAnchor="middle" fontSize={isMobile ? 18 : 12} fill="var(--bf-text-muted)">{l}</text>
                ))}
              </svg>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--bf-text-soft)' }}>
                Stand {MONATE[letzterMonat]}: <strong style={{ color: 'var(--bf-text)', fontVariantNumeric: 'tabular-nums' }}>{eur(kumuliert[kumuliert.length - 1] || 0)}</strong>
              </div>
            </div>

            {/* Top-Kunden */}
            <div style={karte}>
              <div style={titel}>Top-Kunden {jahr}</div>
              <div style={unter}>bezahlte Rechnungen</div>
              {topKunden.length === 0 ? (
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--bf-text-muted)' }}>Keine bezahlten Rechnungen in {jahr}.</div>
              ) : (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topKunden.map(k => (
                    <div key={k.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 5 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{eurKurz(k.betrag)}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--bf-soft)' }}>
                        <div style={{ width: `${(k.betrag / topKunden[0].betrag) * 100}%`, height: '100%', borderRadius: 4, background: farbe.umsatz }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kleinunternehmergrenze */}
          <div style={{ ...karte, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={titel}>Kleinunternehmergrenze</div>
              <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{eur(umsatz)} von {eur(KLEINUNTERNEHMER_GRENZE)}</div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--bf-soft)', marginTop: 10 }}>
              <div style={{ width: `${Math.min(100, (umsatz / KLEINUNTERNEHMER_GRENZE) * 100)}%`, height: '100%', borderRadius: 5, background: farbe.umsatz }} />
            </div>
            <div style={unter}>{Math.round((umsatz / KLEINUNTERNEHMER_GRENZE) * 100)} % ausgeschöpft · noch {eur(Math.max(0, KLEINUNTERNEHMER_GRENZE - umsatz))} Spielraum</div>
          </div>

          {/* Tabelle */}
          <div style={karte}>
            <button onClick={() => setTabelle(t => !t)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...titel }}>
              {tabelle ? '▾' : '▸'} Monatswerte als Tabelle
            </button>
            {tabelle && (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr style={{ color: 'var(--bf-text-muted)', fontSize: 11, textAlign: 'right' }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Monat</th>
                      <th style={{ padding: '6px 4px' }}>Umsatz</th>
                      <th style={{ padding: '6px 4px' }}>Ausgaben</th>
                      <th style={{ padding: '6px 4px' }}>Gewinn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monate.map(m => (
                      <tr key={m.i} style={{ borderTop: '1px solid var(--bf-divider)', textAlign: 'right' }}>
                        <td style={{ textAlign: 'left', padding: '7px 4px' }}>{m.label}</td>
                        <td style={{ padding: '7px 4px' }}>{eur(m.umsatz)}</td>
                        <td style={{ padding: '7px 4px' }}>{eur(m.ausgaben)}</td>
                        <td style={{ padding: '7px 4px', color: m.gewinn < 0 ? '#dc2626' : undefined }}>{eur(m.gewinn)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--bf-border)', textAlign: 'right', fontWeight: 700 }}>
                      <td style={{ textAlign: 'left', padding: '7px 4px' }}>Summe</td>
                      <td style={{ padding: '7px 4px' }}>{eur(umsatz)}</td>
                      <td style={{ padding: '7px 4px' }}>{eur(ausgaben)}</td>
                      <td style={{ padding: '7px 4px', color: gewinn < 0 ? '#dc2626' : undefined }}>{eur(gewinn)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
