# BelegFix Design-Umbau — Anleitung für Seiten-Konvertierung

Ziel: Jede Unterseite folgt dem Hell/Dunkel-Schalter (CSS-Variablen statt fixer Farben),
Emojis werden durch ruhige Chips/Text ersetzt, Buttons werden einheitlich.
**NUR Optik ändern — keinerlei Logik, Props, State oder API-Calls anfassen.**

## 1. Farb-Ersetzungstabelle (Inline-Styles)

Die CSS-Variablen sind am Dashboard-Root gesetzt und in allen Unterseiten verfügbar.

| Bisheriger Wert (typisch) | Ersetzen durch |
|---|---|
| `'white'`, `'#fff'`, `'#ffffff'` als Karten-/Panel-/Tabellen-Hintergrund | `'var(--bf-card)'` |
| `'#f5f3ef'`, `'#f8f7f4'`, `'#f9f8f6'` (weiche Boxen, Segment-Hintergründe) | `'var(--bf-soft)'` |
| `'#faf9f7'` u. ä. (Tabellenkopf) | `'var(--bf-thead)'` |
| `'#e5e0d8'`, `'#ddd'`, `'#e8e4dc'` (Rahmen um Karten/Boxen) | `'var(--bf-border)'` |
| `'#f0f0f0'`, `'#f0ede8'`, `'#eee'` (Zeilen-Trennlinien, borderBottom) | `'var(--bf-divider)'` |
| `'#1a1a1a'`, `'#222'`, `'#333'`, `'black'` (Haupttext, Überschriften) | `'var(--bf-text)'` |
| `'#555'`, `'#666'`, `'#444'` (Sekundärtext) | `'var(--bf-text-soft)'` |
| `'#888'`, `'#999'`, `'#aaa'`, `'#bbb'` (Labels, Hints, Platzhaltertext) | `'var(--bf-text-muted)'` |
| Input/Select/Textarea `background:'white'` | `'var(--bf-input-bg)'` |
| Input/Select/Textarea `border ... #e5e0d8/#ddd` | `'var(--bf-input-border)'` |
| Hover-Hintergründe (`#f8f7f4`, `rgba(0,0,0,0.03)` …) | `'var(--bf-hover)'` |
| Karten-`boxShadow` (fixe rgba-Schatten) | `'var(--bf-shadow)'` |
| Modal-Hintergrund `white` | `'var(--bf-card)'` |
| Modal-Overlay `rgba(0,0,0,0.5)` | unverändert lassen |

WICHTIG:
- Auch `color`/`background` in verschachtelten Ternaries ersetzen (beide Zweige prüfen).
- Statusfarben (grün/rot/orange/blau, z. B. `#10b981`, `#ef4444`, `#f59e0b`) NICHT ersetzen — die bleiben.
- Der Gold-Akzent `#c8a96e` bleibt ebenfalls.
- Charts/Balken-Farben bleiben.
- Texte in farbigen Buttons (weiß auf Verlauf) bleiben weiß.

## 2. Emojis ersetzen

- **Status-Anzeigen** (`📝 Entwurf`, `📬 Gesendet`, `✅ Bezahlt`, `🔴 Mahnung`, `✅/❌` etc.):
  `import { StatusChip, statusFarbe } from '../ui/theme'` verwenden.
  `<StatusChip status={r.status} />` rendert einen farbigen Punkt + Text im Theme-Ton.
  In `<option>`-Elementen (native Selects) einfach den Emoji-Präfix entfernen (nur Text).
- **Dekor-Emojis** in Überschriften, Labels, Buttons (`🏢`, `👤`, `📊`, `💾`, `🔍` im Placeholder, `➕` …):
  ersatzlos entfernen. Placeholder `"🔍 Kunden suchen..."` → `"Kunden suchen..."`.
- **Leere-Zustands-Emojis** (großes `📄`/`✅` über "Keine Einträge"): entfernen, nur Text behalten
  (Textfarbe `var(--bf-text-muted)`).
- Ausnahme: Emojis, die ECHTE Daten sind (z. B. vom User eingegeben), nie anfassen.

## 3. Buttons vereinheitlichen

`import { btnPrimary, btnSecondary } from '../ui/theme'`

- **Haupt-Aktion** der Seite (z. B. „+ Neue Rechnung", „+ Neuer Kunde", „Speichern"):
  `style={{ ...btnPrimary }}` (ggf. mit zusätzlichen Layout-Props wie display/gap).
  Bisherige schwarze (`#1a1a1a`) oder sonstige Primär-Buttons ersetzen.
- **Neben-Aktionen** (Abbrechen, Filter, Export): `style={{ ...btnSecondary }}`.
- Gefährliche Aktionen (Löschen) behalten Rot (`#ef4444`), aber als ruhiger Sekundär-Stil:
  `{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)' }`.

## 4. Sonstiges

- Beträge in Tabellen: `fontVariantNumeric: 'tabular-nums'` ergänzen, rechtsbündig lassen.
- Relative Import-Pfade beachten: von `src/seiten/*` aus ist es `'../ui/theme'`.
- Nach dem Umbau MUSS `./node_modules/.bin/tsc --noEmit` fehlerfrei sein.
- Keine neuen Abhängigkeiten installieren. Keine Dateien umbenennen.
