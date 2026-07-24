# BelegFix (scanpro-frontend) — Aktueller Stand

**Letztes Update**: 2026-07-15
**Live**: https://frontend-phi-six-46.vercel.app
**Backend**: https://scanpro-backend-production.up.railway.app/api (Repo `office221/scanpro-backend`, lokal: /root/projekt/scanpro-backend)
**DB**: Supabase Project `wrenjwweaojnieviphbl`, eu-west-1

## Wo wir stehen

GitHub-Zugang eingerichtet (gh als office221, `gh auth setup-git` konfiguriert).

**Design-Umbau (Hell/Dunkel-Tokens, Emojis raus, einheitliche Buttons) — 16.07.2026 abgeschlossen, 17.07.2026 LIVE:** Alle 18 Seiten in src/seiten/ auf DESIGN-TOKENS.md umgestellt (zuletzt ImmoObjektDetail.tsx, KMBuch.tsx + Rest-Aufräumer). `tsc --noEmit` und `npm run build` fehlerfrei. Commit b5edf45 auf Branch fix/auto-logout-401 (lokal, noch NICHT nach origin gepusht). Production-Deploy 17.07.2026 (frontend-c6t32fh0w) → live auf frontend-phi-six-46.vercel.app. Enthält auch den bisherigen Branch-Stand (401-Auto-Logout, Dashboard-Finanzkarte, Kunden-Häkchen nameAufRechnung).

**Wartet auf Freigabe des Users (Deploy-Reihenfolge: erst Backend, dann Frontend):**
1. Backend-Branch `feature/name-auf-rechnung` (gepusht) → auf main mergen → Railway deployt automatisch, sequelize.sync legt Spalte `nameAufRechnung` an
2. Frontend-Branch `fix/auto-logout-401` (gepusht) enthält: 401-Auto-Logout, Dashboard-Finanzen-Karte (G&V + Kleinunternehmergrenze-Tracker), Kunden-Checkbox "Ansprechpartner auf Rechnung anzeigen" → mergen + `vercel deploy --prod` (Projekt verlinkt, CLI eingeloggt)
3. Preview des Dashboards: https://frontend-gmh4dgym1-office221s-projects.vercel.app

## Roadmap zur Vermietbarkeit

Siehe `/root/.claude/projects/-root-projekt/memory/project_belegfix_saas_roadmap.md`

**Phase 1 (Software solide machen — vor allem anderen):**
- [x] 401-Auto-Logout Frontend (Branch gepusht)
- [ ] **NEU: XSS/HTML-Escaping in PDF.js** — Kundendaten (Namen, Firma, Positionen, Projektname) werden unescaped in den HTML-Template-String interpoliert, der via Puppeteer gerendert wird. Vom Senior-Dev-Review gefunden, betrifft das ganze Template (Bestandsproblem, nicht nur Empfängerblock). Vor SaaS-Vermietung fixen: zentrale escapeHtml()-Funktion.
- [ ] Passwort-vergessen-Flow (Backend-Endpoint + Frontend-Seite + Mail)
- [ ] Email-Provider sauber konfiguriert (Brevo/Resend) für Verifizierung & Mahn-Mails
- [ ] DB-Passwort der Supabase rotieren
- [ ] App-Passwort ändern (stand im Chat) → BelegFix Einstellungen → Passwort ändern, danach /root/projekt/belegfix-mcp/.env aktualisieren

**Phase 2 (verkaufsfähig machen):**
- [ ] Stripe-Integration für Trial → Bezahl-Abo
- [ ] 2FA-Login (Email-Code oder TOTP)

**Phase 3 (rechtlich vor Kunde Nr. 1):**
- [ ] AGB, Datenschutzerklärung, Impressum
- [ ] AVV mit Vercel/Railway/Supabase
- [ ] Datenexport pro User (DSGVO Art. 20)
- [ ] Account-Löschen mit Cascade

## Datenqualität (Hinweis an User, 2026-07-15)
- 8 mögliche Duplikate in G&V 2026 (gleicher Tag/Bezeichnung/Betrag, z. B. Google Ads, Leica-Wochenlizenz)
- Juni-Rechnungen waren am 15.7. noch nicht als G&V-Einnahmen erfasst
