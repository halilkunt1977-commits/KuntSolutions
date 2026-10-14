// E-Mail-Vorlagen: Signatur und automatische Eingangsbestätigung an den Kunden (DE/TR/EN).
// Nur Tabellen und Inline-Styles, damit es in Outlook, Gmail und auf dem Handy gleich aussieht.
// `node mails.js` schreibt die Outlook-Signatur nach email/signatur.html und eine Vorschau nach email/vorschau.html.
const SITE = process.env.SITE_URL || "https://kuntsolutions.de";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const F = "font-family:Arial,Helvetica,sans-serif";
const NAVY = "#141c55", BLUE = "#3a4fd8", MUTE = "#5d6385", LINE = "#e4e7f3";

const TX = {
  de: { team: "Ihr Kunt Solutions Team", claim: "Unternehmensberatung · Nürnberg", subj: "Ihre Anfrage bei Kunt Solutions ist angekommen", hi: (n) => `Vielen Dank, ${n}!`, sub: "Ihre Anfrage ist bei uns angekommen.",
    lead: "Wir sehen uns Ihr Anliegen genau an und melden uns innerhalb von zwei Werktagen persönlich bei Ihnen – meistens schneller.", yours: "Ihre Anfrage", topic: "Thema", company: "Unternehmen", msg: "Nachricht",
    next: "So geht es weiter", steps: [["Wir sichten Ihre Anfrage", "und bereiten uns auf Ihr Thema vor."], ["Kostenloses Erstgespräch", "per Telefon oder Video – ca. 30 Minuten, unverbindlich."], ["Ihr konkreter Plan", "mit klaren nächsten Schritten und Fördermöglichkeiten."]],
    more: "Schon mal stöbern?", b1: "💶 Ersparnis-Rechner", b2: "🚀 Existenzgründung", b3: "📘 Kostenlose Leitfäden", ban1: "💡 Wie viel Zeit verliert Ihr Unternehmen?", ban2: "In 1 Minute kostenlos berechnen →", reply: "Sie möchten noch etwas ergänzen? Antworten Sie einfach auf diese E-Mail.",
    foot: "Sie erhalten diese E-Mail, weil auf kuntsolutions.de eine Anfrage mit Ihrer Adresse gesendet wurde. Waren Sie das nicht? Dann ignorieren Sie diese Nachricht einfach." },
  tr: { team: "Kunt Solutions Ekibiniz", claim: "İşletme danışmanlığı · Nürnberg", subj: "Kunt Solutions'a talebiniz ulaştı", hi: (n) => `Teşekkürler, ${n}!`, sub: "Talebiniz bize ulaştı.",
    lead: "Konunuzu dikkatle inceliyoruz ve en geç iki iş günü içinde sizinle bizzat iletişime geçiyoruz – çoğu zaman daha hızlı.", yours: "Talebiniz", topic: "Konu", company: "Şirket", msg: "Mesaj",
    next: "Sonraki adımlar", steps: [["Talebinizi inceliyoruz", "ve konunuza hazırlanıyoruz."], ["Ücretsiz ilk görüşme", "telefon veya video ile – yaklaşık 30 dakika, bağlayıcı değil."], ["Somut planınız", "net sonraki adımlar ve teşvik imkânlarıyla."]],
    more: "Göz atmak ister misiniz?", b1: "💶 Tasarruf hesaplayıcı", b2: "🚀 Şirket kuruluşu", b3: "📘 Ücretsiz rehberler", ban1: "💡 Şirketiniz ne kadar zaman kaybediyor?", ban2: "1 dakikada ücretsiz hesaplayın →", reply: "Eklemek istediğiniz bir şey mi var? Bu e-postayı yanıtlamanız yeterli.",
    foot: "Bu e-postayı, kuntsolutions.de üzerinden adresinizle bir talep gönderildiği için alıyorsunuz. Siz göndermediyseniz bu mesajı dikkate almayın." },
  en: { team: "Your Kunt Solutions team", claim: "Business consulting · Nuremberg", subj: "We have received your request – Kunt Solutions", hi: (n) => `Thank you, ${n}!`, sub: "Your request has reached us.",
    lead: "We are looking at your request carefully and will get back to you personally within two working days – usually sooner.", yours: "Your request", topic: "Topic", company: "Company", msg: "Message",
    next: "What happens next", steps: [["We review your request", "and prepare for your topic."], ["Free first call", "by phone or video – about 30 minutes, no obligation."], ["Your concrete plan", "with clear next steps and funding options."]],
    more: "Want to look around?", b1: "💶 Savings calculator", b2: "🚀 Starting a business", b3: "📘 Free guides", ban1: "💡 How much time is your business losing?", ban2: "Calculate it free in 1 minute →", reply: "Anything to add? Simply reply to this email.",
    foot: "You are receiving this email because a request with your address was sent on kuntsolutions.de. If that wasn't you, simply ignore this message." },
};
const tx = (l) => TX[l] || TX.de;
const testBar = (on) => on ? `<tr><td bgcolor="#fff4c2" style="background:#fff4c2;padding:12px 32px;font-size:13px;color:#6b5200;${F}"><b>🧪 Testmail mit Beispieldaten</b> – echte Anfragen enthalten die Daten des Kunden.</td></tr>` : "";

