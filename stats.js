// Eigene Statistik ohne Cookies und ohne fremde Dienste. assets/a.js meldet an POST /api/hit, hier landet alles
// in DATA_DIR/stats/<JJJJ-MM-TT>.jsonl. IP-Adressen werden nie gespeichert: Besucher = Hash aus IP, Browser und einem
// Tagesschlüssel, der jeden Tag neu gewürfelt wird (ein Besucher ist also nur innerhalb eines Tages wiedererkennbar).
// Rohdaten bleiben STATS_DAYS Tage (Standard 400), dann werden sie gelöscht.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const DIR = path.join(process.env.DATA_DIR || path.join(__dirname, "data"), "stats");
const KEEP = Number(process.env.STATS_DAYS || 400);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|whatsapp|telegram|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|scrapy|ahrefs|semrush|mj12|bingpreview/i;
const SECTIONS = { rechner: "Förderrechner", gruendung: "Gründung", leistungen: "Leistungen", themen: "Themen", branchen: "Branchen", trends: "Trends", projekte: "Projekte", referenzen: "Partner", wissen: "Wissen", kontakt: "Kontakt" };
const day = (t) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

let salt = null;
function saltFor(d) {
  if (salt && salt.d === d) return salt.k;
  const f = path.join(DIR, "salt.json");
  try { const s = JSON.parse(fs.readFileSync(f, "utf8")); if (s.d === d) return (salt = s).k; } catch {}
  salt = { d, k: crypto.randomBytes(16).toString("hex") };
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f, JSON.stringify(salt)); } catch {}
  cleanup();
  return salt.k;
}
function cleanup() {
  try {
    const old = day(Date.now() - KEEP * 864e5);
    for (const f of fs.readdirSync(DIR)) if (/^\d{4}-\d\d-\d\d\.jsonl$/.test(f) && f.slice(0, 10) < old) fs.unlinkSync(path.join(DIR, f));
  } catch {}
}
function ua(s) {
  const d = /iPad|Tablet|Android(?!.*Mobile)/i.test(s) ? "Tablet" : /Mobi|iPhone|Android/i.test(s) ? "Handy" : "Computer";
  const b = /Edg\//.test(s) ? "Edge" : /OPR\/|Opera/.test(s) ? "Opera" : /SamsungBrowser/.test(s) ? "Samsung Internet" : /Firefox|FxiOS/.test(s) ? "Firefox" : /Chrome|CriOS/.test(s) ? "Chrome" : /Safari/.test(s) ? "Safari" : "Andere";
  const o = /Windows/.test(s) ? "Windows" : /iPhone|iPad|iPod/.test(s) ? "iOS" : /Android/.test(s) ? "Android" : /Mac OS X|Macintosh/.test(s) ? "macOS" : /Linux|X11/.test(s) ? "Linux" : "Andere";
  return { d, b, o };
}
const rate = new Map();
// Ein Treffer von assets/a.js. own = Host der eigenen Seite (Verweise von dort zählen nicht als Herkunft), skip = Admin ist angemeldet.
function hit(req, body, { skip } = {}) {
  const s = String(req.headers["user-agent"] || "");
  if (skip || !s || BOT.test(s)) return;
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim(), now = Date.now();
  const r = (rate.get(ip) || []).filter((t) => now - t < 3600e3); r.push(now); rate.set(ip, r);
  if (r.length > 300) return;
  if (rate.size > 5000) for (const [k, v] of rate) if (now - v[v.length - 1] > 3600e3) rate.delete(k);
  const e = body.e, id = clean(body.id, 12), d = day(now);
  if (!/^[a-z0-9]+$/.test(id)) return;
  let o;
  if (e === "pv") {
    const v = crypto.createHash("sha256").update(saltFor(d) + ip + s).digest("hex").slice(0, 16);
    const own = String(req.headers.host || "").replace(/^www\./, "").split(":")[0];
    let ref = ""; try { const u = new URL(String(body.r || "")); ref = u.hostname.replace(/^www\./, ""); if (ref === own) ref = ""; } catch {}
    o = { t: now, e, id, v, p: clean(body.p, 120).replace(/\/+$/, "") || "/", r: ref, u: clean(body.u, 60).toLowerCase(), c: clean(body.c, 60), l: clean(body.l, 5), w: Math.max(0, Math.min(10000, Number(body.w) || 0)), ...ua(s) };
  } else if (e === "end") {
    o = { t: now, e, id, ms: Math.max(0, Math.min(36e5, Number(body.ms) || 0)), s: Math.max(0, Math.min(100, Number(body.s) || 0)), x: (Array.isArray(body.x) ? body.x : []).filter((k) => SECTIONS[k]).slice(0, 20), l: clean(body.l, 5) };
  } else if (e === "ev") {
    o = { t: now, e, id, n: clean(body.n, 80) };
  } else return;
  try { fs.mkdirSync(DIR, { recursive: true }); fs.appendFileSync(path.join(DIR, d + ".jsonl"), JSON.stringify(o) + "\n"); } catch (err) { console.error("Statistik nicht gespeichert:", err.message); }
}

