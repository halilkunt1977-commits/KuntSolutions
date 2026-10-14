# kuntsolutions.de

Webseite der Kunt Solutions UG (Unternehmensberatung, „Upgrade your business“): Leistungen, Branchen, Vorgehen, Projekte (STARKSPAN, Gründarium, TRUCKPARTS24, KariyerSen), Kontaktformular,
Sprachen DE/TR/EN (`T` in `index.html`), dazu Impressum und Datenschutz. Statisch, `server.js` ohne Abhängigkeiten
(Port 3000, `/health`, `www.` → ohne www). Läuft in Coolify mit dem `Dockerfile` (Repo `kuntsolutions`, Branch `main`).

Kontaktformular: `POST /api/kontakt` speichert in `DATA_DIR/anfragen.jsonl` (in Coolify ein Volume auf `/app/data`) und schickt eine Mail über Resend,
wenn `RESEND_API_KEY` und `MAIL_FROM` gesetzt sind (Empfänger `KONTAKT_TO`, mehrere mit Komma, sonst info@kuntsolutions.de). Logo in `assets/`.