// Signatur (auch für Outlook): Logo, Team, Firma, Kontakt, Klick-Buttons und Rechner-Banner – ohne Telefon und ohne Funktion.
// Farben zusätzlich als bgcolor, weil Outlook keine CSS-Hintergründe/Verläufe kennt. cta:false lässt Buttons und Banner weg.
function signature(l = "de", { cta = true } = {}) {
  const t = tx(l);
  const pill = (href, label) => `<a href="${SITE}/${href}" style="display:inline-block;${F};font-size:12px;font-weight:bold;color:${NAVY};text-decoration:none;background:#eef1ff;border:1px solid #d5dbff;border-radius:8px;padding:6px 11px;margin:0 6px 6px 0;white-space:nowrap">${label}</a>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${F};border-collapse:collapse;max-width:560px">
<tr><td style="padding:0 18px 0 0;border-right:3px solid ${BLUE};vertical-align:middle"><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/assets/logo.png" width="120" alt="KUNT SOLUTIONS – Upgrade your business" style="display:block;width:120px;height:auto;border:0"></a></td>
<td style="padding:0 0 0 18px;vertical-align:middle">
<div style="font-size:17px;font-weight:bold;color:${NAVY};line-height:1.3">${t.team}</div>
<div style="font-size:11px;letter-spacing:2px;color:${BLUE};line-height:1.6;padding-bottom:8px">UPGRADE YOUR BUSINESS</div>
<div style="font-size:13px;color:#0f1430;line-height:1.6"><b>KUNT SOLUTIONS</b> UG (haftungsbeschränkt)<br>Bruckwiesenstraße 17 · 90441 Nürnberg</div>
<div style="font-size:13px;line-height:1.7;padding-top:4px">✉️ <a href="mailto:info@kuntsolutions.de" style="color:${BLUE};text-decoration:none">info@kuntsolutions.de</a> &nbsp; 🌐 <a href="${SITE}" style="color:${BLUE};text-decoration:none;font-weight:bold">kuntsolutions.de</a></div>
</td></tr>${cta ? `
<tr><td colspan="2" style="padding-top:14px;line-height:2">${pill("#rechner", t.b1)}${pill("#gruendung", t.b2)}${pill("#wissen", t.b3)}</td></tr>
<tr><td colspan="2" style="padding-top:4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${NAVY}" style="background:${NAVY};background-image:linear-gradient(120deg,#0b1038,${NAVY} 50%,${BLUE});border-radius:10px;padding:11px 16px">
<a href="${SITE}/#rechner" style="${F};text-decoration:none;color:#ffffff;font-size:13px;line-height:1.4"><b>${t.ban1}</b> <span style="color:#b7c2ff">${t.ban2}</span></a></td></tr></table></td></tr>` : ""}
<tr><td colspan="2" style="padding-top:12px;font-size:10.5px;color:#8a90ad;line-height:1.5">${t.claim} · Amtsgericht Nürnberg HRB 42778 · USt-IdNr. DE366346853</td></tr>
</table>`;
}

