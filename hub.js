// Hub-Schnittstelle für die Admin-Zentrale (Version 1, siehe admin-zentrale/HUB.md).
// GET /api/hub?tage=30 mit "Authorization: Bearer <HUB_TOKEN>". Nur lesen, keine Telefonnummern oder Nachrichtentexte.
const crypto = require("crypto");
const stats = require("./stats");

function tokenOk(req) {
  const k = String(process.env.HUB_TOKEN || "");
  const m = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  const g = m ? m[1].trim() : "";
  return k.length >= 32 && Buffer.byteLength(g) === Buffer.byteLength(k) && crypto.timingSafeEqual(Buffer.from(g), Buffer.from(k));
}

function hubRoute(url, req, res, anfragenFile) {
  const json = (code, o) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }); res.end(JSON.stringify(o)); };
  if (String(process.env.HUB_TOKEN || "").length < 32) return json(503, { error: "HUB_TOKEN ist nicht gesetzt (mind. 32 Zeichen)." });
  if (!tokenOk(req)) return json(401, { error: "Nicht berechtigt." });
  const s = stats.summary(Number(url.searchParams.get("tage")) || 30, anfragenFile);
  const kpi = (k) => ({ visitors: k.visitors, views: k.views, leads: k.anfragen });
  return json(200, {
    v: 1,
    site: "kunt",
    from: s.from,
    to: s.to,
    live: s.live,
    kpi: kpi(s.kpi),
    prev: kpi(s.prev),
    daily: s.daily.map((d) => ({ d: d.d, visitors: d.visitors, views: d.views, leads: d.anfragen })),
    sources: s.refs,
    pages: s.pages.map(([p, n]) => [p, n]),
    devices: s.devices,
    campaigns: s.utm,
    leads: s.anfragen.map((a) => ({ ts: a.ts, name: a.name, form: "Kontakt", info: [a.company, a.topic].filter(Boolean).join(" · ") })),
    extra: [{ label: "Absprungrate", value: Math.round(s.kpi.bounce * 100), unit: "%" }, { label: "Ø Verweildauer", value: Math.round(s.kpi.dauer / 1000), unit: "s" }],
  });
}

module.exports = { hubRoute };
