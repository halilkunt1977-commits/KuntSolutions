// Eigene Reichweitenmessung ohne Cookies: meldet Seitenaufruf, Verweildauer, Scrolltiefe, gesehene Abschnitte
// und Klicks auf Telefon, Mail und fremde Seiten an /api/hit. Nichts wird im Browser gespeichert.
(function () {
  if (navigator.doNotTrack === "1" || navigator.webdriver) return;
  var id = Math.random().toString(36).slice(2, 12), t0 = Date.now(), vis = 0, since = document.hidden ? 0 : t0, max = 0, seen = {}, sent = false;
  var q = new URLSearchParams(location.search);
  var send = function (o) { var b = JSON.stringify(o); if (!(navigator.sendBeacon && navigator.sendBeacon("/api/hit", new Blob([b], { type: "text/plain" })))) fetch("/api/hit", { method: "POST", body: b, keepalive: true }).catch(function () {}); };
  var lang = function () { return document.documentElement.lang || ""; };
  send({ e: "pv", id: id, p: location.pathname, r: document.referrer, u: q.get("utm_source") || q.get("ref") || "", c: q.get("utm_campaign") || "", l: lang(), w: innerWidth });
  var scroll = function () { var h = document.documentElement.scrollHeight - innerHeight; var s = h > 0 ? Math.round(100 * scrollY / h) : 100; if (s > max) max = Math.min(100, s); };
  addEventListener("scroll", scroll, { passive: true }); scroll();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { seen[e.target.id] = 1; io.unobserve(e.target); } }); }, { threshold: 0.3 });
    document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });
  }
  var end = function () {
    if (since) { vis += Date.now() - since; since = 0; }
    if (sent) return; sent = true;
    send({ e: "end", id: id, ms: vis, s: max, x: Object.keys(seen), l: lang() });
  };
  document.addEventListener("visibilitychange", function () { if (document.hidden) end(); else { since = Date.now(); sent = false; } });
  addEventListener("pagehide", end);
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]"); if (!a) return;
    var h = a.getAttribute("href"), n = /^tel:/.test(h) ? "Telefon" : /^mailto:/.test(h) ? "E-Mail" : /^https?:/.test(h) && a.host !== location.host ? "Link: " + a.host.replace(/^www\./, "") : "";
    if (n) send({ e: "ev", id: id, n: n });
    else if (a.host === location.host && a.pathname !== location.pathname && !a.target) end();
  });
})();
