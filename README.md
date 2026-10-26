# kuntsolutions.de

Webseite der Kunt Solutions UG (Unternehmensberatung, „Upgrade your business“): Leistungen, Branchen, Vorgehen, Projekte (STARKSPAN, Gründarium, TRUCKPARTS24, KariyerSen), Kontaktformular,
Sprachen DE/TR/EN (`T` in `index.html`), dazu Impressum und Datenschutz. Statisch, `server.js` ohne Abhängigkeiten
(Port 3000, `/health`, `www.` → ohne www). Läuft in Coolify mit dem `Dockerfile` (Repo `kuntsolutions`, Branch `main`).

Kontaktformular: `POST /api/kontakt` speichert in `DATA_DIR/anfragen.jsonl` (in Coolify ein Volume auf `/app/data`) und schickt eine Mail
an `KONTAKT_TO` (mehrere mit Komma, sonst info@kuntsolutions.de, Antworten gehen per Reply-To an den Absender):
- über SMTP (Strato): `SMTP_HOST=smtp.strato.de`, `SMTP_PORT=465`, `SMTP_USER=info@kuntsolutions.de`, `SMTP_PASS=…` (optional `MAIL_FROM`, `SMTP_SECURE`)
- sonst über Resend: `RESEND_API_KEY`, `MAIL_FROM`.
Logo in `assets/`.

## Fotos
Die Seite lädt Fotos über `/img/<name>.jpg` (Namen: skyline, laptop, ki, handel, wachstum, team, meeting, zahlen).
Liegt `assets/img/<name>.jpg` im Repo (eigenes Foto), wird das genommen. Sonst holt der Server einmalig das
Unsplash-Foto aus `FOTOS` in `server.js` und speichert es in `DATA_DIR/img`. Ohne Internet: die Zeichnung `<name>.svg`.
Anderes Foto: eigene Datei als `assets/img/<name>.jpg` ablegen oder die Unsplash-ID in `FOTOS` ändern
(und `DATA_DIR/img/<name>.jpg` löschen).

## Mail prüfen
In Coolify `ADMIN_KEY` setzen (mindestens 12 Zeichen). Dann:
- `https://kuntsolutions.de/api/mailtest?key=ADMIN_KEY` schickt eine Testmail an `KONTAKT_TO` und zeigt „Gesendet“ oder die genaue Fehlermeldung (höchstens 5 pro Stunde).
- `https://kuntsolutions.de/anfragen?key=ADMIN_KEY` listet alle gespeicherten Anfragen mit Mail-Status.
Beim Start steht im Log, ob die Mail eingerichtet ist. Anfragen liegen in `DATA_DIR/anfragen.jsonl` – dafür ein Volume auf `/app/data` anlegen.

## Bestätigung an Kunden und Signatur
Jede Anfrage bekommt automatisch eine Eingangsbestätigung in der Sprache der Seite (`mails.js`, `confirmMail`), höchstens eine pro Adresse in 10 Minuten und 40 pro Stunde.
`node mails.js` erzeugt `email/signatur.html` (Signatur für Outlook) und `email/vorschau.html` (Vorschau der Bestätigung).

## Partner & Marken
Partnerkarten zeigen ein Bild der echten Webseite (`/ref/<id>.jpg`, über WordPress mShots) und das Icon der Seite (`/ref/<id>-logo.png`), vom Server geladen und 14 Tage in `DATA_DIR/ref` gespeichert. Eigene Dateien `assets/ref/<id>.jpg` bzw. `<id>-logo.png` haben Vorrang. Partner stehen in `REFS` (server.js) und im Abschnitt `#referenzen` (index.html). Logos der eigenen Marken liegen in `assets/brands/`.

## Admin-Bereich und Statistik
`https://kuntsolutions.de/admin` – Anmeldung mit `ADMIN_KEY` (Cookie 30 Tage, höchstens 10 Fehlversuche pro Stunde). Danach sind auch `/anfragen` und `/api/mailtest` ohne `?key=` erreichbar.
Das Dashboard zeigt Besucher, Seitenaufrufe, Ø Besuchsdauer, Absprungrate, Anfragen und Anfragen je Besucher (mit Vergleich zum Vorzeitraum), Verlauf, Seiten, Herkunft, Kampagnen (`?utm_source=` oder `?ref=`), gesehene Abschnitte der Startseite, Tageszeit, Geräte, Browser, Betriebssystem, Sprache und Klicks auf Telefon/E-Mail/externe Links.
Gemessen wird selbst, ohne Cookies und fremde Dienste: `assets/a.js` meldet an `POST /api/hit`, `stats.js` speichert in `DATA_DIR/stats/<Datum>.jsonl` (also im selben Volume `/app/data`). Keine IP-Adressen, Besucher nur über einen täglich wechselnden Hash erkennbar, Bots und angemeldete Admins werden nicht gezählt, Browser mit „Do Not Track“ auch nicht. Rohdaten werden nach `STATS_DAYS` Tagen (Standard 400) gelöscht. Datenschutzerklärung ist angepasst.
