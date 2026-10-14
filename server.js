// Kunt Solutions: kleiner Webserver ohne Abhängigkeiten (Coolify, Port 3000, Healthcheck /health).
// POST /api/kontakt speichert Anfragen in DATA_DIR/anfragen.jsonl und schickt eine Mail an KONTAKT_TO
// (sonst info@kuntsolutions.de): bevorzugt über SMTP (Strato: SMTP_HOST=smtp.strato.de, SMTP_PORT=465,
// SMTP_USER, SMTP_PASS), sonst über Resend (RESEND_API_KEY, MAIL_FROM).
const http = require("http"), fs = require("fs"), path = require("path"), tls = require("tls"), net = require("net"), os = require("os"), zlib = require("zlib"), crypto = require("crypto");
const { confirmMail, leadMail } = require("./mails");
const ROOT = __dirname, PORT = process.env.PORT || 3000, DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PAGES = { "/": "index.html", "/impressum": "impressum.html", "/datenschutz": "datenschutz.html", "/signatur": "email/signatur.html" };
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const PUBLIC = new Set(["index.html", "impressum.html", "datenschutz.html", "robots.txt", "sitemap.xml", "email/signatur.html"]);
const hits = new Map(), GZ = new Map(), LOADING = new Map();
// Fotos: /img/<name>.jpg nimmt ein eigenes Foto aus assets/img/<name>.jpg, sonst einmalig ein Unsplash-Foto
// (Unsplash-Lizenz, frei auch gewerblich) in DATA_DIR/img – Besucher laden nichts von fremden Servern.
// Klappt beides nicht, kommt die Zeichnung assets/img/<name>.svg.
const FOTOS = { skyline: "1486406146926-c627a92ad1ab", laptop: "1551288049-bebda4e38f71", ki: "1485827404703-89b55fcc595e", handel: "1441986300917-64674bd600d8", wachstum: "1460925895917-afdab827c52f", team: "1522071820081-009f0129c71c", meeting: "1552664730-d307ca884978", zahlen: "1454165804606-c3d57bc86b40" };
const SVG_OF = { zahlen: "wachstum" };
async function foto(n) {
  const own = path.join(ROOT, "assets/img", n + ".jpg");
  if (fs.existsSync(own)) return own;
  const f = path.join(DATA_DIR, "img", n + ".jpg");
  if (fs.existsSync(f)) return f;
  if (!LOADING.has(n)) LOADING.set(n, (async () => {
    const r = await fetch("https://images.unsplash.com/photo-" + FOTOS[n] + "?w=1600&q=72&fm=jpg&fit=crop", { signal: AbortSignal.timeout(15000) });
    if (!r.ok || !/image/.test(r.headers.get("content-type") || "")) throw new Error("HTTP " + r.status);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f + ".tmp", Buffer.from(await r.arrayBuffer())); fs.renameSync(f + ".tmp", f);
    return f;
  })().finally(() => setTimeout(() => LOADING.delete(n), 60000)));
  return LOADING.get(n);
}
async function fotoRoute(n, req, res) {
  try {
    const f = await foto(n);
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800", "Content-Length": fs.statSync(f).size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error("Foto " + n + ":", e.message);
    res.writeHead(302, { Location: "/assets/img/" + (SVG_OF[n] || n) + ".svg", "Cache-Control": "no-cache" }); res.end();
  }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 50000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
  });
}