// Eingangsbestätigung an den Kunden
function confirmMail(a, { test = false } = {}) {
  const l = TX[a.lang] ? a.lang : "de", t = tx(l), first = esc(String(a.name).split(/\s+/)[0] || a.name);
  const rows = [[t.topic, a.topic], [t.company, a.company], [t.msg, a.message.length > 600 ? a.message.slice(0, 600) + " …" : a.message]].filter((r) => r[1]);
  const btn = (href, label) => `<td style="padding:4px"><a href="${SITE}/${href}" style="display:inline-block;${F};font-size:13px;font-weight:bold;color:${NAVY};text-decoration:none;background:#eef1ff;border:1px solid #d5dbff;border-radius:10px;padding:10px 14px">${label}</a></td>`;
  const html = `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subj)}</title></head>
<body style="margin:0;padding:0;background:#f3f5fb">
<div style="display:none;max-height:0;overflow:hidden">${esc(t.sub)} ${esc(t.lead)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5fb"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;${F}">
${testBar(test)}<tr><td style="padding:22px 32px;border-bottom:1px solid ${LINE}"><a href="${SITE}"><img src="${SITE}/assets/wordmark.png" width="210" alt="KUNT SOLUTIONS" style="display:block;width:210px;height:auto;border:0"></a></td></tr>
<tr><td style="background:${NAVY};background-image:linear-gradient(135deg,#0b1038,${NAVY} 55%,${BLUE});padding:36px 32px">
<div style="font-size:12px;letter-spacing:3px;color:#9fb0ff;text-transform:uppercase">✓ ${esc(t.sub)}</div>
<div style="font-size:28px;line-height:1.2;font-weight:bold;color:#ffffff;padding-top:10px">${t.hi(first)}</div>
<div style="font-size:15px;line-height:1.6;color:#c9d0f5;padding-top:10px">${esc(t.lead)}</div></td></tr>
<tr><td style="padding:28px 32px 6px">
<div style="font-size:12px;letter-spacing:2px;color:${BLUE};text-transform:uppercase;font-weight:bold;padding-bottom:10px">${esc(t.yours)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8fc;border:1px solid ${LINE};border-radius:12px">
${rows.map(([k, v], i) => `<tr><td style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-size:13px;color:${MUTE};width:110px;vertical-align:top">${esc(k)}</td><td style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;color:#0f1430;line-height:1.5;white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:24px 32px 4px">
<div style="font-size:12px;letter-spacing:2px;color:${BLUE};text-transform:uppercase;font-weight:bold;padding-bottom:6px">${esc(t.next)}</div>
${t.steps.map(([h, p], i) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0"><tr><td style="vertical-align:top;padding-right:14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="34" height="34" align="center" valign="middle" bgcolor="${NAVY}" style="width:34px;height:34px;background:${NAVY};border-radius:17px;color:#ffffff;font-size:14px;font-weight:bold;${F};mso-line-height-rule:exactly;line-height:34px">${i + 1}</td></tr></table></td><td style="vertical-align:top;font-size:14px;line-height:1.5;color:#0f1430"><b>${esc(h)}</b><br><span style="color:${MUTE}">${esc(p)}</span></td></tr></table>`).join("")}
</td></tr>
<tr><td style="padding:18px 32px 6px"><div style="font-size:14px;color:${MUTE};padding-bottom:8px">${esc(t.more)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${btn("#rechner", t.b1)}${btn("#gruendung", t.b2)}${btn("#wissen", t.b3)}</tr></table></td></tr>
<tr><td style="padding:18px 32px 0;font-size:14px;color:#0f1430;line-height:1.6">${esc(t.reply)}</td></tr>
<tr><td style="padding:22px 32px 30px"><div style="border-top:1px solid ${LINE};padding-top:22px">${signature(l, { cta: false })}</div></td></tr>
</table>
<div style="max-width:560px;${F};font-size:11px;color:#8a90ad;line-height:1.5;padding:16px 12px">${esc(t.foot)}</div>
</td></tr></table></body></html>`;
  const text = `${t.hi(String(a.name).split(/\s+/)[0] || a.name)}\n${t.sub}\n\n${t.lead}\n\n${t.yours}:\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${t.next}:\n${t.steps.map(([h, p], i) => `${i + 1}. ${h} ${p}`).join("\n")}\n\n${t.reply}\n\n${t.team}\nKUNT SOLUTIONS UG (haftungsbeschränkt)\nBruckwiesenstraße 17 · 90441 Nürnberg\ninfo@kuntsolutions.de · ${SITE.replace(/^https?:\/\//, "")}\n\n${t.foot}`;
  return { subject: t.subj, html, text };
}

// Benachrichtigung an uns bei neuer Anfrage: gleiches Design, mit Schnell-Aktionen
// conf: Ergebnis der Kunden-Bestätigung ("ok", "übersprungen", "aus" oder Fehlertext)
function leadMail(a, conf, { test = false } = {}) {
  const tel = String(a.phone || "").replace(/[^\d+]/g, ""), wa = tel.replace(/^\+/, "").replace(/^00/, "").replace(/^0/, "49");
  const subject = `${a.spam ? "[Spamverdacht] " : ""}Neue Beratungsanfrage: ${a.topic || "Allgemein"} – ${a.name}${a.company ? " (" + a.company + ")" : ""}`;
  const rows = [["E-Mail", a.email], ["Telefon", a.phone], ["Unternehmen", a.company], ["Thema", a.topic], ["Sprache", { de: "Deutsch", tr: "Türkisch", en: "Englisch" }[a.lang] || a.lang]].filter((r) => r[1]);
  const btn = (href, label, dark) => `<a href="${esc(href)}" style="display:inline-block;${F};font-size:14px;font-weight:bold;text-decoration:none;border-radius:10px;padding:11px 16px;margin:0 8px 8px 0;${dark ? `background:${NAVY};color:#ffffff;border:1px solid ${NAVY}` : `background:#eef1ff;color:${NAVY};border:1px solid #d5dbff`}">${label}</a>`;
  const cs = a.spam ? ["#fff4c2", "#6b5200", `⚠️ Spamverdacht (${a.spam}) – keine Bestätigung an den Kunden gesendet. Bitte prüfen.`] : conf === "ok" ? ["#e7f7f1", "#0e7a5c", `✅ Eingangsbestätigung an ${a.email} gesendet`] : conf === "übersprungen" ? ["#fff4c2", "#6b5200", `⏭️ Keine Eingangsbestätigung: an ${a.email} ging vor weniger als 10 Minuten schon eine`] : conf === "aus" || conf == null ? ["#fff4c2", "#6b5200", "⚠️ Keine Eingangsbestätigung (Mail nicht eingerichtet)"] : ["#fdecec", "#a1121a", `❌ Eingangsbestätigung an ${a.email} fehlgeschlagen: ${conf}`];
  const when = new Date(a.ts || Date.now()).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "full", timeStyle: "short" });
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5fb">
<div style="display:none;max-height:0;overflow:hidden">${esc(a.name)}: ${esc(String(a.message).slice(0, 140))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5fb"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;${F}">
${testBar(test)}<tr><td style="padding:20px 32px;border-bottom:1px solid ${LINE}"><a href="${SITE}"><img src="${SITE}/assets/wordmark.png" width="190" alt="KUNT SOLUTIONS" style="display:block;width:190px;height:auto;border:0"></a></td></tr>
<tr><td bgcolor="${NAVY}" style="background:${NAVY};background-image:linear-gradient(135deg,#0b1038,${NAVY} 55%,${BLUE});padding:30px 32px">
<div style="font-size:12px;letter-spacing:3px;color:#9fb0ff">🔔 NEUE ANFRAGE${a.topic ? " · " + esc(String(a.topic).toUpperCase()) : ""}</div>
<div style="font-size:28px;line-height:1.2;font-weight:bold;color:#ffffff;padding-top:10px">${esc(a.name)}</div>
${a.company ? `<div style="font-size:16px;color:#c9d0f5;padding-top:4px">${esc(a.company)}</div>` : ""}
<div style="font-size:13px;color:#9fa8d8;padding-top:10px">${esc(when)}</div></td></tr>
<tr><td bgcolor="${cs[0]}" style="background:${cs[0]};color:${cs[1]};padding:12px 32px;font-size:13px;font-weight:bold">${esc(cs[2])}</td></tr>
<tr><td style="padding:26px 32px 4px">
<div style="font-size:12px;letter-spacing:2px;color:${BLUE};font-weight:bold;padding-bottom:10px">NACHRICHT</div>
<div style="background:#f7f8fc;border:1px solid ${LINE};border-left:4px solid ${BLUE};border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.6;color:#0f1430;white-space:pre-wrap">${esc(a.message)}</div></td></tr>
<tr><td style="padding:22px 32px 4px">
<div style="font-size:12px;letter-spacing:2px;color:${BLUE};font-weight:bold;padding-bottom:10px">KONTAKT</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:12px">
${rows.map(([k, v], i) => `<tr><td style="padding:11px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-size:13px;color:${MUTE};width:110px">${esc(k)}</td><td style="padding:11px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;color:#0f1430">${k === "E-Mail" ? `<a href="mailto:${esc(v)}" style="color:${BLUE};text-decoration:none">${esc(v)}</a>` : k === "Telefon" && tel ? `<a href="tel:${esc(tel)}" style="color:${BLUE};text-decoration:none">${esc(v)}</a>` : esc(v)}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:22px 32px 6px">
${btn(`mailto:${a.email}?subject=${encodeURIComponent("Re: Ihre Anfrage bei Kunt Solutions")}`, "✉️ Antworten", true)}${tel ? btn(`tel:${tel}`, "📞 Anrufen") + btn(`https://wa.me/${wa}`, "💬 WhatsApp") : ""}
<div style="font-size:12px;color:${MUTE};padding-top:6px">„Antworten“ in deinem Mailprogramm geht direkt an ${esc(a.email)}.</div></td></tr>
<tr><td style="padding:22px 32px 30px"><div style="border-top:1px solid ${LINE};padding-top:22px">${signature("de", { cta: false })}</div></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${cs[2]}\n\nNeue Anfrage von ${a.name}${a.company ? " (" + a.company + ")" : ""}\n${when}\n\n${a.message}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`;
  return { subject, html, text };
}

module.exports = { signature, confirmMail, leadMail };

if (require.main === module) {
  const fs = require("fs"), path = require("path"), dir = path.join(__dirname, "email");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "signatur.html"), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Signatur Kunt Solutions</title></head>
<body style="margin:0;background:#f3f5fb;${F}"><div style="max-width:720px;margin:32px auto;padding:0 16px">
<h1 style="font-size:22px;color:${NAVY};margin:0 0 6px">E-Mail-Signatur</h1>
<p style="font-size:14px;color:${MUTE};margin:0 0 18px">1. Auf <b>Signatur kopieren</b> klicken. 2. In Outlook: <b>Datei → Optionen → E-Mail → Signaturen… → Neu</b>, ins große Feld klicken, <b>Strg+V</b>, Standard für neue Nachrichten und Antworten wählen, <b>OK</b>.</p>
<button id="cp" style="${F};font-size:15px;font-weight:bold;color:#fff;background:${NAVY};border:0;border-radius:12px;padding:13px 22px;cursor:pointer">📋 Signatur kopieren</button> <span id="ok" style="font-size:14px;color:#0e7a5c;font-weight:bold"></span>
<div style="background:#fff;border:1px solid ${LINE};border-radius:16px;padding:28px;margin-top:18px"><div id="sig">
<p style="${F};font-size:14px;color:#0f1430;margin:0 0 14px">Mit freundlichen Grüßen / Best Regards / Saygılarımla</p>
${signature("de")}
</div></div></div>
<script>
document.getElementById('cp').onclick=async()=>{const el=document.getElementById('sig'),ok=document.getElementById('ok');
  try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([el.innerHTML],{type:'text/html'}),'text/plain':new Blob([el.innerText],{type:'text/plain'})})]);ok.textContent='✓ Kopiert – jetzt in Outlook einfügen'}
  catch(e){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);ok.textContent=document.execCommand('copy')?'✓ Kopiert – jetzt in Outlook einfügen':'Bitte markierten Bereich mit Strg+C kopieren'}};
</script></body></html>\n`);
  const sample = { name: "Halil Kunt", company: "Muster GmbH", email: "kunde@example.com", topic: "Gründung & Aufbau", lang: process.argv[2] || "de", message: "Ersparnis-Rechner: Branche Handwerk & Bau, 8 Mitarbeiter, 55 €/Std. Mögliche Einsparung ca. 55.700 € pro Jahr (22 Std./Woche). Größter Flaschenhals: Stundenzettel & Rechnung." };
  fs.writeFileSync(path.join(dir, "vorschau.html"), confirmMail(sample).html);
  console.log("email/signatur.html und email/vorschau.html geschrieben");
}