// Tagesdateien einlesen (mit Zwischenspeicher, solange die Datei sich nicht ändert)
const CACHE = new Map();
function load(d) {
  const f = path.join(DIR, d + ".jsonl");
  let st; try { st = fs.statSync(f); } catch { return []; }
  const c = CACHE.get(d); if (c && c.m === st.mtimeMs && c.n === st.size) return c.rows;
  const rows = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  CACHE.set(d, { m: st.mtimeMs, n: st.size, rows });
  if (CACHE.size > 120) CACHE.delete(CACHE.keys().next().value);
  return rows;
}
const days = (n, to = Date.now()) => Array.from({ length: n }, (_, i) => day(to - (n - 1 - i) * 864e5)).filter((d, i, a) => a.indexOf(d) === i);
const top = (m, n = 10) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
const inc = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);

// Auswertung über die letzten n Tage (bzw. n=1: heute), plus Vergleich mit dem Zeitraum davor.
function core(list, anfragen) {
  const pv = new Map(), end = new Map(), visits = new Map(), ev = new Map();
  for (const { d, rows } of list) for (const r of rows) {
    if (r.e === "pv") { pv.set(r.id, r); const k = d + r.v; visits.set(k, (visits.get(k) || 0) + 1); }
    else if (r.e === "end") { const o = end.get(r.id); if (!o || r.ms >= o.ms) end.set(r.id, r); }
    else if (r.e === "ev") inc(ev, r.n);
  }
  let ms = 0, nEnd = 0, scroll = 0;
  for (const [id, e] of end) if (pv.has(id)) { ms += e.ms; nEnd++; scroll += e.s; }
  const nVisits = visits.size, bounce = [...visits.values()].filter((n) => n === 1).length;
  const visitors = new Set(); for (const { d, rows } of list) for (const r of rows) if (r.e === "pv") visitors.add(d + r.v);
  return { pv, end, ev, views: pv.size, visitors: visitors.size, visits: nVisits, bounce: nVisits ? bounce / nVisits : 0, dauer: nVisits ? ms / nVisits : 0, scroll: nEnd ? scroll / nEnd : 0, anfragen };
}
function anfragenIn(file, ds) {
  const set = new Set(ds);
  try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((a) => a && !a.spam && set.has(day(a.ts))); } catch { return []; }
}
function summary(n, anfragenFile) {
  n = Math.max(1, Math.min(KEEP, Math.round(n) || 30));
  const now = Date.now(), cur = days(n, now), prev = days(n, now - n * 864e5);
  const A = anfragenIn(anfragenFile, cur), Ap = anfragenIn(anfragenFile, prev);
  const L = cur.map((d) => ({ d, rows: load(d) })), c = core(L, A.length), p = core(prev.map((d) => ({ d, rows: load(d) })), Ap.length);
  const pages = new Map(), refs = new Map(), utm = new Map(), dev = new Map(), br = new Map(), os = new Map(), lang = new Map(), sec = new Map(), hours = Array(24).fill(0), dauerP = new Map(), nIndex = [0];
  for (const r of c.pv.values()) {
    inc(pages, r.p); inc(refs, r.r || "Direkt / unbekannt"); if (r.u) inc(utm, r.u + (r.c ? " · " + r.c : "")); inc(dev, r.d); inc(br, r.b); inc(os, r.o);
    hours[Number(new Date(r.t).toLocaleString("en-US", { timeZone: "Europe/Berlin", hour: "numeric", hourCycle: "h23" }))]++;
  }
  for (const [id, e] of c.end) {
    const r = c.pv.get(id); if (!r) continue;
    inc(lang, (e.l || r.l || "?").toUpperCase());
    if (r.p === "/") { nIndex[0]++; for (const k of e.x) inc(sec, SECTIONS[k]); }
    const dp = dauerP.get(r.p) || [0, 0]; dp[0] += e.ms; dp[1]++; dauerP.set(r.p, dp);
  }
  const daily = L.map(({ d, rows }) => {
    const v = new Set(); let views = 0; for (const r of rows) if (r.e === "pv") { views++; v.add(r.v); }
    return { d, views, visitors: v.size, anfragen: A.filter((a) => day(a.ts) === d).length };
  });
  const live = new Set(); for (const r of load(day(now))) if (r.e === "pv" && now - r.t < 5 * 60e3) live.add(r.v);
  const kpi = (o) => ({ views: o.views, visitors: o.visitors, visits: o.visits, bounce: o.bounce, dauer: o.dauer, scroll: o.scroll, anfragen: o.anfragen, events: [...o.ev.values()].reduce((a, b) => a + b, 0) });
  return {
    days: n, from: cur[0], to: cur[cur.length - 1], live: live.size, kpi: kpi(c), prev: kpi(p), daily, hours,
    pages: top(pages, 15).map(([k, v]) => [k, v, dauerP.get(k) ? dauerP.get(k)[0] / dauerP.get(k)[1] : 0]),
    refs: top(refs), utm: top(utm), devices: top(dev), browsers: top(br), os: top(os), langs: top(lang), events: top(c.ev),
    sections: Object.values(SECTIONS).map((k) => [k, sec.get(k) || 0]), indexViews: nIndex[0],
    anfragen: A.slice(-8).reverse().map((a) => ({ ts: a.ts, name: a.name, company: a.company, topic: a.topic })),
  };
}
module.exports = { hit, summary, cleanup };