// Minimaler SMTP-Client (SMTPS Port 465 oder STARTTLS Port 587), AUTH LOGIN.
function smtpSend({ host, port, secure, user, pass, from, to, replyTo, subject, text, html }) {
  return new Promise((resolve, reject) => {
    const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
    const enc = (s) => "=?UTF-8?B?" + b64(s) + "?=";
    const bound = "ks" + Date.now().toString(36);
    const addr = (s) => (String(s).match(/<([^>]+)>/) || [, s])[1].trim();
    const name = (String(from).match(/^(.*)<[^>]+>/) || [, ""])[1].trim();
    const body = [
      `From: ${name ? enc(name) + " " : ""}<${addr(from)}>`, `To: ${to.join(", ")}`, replyTo ? `Reply-To: ${replyTo}` : null,
      `Subject: ${enc(subject)}`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${addr(from).split("@")[1]}>`,
      "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${bound}"`, "",
      `--${bound}`, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(text).replace(/.{76}/g, "$&\r\n"),
      `--${bound}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(html).replace(/.{76}/g, "$&\r\n"), `--${bound}--`, "",
    ].filter((l) => l !== null).join("\r\n");
    const steps = [
      [null, 220], [() => `EHLO ${os.hostname() || "kuntsolutions"}`, 250],
      ...(secure ? [] : [[() => "STARTTLS", 220, "tls"], [() => `EHLO ${os.hostname() || "kuntsolutions"}`, 250]]),
      [() => "AUTH LOGIN", 334], [() => b64(user), 334], [() => b64(pass), 235],
      [() => `MAIL FROM:<${addr(from)}>`, 250], ...to.map((t) => [() => `RCPT TO:<${addr(t)}>`, 250]),
      [() => "DATA", 354], [() => body + "\r\n.", 250], [() => "QUIT", 221],
    ];
    let sock, buf = "", i = 0, done = false;
    const fail = (e) => { if (done) return; done = true; try { sock.destroy(); } catch {} reject(e instanceof Error ? e : new Error(e)); };
    const timer = setTimeout(() => fail("SMTP Timeout"), 20000);
    const onData = (d) => {
      buf += d.toString();
      const lines = buf.split("\r\n"); if (!buf.endsWith("\r\n")) return;
      const last = lines.filter(Boolean).pop() || ""; if (/^\d{3}-/.test(last)) return; buf = "";
      const code = parseInt(last, 10), [, want, mode] = steps[i];
      if (code !== want) return fail(`SMTP ${steps[i][0] ? "" : "Begrüßung"} erwartet ${want}, bekam: ${last}`);
      i++;
      if (mode === "tls") { sock.removeAllListeners("data"); sock = tls.connect({ socket: sock, servername: host }, () => next()); sock.on("data", onData); sock.on("error", fail); return; }
      next();
    };
    const next = () => { if (i >= steps.length) { done = true; clearTimeout(timer); try { sock.end(); } catch {} return resolve(); } sock.write(steps[i][0]() + "\r\n"); };
    sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    sock.on("data", onData); sock.on("error", fail);
  });
}

// Mail über SMTP (bevorzugt) oder Resend. Ergebnis: true = gesendet, false = nicht eingerichtet; Fehler werden geworfen.
const smtpOn = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailInfo = () => smtpOn() ? `SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465} als ${process.env.SMTP_USER}` : process.env.RESEND_API_KEY && process.env.MAIL_FROM ? "Resend als " + process.env.MAIL_FROM : "";
const mailMissing = () => ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !process.env[k]);
async function sendMail({ to, replyTo, subject, text, html }) {
  if (smtpOn()) {
    const port = Number(process.env.SMTP_PORT || 465);
    await smtpSend({ host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.MAIL_FROM || `Kunt Solutions <${process.env.SMTP_USER}>`, to, replyTo, subject, text, html });
    return true;
  }
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.MAIL_FROM, to, reply_to: replyTo, subject, text, html }) });
    if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()).slice(0, 300));
    return true;
  }
  return false;
}
function store() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.accessSync(DATA_DIR, fs.constants.W_OK); return "OK (" + DATA_DIR + ")"; } catch (e) { return "NICHT beschreibbar (" + e.code + " " + DATA_DIR + ")"; }
}
const kontaktTo = () => String(process.env.KONTAKT_TO || "info@kuntsolutions.de").split(",").map((s) => s.trim()).filter(Boolean);
// Admin-Seiten (?key=ADMIN_KEY, mind. 12 Zeichen)
function adminOk(url) {
  const k = String(process.env.ADMIN_KEY || ""), g = String(url.searchParams.get("key") || "");
  return k.length >= 12 && g.length === k.length && crypto.timingSafeEqual(Buffer.from(g), Buffer.from(k));
}
const tests = [], confTo = new Map(), confAll = [];
async function mailtest(url, res) {
  const out = (code, t) => { res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }); res.end(t); };
  if (!adminOk(url)) return out(403, "Kein Zugriff. ADMIN_KEY in Coolify setzen und ?key=… anhängen.");
  const now = Date.now(); while (tests.length && now - tests[0] > 3600e3) tests.shift();
  if (tests.length >= 5) return out(429, "Höchstens 5 Testmails pro Stunde.");
  tests.push(now);
  const to = kontaktTo();
  if (!mailInfo()) return out(500, "Mail ist NICHT eingerichtet. In Coolify fehlt: " + mailMissing().join(", "));
  try {
    // Testmails mit Beispieldaten: neue Anfrage (an uns) und Kunden-Bestätigung (an uns oder an ?an=adresse). Sprache über ?lang=de|tr|en
    const an = String(url.searchParams.get("an") || "").trim(), cto = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(an) ? [an] : to;
    const c = confirmMail({ name: "Halil Kunt", company: "Muster GmbH", topic: "Gründung & Aufbau", lang: url.searchParams.get("lang") || "de", message: "So sieht die automatische Bestätigung aus, die Kunden nach einer Anfrage bekommen." }, { test: true });
    let conf;
    try { await sendMail({ to: cto, replyTo: to[0], subject: "[TEST mit Beispieldaten] " + c.subject, text: c.text, html: c.html }); conf = "ok"; } catch (e) { conf = e.message; }
    const n = leadMail({ ts: new Date().toISOString(), name: "Halil Kunt", company: "Muster GmbH", email: cto[0], phone: "0176 00000000", topic: "Gründung & Aufbau", lang: "de", message: "So sieht eine neue Anfrage bei dir aus.\nZweite Zeile der Nachricht." }, conf, { test: true });
    await sendMail({ to, subject: "[TEST mit Beispieldaten] " + n.subject, text: n.text, html: n.html });
    out(200, "Testmail „neue Anfrage“ gesendet an " + to.join(", ") + "\nKunden-Bestätigung an " + cto.join(", ") + ": " + (conf === "ok" ? "gesendet" : "FEHLER: " + conf) + "\nüber " + mailInfo() + ". Bitte Postfach (auch Spam) prüfen.\nSpeicher: " + store());
  } catch (e) { out(500, "Fehler beim Senden über " + mailInfo() + ":\n" + e.message); }
}
function anfragen(url, res) {
  if (!adminOk(url)) { res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Kein Zugriff."); }
  let list = [];
  try { list = fs.readFileSync(path.join(DATA_DIR, "anfragen.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse(); } catch {}
  const st = (m) => m === "ok" ? "✅ Mail gesendet" : m === "spam" ? "🚫 Spamverdacht (keine Mail, alte Version)" : m === "aus" || m == null ? "⚠️ Mail nicht eingerichtet" : "❌ " + m;
  const rows = list.map((a) => `<div class="a"><div class="h"><b>${esc(a.name)}</b>${a.company ? " · " + esc(a.company) : ""}<span>${esc(new Date(a.ts).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }))}</span></div><div>✉️ <a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${a.phone ? " · 📞 " + esc(a.phone) : ""} · ${esc(a.topic || "–")}</div><p>${esc(a.message)}</p><small>${a.spam ? "⚠️ Spamverdacht: " + esc(a.spam) + " · " : ""}${esc(st(a.mail))}${a.conf ? " · Bestätigung an Kunden: " + esc(a.conf === "ok" ? "✅ gesendet" : a.conf === "spam" ? "keine (Spamverdacht)" : a.conf) : ""}</small></div>`).join("");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Anfragen</title><style>body{font-family:system-ui,sans-serif;background:#f7f8fc;color:#0f1430;max-width:820px;margin:auto;padding:20px}h1{color:#141c55}.a{background:#fff;border:1px solid #e4e7f3;border-radius:14px;padding:16px;margin:12px 0}.h{display:flex;gap:6px;flex-wrap:wrap}.h span{margin-left:auto;color:#5d6385;font-size:14px}p{white-space:pre-wrap}small{color:#5d6385}a{color:#3a4fd8}</style><h1>Anfragen (${list.length})</h1><p>Mail: ${esc(mailInfo() || "NICHT eingerichtet")}<br>Speicher: ${esc(store())}</p>${rows || "<p>Noch keine Anfragen.</p>"}`);
}

