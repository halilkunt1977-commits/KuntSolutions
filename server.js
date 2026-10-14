// Kunt Solutions: kleiner statischer Webserver ohne Abhängigkeiten (Coolify, Port 3000, Healthcheck /health).
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = __dirname, PORT = process.env.PORT || 3000;
const FILES = { "/": "index.html", "/impressum": "impressum.html", "/datenschutz": "datenschutz.html" };
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const PUBLIC = ["index.html", "impressum.html", "datenschutz.html", "favicon.svg", "robots.txt", "sitemap.xml"];
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  // www → ohne www
  const host = String(req.headers.host || "");
  if (host.startsWith("www.")) { res.writeHead(301, { Location: "https://" + host.slice(4) + req.url }); return res.end(); }
  const name = FILES[url.pathname] || url.pathname.replace(/^\/+/, "");
  if (!PUBLIC.includes(name)) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res); }
  const ext = path.extname(name);
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
  fs.createReadStream(path.join(ROOT, name)).pipe(res);
}).listen(PORT, () => console.log("Kunt Solutions läuft auf Port " + PORT));
