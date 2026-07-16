import React from 'react'

// ── BelegFix Design-Tokens ──────────────────────────────────────────────────
// Die CSS-Variablen werden in Dashboard.tsx (Root-Container) je nach
// Hell/Dunkel-Modus gesetzt. Unterseiten verwenden ausschließlich diese
// Tokens statt fixer Farben, damit beide Themes überall funktionieren.
//
// Verfügbare Variablen:
//   --bf-card          Karten/Panel-Hintergrund
//   --bf-soft          weiche Fläche (Info-Boxen, Segmente)
//   --bf-thead         Tabellenkopf-Hintergrund
//   --bf-border        Rahmen um Karten/Inputs
//   --bf-divider       Trennlinien (Tabellenzeilen)
//   --bf-text          Haupttext
//   --bf-text-soft     Sekundärtext
//   --bf-text-muted    Beschriftungen/Hints
//   --bf-input-bg      Eingabefelder Hintergrund
//   --bf-input-border  Eingabefelder Rahmen
//   --bf-hover         Hover-Fläche für Zeilen/Listen
//   --bf-shadow        Karten-Schatten

export const ACCENT = '#6366f1'
export const ACCENT_2 = '#8b5cf6'
export const GOLD = '#c8a96e'

// Primär-Button (eine Optik in der ganzen App)
export const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
  color: 'white',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 9,
  padding: '9px 16px',
  fontFamily: 'Syne, sans-serif',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
}

// Sekundär-Button (ruhig, folgt dem Theme)
export const btnSecondary: React.CSSProperties = {
  background: 'var(--bf-soft)',
  color: 'var(--bf-text)',
  border: '1px solid var(--bf-border)',
  borderRadius: 9,
  padding: '9px 16px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
}

// Status → Farbton (funktioniert auf hellem und dunklem Grund,
// weil die Farbe nur den Punkt trägt, der Text bleibt im Theme-Ton)
export const STATUS_FARBEN: Record<string, string> = {
  'Entwurf':    '#94a3b8',
  'Gesendet':   ACCENT,
  'Offen':      '#f59e0b',
  'Bezahlt':    '#10b981',
  'Angenommen': '#10b981',
  'Abgelehnt':  '#ef4444',
  'Mahnung 1':  '#f59e0b',
  'Mahnung 2':  '#ef4444',
  'Mahnung 3':  '#dc2626',
  'Überfällig': '#ef4444',
  'Einnahme':   '#10b981',
  'Ausgabe':    '#ef4444',
  'Privat':     '#94a3b8',
  'Geschäftlich': ACCENT,
  'Rechnung':   ACCENT,
  'Angebot':    ACCENT_2,
}

export function statusFarbe(status: string): string {
  return STATUS_FARBEN[status] || '#94a3b8'
}

// Moderner Status-Chip: farbiger Punkt + Text im Theme-Ton (statt Emoji)
export function StatusChip({ status, label }: { status: string; label?: string }) {
  const farbe = statusFarbe(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: 'var(--bf-soft)', border: '1px solid var(--bf-border)',
      color: 'var(--bf-text-soft)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: farbe, boxShadow: `0 0 6px ${farbe}66`, flexShrink: 0 }} />
      {label || status}
    </span>
  )
}
