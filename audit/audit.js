// Google PageSpeed Insights API key.
// Safe to ship in client-side code: this key is restricted by HTTP referrer in
// Google Cloud Console, so it only works when called from rwilliamsdev.com.
// An empty string falls back to the keyless (lower quota) public endpoint.
const PSI_API_KEY = "";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "seo", "accessibility", "best-practices"];

const form = document.getElementById("audit-form");
const input = document.getElementById("audit-url");
const button = document.getElementById("audit-btn");
const output = document.getElementById("audit-output");

/* ---------- helpers ---------- */

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Accepts "example.com" or "https://example.com". Returns "" if unusable.
function normalizeUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return "";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
  if (!parsed.hostname.includes(".")) return "";

  return parsed.href;
}

function scoreColor(score) {
  if (score >= 75) return "var(--audit-good)";
  if (score >= 50) return "var(--audit-warn)";
  return "var(--audit-bad)";
}

class AuditError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

const ERROR_COPY = {
  "invalid-url": "That doesn't look like a web address. Try something like example.com.",
  "bad-site": "Google couldn't load that site. Check the address is right and the site is public, then try again.",
  "rate-limit": "Too many audits just now. Give it a minute and try again.",
  "upstream": "Google's testing service didn't respond. Try again in a moment.",
  "network": "Couldn't reach the testing service. Check your connection and try again.",
};

/* ---------- data ---------- */

async function fetchAuditScores(target) {
  const params = new URLSearchParams({ url: target, strategy: "mobile" });
  for (const category of CATEGORIES) params.append("category", category);
  if (PSI_API_KEY) params.append("key", PSI_API_KEY);

  let response;
  try {
    response = await fetch(`${PSI_ENDPOINT}?${params}`);
  } catch {
    // Network-level failure: offline, DNS, blocked request.
    // Deliberately does not echo the request URL, which carries the key.
    throw new AuditError("network");
  }

  if (!response.ok) {
    if (response.status === 429) throw new AuditError("rate-limit");
    if (response.status >= 500) throw new AuditError("upstream");
    throw new AuditError("bad-site");
  }

  const data = await response.json();
  const cats = data?.lighthouseResult?.categories;
  if (!cats) throw new AuditError("upstream");

  return {
    performance: Math.round(cats.performance.score * 100),
    seo: Math.round(cats.seo.score * 100),
    accessibility: Math.round(cats.accessibility.score * 100),
    bestPractices: Math.round(cats["best-practices"].score * 100),
  };
}

// Same thresholds and copy as the Biashara Boost dashboard.
function buildRecommendations(scores) {
  const recs = [];
  if (scores.performance < 60)
    recs.push({ text: "Compress images and enable caching — site is slow on mobile data", priority: "High", impact: "+18% visits" });
  if (scores.seo < 70)
    recs.push({ text: "Add page titles and meta descriptions so Google can rank you", priority: "High", impact: "+25% search traffic" });
  if (scores.accessibility < 75)
    recs.push({ text: "Increase text contrast and label buttons for all customers", priority: "Medium", impact: "+8% engagement" });
  if (scores.bestPractices < 80)
    recs.push({ text: "Switch to HTTPS and fix console errors to build trust", priority: "Medium", impact: "+12% conversions" });
  if (recs.length === 0)
    recs.push({ text: "Strong foundation — focus on WhatsApp ordering flow next", priority: "Low", impact: "+10% bookings" });
  return recs;
}

/* ---------- flow ---------- */

async function runAudit(event) {
  event.preventDefault();
  if (button.disabled) return;

  const target = normalizeUrl(input.value);
  if (!target) {
    renderError("invalid-url");
    return;
  }

  setBusy(true);
  renderRunning(target);

  try {
    const scores = await fetchAuditScores(target);
    renderSuccess(target, scores);
  } catch (error) {
    renderError(error instanceof AuditError ? error.kind : "upstream");
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  button.disabled = busy;
  button.textContent = busy ? "Auditing…" : "Run Audit";
  input.readOnly = busy;
  output.setAttribute("aria-busy", String(busy));
}

/* ---------- states ---------- */

function renderIdle() {
  output.innerHTML =
    `<p class="audit-message">Enter a website above to see how it scores on Google's own tests.</p>`;
}

function renderRunning(target) {
  const host = esc(new URL(target).host);
  output.innerHTML = `
    <div class="audit-running">
      <div class="audit-spinner" aria-hidden="true"></div>
      <p class="audit-message">
        Running a full Google analysis of <strong>${host}</strong> — this takes about
        30 seconds while we load the site on a real mobile connection and test everything.
      </p>
    </div>`;
}

function renderError(kind) {
  const message = ERROR_COPY[kind] ?? ERROR_COPY.upstream;
  output.innerHTML = `<p class="audit-message audit-error" role="alert">${esc(message)}</p>`;
}

function renderSuccess(target, scores) {
  const host = esc(new URL(target).host);
  const rings = [
    ["Performance", scores.performance],
    ["SEO", scores.seo],
    ["Accessibility", scores.accessibility],
    ["Best Practices", scores.bestPractices],
  ];
  const recs = buildRecommendations(scores);

  output.innerHTML = `
    <p class="audit-result-for">Results for <strong>${host}</strong></p>

    <div class="audit-scores">
      ${rings.map(([label, score]) => ringMarkup(label, score)).join("")}
    </div>

    <h3 class="audit-recs-title">What to fix first</h3>
    <ul class="audit-recs">
      ${recs.map(rec => `
        <li class="audit-rec">
          <span class="audit-rec-text">${esc(rec.text)}</span>
          <span class="audit-chips">
            <span class="audit-chip audit-chip-impact">${esc(rec.impact)}</span>
            <span class="audit-chip audit-chip-${rec.priority.toLowerCase()}">${esc(rec.priority)}</span>
          </span>
        </li>`).join("")}
    </ul>

    <p class="audit-disclaimer">
      Scores come from Google PageSpeed Insights and reflect one mobile test run.
      Estimated impact figures are industry rules of thumb, not a guarantee.
    </p>`;

  output.querySelectorAll(".audit-ring").forEach(animateRing);
}

function ringMarkup(label, score) {
  const radius = 42;
  const circumference = (2 * Math.PI * radius).toFixed(2);
  return `
    <figure class="audit-ring" data-score="${score}" style="--ring-color: ${scoreColor(score)}">
      <svg viewBox="0 0 110 110" role="img" aria-label="${esc(label)}: ${score} out of 100">
        <circle class="audit-ring-track" cx="55" cy="55" r="${radius}" />
        <circle class="audit-ring-value" cx="55" cy="55" r="${radius}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" />
        <text class="audit-ring-number" x="55" y="55" text-anchor="middle" dominant-baseline="central">0</text>
      </svg>
      <figcaption>${esc(label)}</figcaption>
    </figure>`;
}

function animateRing(ring) {
  const score = Number(ring.dataset.score) || 0;
  const arc = ring.querySelector(".audit-ring-value");
  const number = ring.querySelector(".audit-ring-number");
  const circumference = Number(arc.getAttribute("stroke-dasharray"));

  const paint = (value) => {
    number.textContent = String(Math.round(value));
    arc.setAttribute("stroke-dashoffset", String(circumference - (value / 100) * circumference));
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paint(score);
    return;
  }

  let start;
  const step = (timestamp) => {
    if (start === undefined) start = timestamp;
    const progress = Math.min((timestamp - start) / 900, 1);
    paint(score * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- init ---------- */

if (form && input && button && output) {
  form.addEventListener("submit", runAudit);
  renderIdle();
}
