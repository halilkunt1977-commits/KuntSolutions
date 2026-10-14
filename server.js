// Kunt Solutions: kleiner Webserver ohne Abhängigkeiten (Coolify, Port 3000, Healthcheck /health).
// POST /api/kontakt speichert Anfragen in DATA_DIR/anfragen.jsonl und meldet sie per Resend,
// wenn RESEND_API_KEY und MAIL_FROM gesetzt sind (Empfänger KONTAKT_TO, sonst info@kuntsolutions.de).
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = __dirname, PORT = process.env.PORT || 3000, DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PAGES = { "/": "index.html", "/impressum": "impressum.html", "/datenschutz": "datenschutz.html" };
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const PUBLIC = new Set(["index.html", "impressum.html", "datenschutz.html", "robots.txt", "sitemap.xml"]);
const hits = new Map();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 50000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
  });
}

async function kontakt(req, res) {
  const json = (code, o) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now); hits.set(ip, list);
  if (list.length > 8) return json(429, { error: "Zu viele Anfragen." });
  const d = await readBody(req);
  if (d.website) return json(200, { ok: true }); // Honeypot
  const a = { ts: new Date().toISOString(), name: clean(d.name, 120), company: clean(d.company, 160), email: clean(d.email, 200), phone: clean(d.phone, 60), topic: clean(d.topic, 80), message: clean(d.message, 4000), lang: clean(d.lang, 5) };
  if (!a.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) || !a.message || d.consent !== true) return json(400, { error: "Pflichtfelder fehlen." });
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.appendFileSync(path.join(DATA_DIR, "anfragen.jsonl"), JSON.stringify(a) + "\n"); } catch (e) { console.error("Anfrage nicht gespeichert:", e.message); }
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    const rows = [["Name", a.name], ["Unternehmen", a.company || "–"], ["E-Mail", a.email], ["Telefon", a.phone || "–"], ["Thema", a.topic || "–"], ["Nachricht", a.message]];
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.MAIL_FROM,
          to: String(process.env.KONTAKT_TO || "info@kuntsolutions.de").split(",").map((s) => s.trim()).filter(Boolean),
          reply_to: a.email,
          subject: `Neue Beratungsanfrage: ${a.topic || "Allgemein"} – ${a.name}${a.company ? " (" + a.company + ")" : ""}`,
          text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;color:#0f1430"><div style="font-size:20px;font-weight:800;color:#141c55">KUNT SOLUTIONS · Neue Anfrage</div><table style="margin-top:16px;border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5d6385;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table><p style="color:#5d6385;font-size:13px">Mit „Antworten“ schreiben Sie direkt an ${esc(a.email)}.</p></div>`,
        }),
      });
      if (!r.ok) console.error("Resend:", r.status, await r.text());
    } catch (e) { console.error("Mail fehlgeschlagen:", e.message); }
  }
  json(200, { ok: true });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  const host = String(req.headers.host || "");
  if (host.startsWith("www.")) { res.writeHead(301, { Location: "https://" + host.slice(4) + req.url }); return res.end(); }
  if (url.pathname === "/api/kontakt" && req.method === "POST") return kontakt(req, res);
  let name = PAGES[url.pathname] || url.pathname.replace(/^\/+/, "");
  const ok = PUBLIC.has(name) || (/^assets\/[\w.-]+$/.test(name) && fs.existsSync(path.join(ROOT, name)));
  if (!ok) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res); }
  const ext = path.extname(name);
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=604800", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
  fs.createReadStream(path.join(ROOT, name)).pipe(res);
}).listen(PORT, "0.0.0.0", () => console.log("Kunt Solutions läuft auf Port " + PORT));
