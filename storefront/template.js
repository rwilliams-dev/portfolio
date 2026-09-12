function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  const url = String(value ?? "").trim();
  return /^https?:\/\//i.test(url) ? url.replace(/["'\\]/g, "") : "";
}

function safePhone(value) {
  return String(value ?? "").replace(/[^0-9+\-\s()]/g, "");
}

function safeWhatsapp(value, countryCode = "254") {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return countryCode + digits.replace(/^0+/, "");
  if (digits.startsWith(countryCode)) return digits;
  if (digits.length <= 9) return countryCode + digits;
  return digits;
}

function safeColor(value, fallback) {
  const c = String(value ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : fallback;
}

function pickText(bgHex, override) {
  if (override) return safeColor(override, "#1a1a1a");
  const h = bgHex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#f5f2ec";
}


function escLines(value) {
  return esc(value).replace(/\r?\n/g, "<br>");
}

export function buildStorefront(data) {
  const {
    name = "",
    tagline = "",
    address = "",
    phone = "",
    whatsapp = "",
    hours = "",
    heroUrl = "",
    menu = [],
    theme = {},
    lang = "en",
    countryCode = "254",
  } = data;

  const safeLang = lang === "sw" ? "sw" : "en";
  const t = theme && typeof theme === "object" ? theme : {};
  const accent = safeColor(t.accent, "#128C7E");
  const bg = safeColor(t.bg, "#faf8f5");
    const text = pickText(bg, t.text);
  const textDim = pickText(bg, t.text) === "#1a1a1a" ? "#4a4a4a" : "#c9c2b6";
  const rule = pickText(bg, t.text) === "#1a1a1a" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
  const fontStack = t.font === "serif"
    ? `Georgia, "Times New Roman", serif`
    : `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;

  const items = (Array.isArray(menu) ? menu : [])
    .filter(i => i && (i.name || i.price));

  const L = safeLang === "sw"
    ? { menu: "Menyu", hours: "Saa za Kazi", find: "Mahali Tulipo", call: "Piga Simu", order: "Agiza kwa WhatsApp" }
    : { menu: "Menu", hours: "Hours", find: "Find us", call: "Call", order: "Order on WhatsApp" };

  const wa = safeWhatsapp(whatsapp, countryCode);
  const waValid = wa.length >= 10 && wa.length <= 15;
  return `<!DOCTYPE html>
<html lang="${safeLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${fontStack};
    color: ${text};
    background: ${bg};
    line-height: 1.6;
  }
  .hero {
    min-height: 62vh;
    background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url("${safeUrl(heroUrl)}") center/cover;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 2rem 1.25rem 2.5rem;
    color: #fff;
  }
  .hero h1 { font-size: clamp(2rem, 8vw, 3.5rem); line-height: 1.1; letter-spacing: -0.02em; }
  .hero p { font-size: 1.05rem; opacity: 0.9; margin-top: 0.5rem; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.25rem; }
    .menu-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid ${rule}; }
  .menu-item:last-child { border-bottom: none; }
  .price { white-space: nowrap; color: ${textDim}; }
  .cta {
    position: sticky; bottom: 0;
    background: ${accent}; color: #fff;
    text-align: center; padding: 1rem;
    font-weight: 600; text-decoration: none; display: block;
  }
  h2 { font-size: 1.5rem; margin-bottom: 1rem; letter-spacing: -0.01em; }
    .info { margin-top: 2rem; color: ${textDim}; }
</style>
</head>
<body>

<div class="hero">
  <h1>${esc(name)}</h1>
  <p>${esc(tagline)}</p>
</div>

<div class="wrap">
  <h2>${L.menu}</h2>
  ${items.map(item => `
    <div class="menu-item">
      <span>${esc(item.name)}</span>
      <span class="price">${esc(item.price)}</span>
    </div>`).join("")}

  <div class="info">
    <p><strong>${L.hours}</strong><br>${escLines(hours)}</p>
        <p style="margin-top:1rem"><strong>${L.find}</strong><br>${escLines(address)}</p>
    <p style="margin-top:1rem"><strong>${L.call}</strong><br><a href="tel:${safePhone(phone)}">${esc(safePhone(phone))}</a></p>
  </div>
</div>

${waValid ? `<a class="cta" href="https://wa.me/${wa}">${L.order}</a>` : ""}

</body>
</html>`;
}