async function kontakt(req, res) {
  const json = (code, o) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now); hits.set(ip, list);
  if (list.length > 8) return json(429, { error: "Zu viele Anfragen." });
  const d = await readBody(req);
  // Spamverdacht nur, wenn ohne Seite (kein el) oder in unter 1,5 s abgeschickt. Die Anfrage geht trotzdem an uns, nur ohne Bestätigung an den Kunden.
  const spam = typeof d.el !== "number" ? "ohne Webseite abgeschickt" : d.el < 1500 ? `in ${(d.el / 1000).toFixed(1).replace(".", ",")} s nach dem Laden abgeschickt` : "";
  const a = { ts: new Date().toISOString(), name: clean(d.name, 120), company: clean(d.company, 160), email: clean(d.email, 200), phone: clean(d.phone, 60), topic: clean(d.topic, 80), message: clean(d.message, 4000), lang: clean(d.lang, 5) };
  if (!a.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) || !a.message || d.consent !== true) return json(400, { error: "Pflichtfelder fehlen." });
  const to = kontaktTo();
  // Zuerst die Eingangsbestätigung an den Kunden (höchstens 1 pro Adresse in 10 Min. und 40 pro Stunde – keine Mail-Schleuder),
  // dann die Anfrage an uns, mit dem Ergebnis der Bestätigung oben in der Mail.
  const key = a.email.toLowerCase();
  while (confAll.length && now - confAll[0] > 3600e3) confAll.shift();
  let conf = spam ? "spam" : !mailInfo() ? "aus" : now - (confTo.get(key) || 0) < 600e3 || confAll.length >= 40 ? "übersprungen" : null;
  if (conf === null) {
    confTo.set(key, now); confAll.push(now);
    const c = confirmMail(a);
    conf = await sendMail({ to: [a.email], replyTo: to[0], subject: c.subject, text: c.text, html: c.html }).then(() => "ok", (e) => (confTo.delete(key), console.error("Bestätigung fehlgeschlagen:", e.message), e.message));
  }
  const { subject, text, html } = leadMail({ ...a, spam }, conf);
  const mail = await sendMail({ to, replyTo: a.email, subject, text, html }).then((r) => (r ? "ok" : "aus"), (e) => (console.error("Mail fehlgeschlagen:", e.message), e.message));
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.appendFileSync(path.join(DATA_DIR, "anfragen.jsonl"), JSON.stringify({ ...a, mail, conf, ...(spam ? { spam } : {}) }) + "\n"); } catch (e) { console.error("Anfrage nicht gespeichert:", e.message); }
  json(200, { ok: true });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  const host = String(req.headers.host || "");
  if (host.startsWith("www.")) { res.writeHead(301, { Location: "https://" + host.slice(4) + req.url }); return res.end(); }
  if (url.pathname === "/api/kontakt" && req.method === "POST") return kontakt(req, res);
  if (url.pathname === "/api/mailtest") return mailtest(url, res);
  if (url.pathname === "/anfragen") return anfragen(url, res);
  const fm = url.pathname.match(/^\/img\/(\w+)\.jpg$/);
  if (fm && FOTOS[fm[1]]) return fotoRoute(fm[1], req, res);
  let name = PAGES[url.pathname] || url.pathname.replace(/^\/+/, "");
  const ok = PUBLIC.has(name) || (/^assets\/(img\/)?[\w.-]+$/.test(name) && fs.existsSync(path.join(ROOT, name)));
  if (!ok) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res); }
  const ext = path.extname(name), file = path.join(ROOT, name);
  const head = { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=2592000, immutable", "X-Content-Type-Options": "nosniff", ...(name.startsWith("email/") ? { "X-Robots-Tag": "noindex" } : {}), "Referrer-Policy": "strict-origin-when-cross-origin", Vary: "Accept-Encoding" };
  // Text gzip-komprimiert aus dem Speicher (einmal pro Datei und Änderung)
  if ([".html", ".svg", ".txt", ".xml"].includes(ext) && /gzip/.test(req.headers["accept-encoding"] || "")) {
    const st = fs.statSync(file), c = GZ.get(name);
    const gz = c && c.m === st.mtimeMs ? c.b : (GZ.set(name, { m: st.mtimeMs, b: zlib.gzipSync(fs.readFileSync(file), { level: 9 }) }), GZ.get(name).b);
    res.writeHead(200, { ...head, "Content-Encoding": "gzip", "Content-Length": gz.length });
    return res.end(req.method === "HEAD" ? undefined : gz);
  }
  res.writeHead(200, head);
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => {
  console.log("Kunt Solutions läuft auf Port " + PORT);
  console.log("Speicher: " + store());
  console.log(mailInfo() ? "Mail: " + mailInfo() + " aktiv, an " + kontaktTo().join(", ") : "Mail: NICHT eingerichtet (fehlt: " + mailMissing().join(", ") + ") – Anfragen werden nur gespeichert");
});
