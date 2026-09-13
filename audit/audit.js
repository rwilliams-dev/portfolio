// Google PageSpeed Insights API key.
// Safe to ship in client-side code: this key is restricted by HTTP referrer in
// Google Cloud Console, so it only works when called from rwilliamsdev.com.
// An empty string falls back to the keyless (lower quota) public endpoint.
const PSI_API_KEY = "AIzaSyAR4jHBhojfhQ3Ld95-8G2ADP1gZLpYdx4";

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
  const lighthouse = data?.lighthouseResult;
  if (!lighthouse?.categories) throw new AuditError("upstream");
  return lighthouse;
}

function readScores(lighthouse) {
  // Note the hyphen: the API key is "best-practices", not "bestPractices".
  const cats = lighthouse.categories;
  return {
    performance: Math.round(cats.performance.score * 100),
    seo: Math.round(cats.seo.score * 100),
    accessibility: Math.round(cats.accessibility.score * 100),
    bestPractices: Math.round(cats["best-practices"].score * 100),
  };
}

/*
 * Lighthouse titles and descriptions are markdown: backticks around element
 * names, and a trailing "Learn more" link on most descriptions. The link has
 * nowhere to go once it is flattened, so drop those outright rather than
 * leaving "Learn more about document titles." dangling with no link.
 */
function plainText(markdown) {
  return String(markdown ?? "")
    .replace(/\[Learn more[^\]]*\]\([^)]*\)\.?/gi, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Recommendations come from the audits that actually failed for this site.
 *
 * Each category lists its audits in auditRefs with a weight. An audit's cost
 * to the score is weight * (1 - score) normalised over the category's total
 * weight, which gives a real "this is costing you N points" figure — the
 * ranking and the number are both derived from the response rather than
 * being fixed copy.
 */
function buildRecommendations(lighthouse, limit = 3) {
  const audits = lighthouse.audits || {};
  const skip = new Set(["notApplicable", "manual", "informative"]);
  const best = new Map();

  for (const category of Object.values(lighthouse.categories || {})) {
    const refs = (category.auditRefs || []).filter(r => r.weight > 0);
    const totalWeight = refs.reduce((sum, r) => sum + r.weight, 0);
    if (!totalWeight) continue;

    for (const ref of refs) {
      const audit = audits[ref.id];
      if (!audit || audit.score === null || audit.score >= 0.9) continue;
      if (skip.has(audit.scoreDisplayMode)) continue;

      const cost = (ref.weight / totalWeight) * (1 - audit.score) * 100;
      const existing = best.get(ref.id);
      if (existing && existing.cost >= cost) continue;

      best.set(ref.id, {
        id: ref.id,
        text: plainText(audit.title),
        detail: plainText(audit.description),
        category: category.title,
        cost,
      });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit)
    .map(rec => ({
      ...rec,
      points: Math.max(1, Math.round(rec.cost)),
      priority: rec.cost >= 6 ? "High" : rec.cost >= 2 ? "Medium" : "Low",
    }));
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
    const lighthouse = await fetchAuditScores(target);
    renderSuccess(target, lighthouse);
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

function renderSuccess(target, lighthouse) {
  const host = esc(new URL(target).host);
  const scores = readScores(lighthouse);
  const rings = [
    ["Performance", scores.performance],
    ["SEO", scores.seo],
    ["Accessibility", scores.accessibility],
    ["Best Practices", scores.bestPractices],
  ];
  const recs = buildRecommendations(lighthouse);

  const recsBlock = recs.length
    ? `<h3 class="audit-recs-title">What to fix first</h3>
    <ul class="audit-recs">
      ${recs.map(rec => `
        <li class="audit-rec">
          <span class="audit-rec-body">
            <span class="audit-rec-text">${esc(rec.text)}</span>
            <span class="audit-rec-detail">${esc(rec.detail)}</span>
          </span>
          <span class="audit-chips">
            <span class="audit-chip audit-chip-impact">${rec.points} pt${rec.points === 1 ? "" : "s"} · ${esc(rec.category)}</span>
            <span class="audit-chip audit-chip-${rec.priority.toLowerCase()}">${esc(rec.priority)}</span>
          </span>
        </li>`).join("")}
    </ul>`
    : `<h3 class="audit-recs-title">Nothing significant to fix</h3>
    <p class="audit-message">Every audit Google weights in these four categories passed on this run.</p>`;

  output.innerHTML = `
    <p class="audit-result-for">Results for <strong>${host}</strong></p>

    <div class="audit-scores">
      ${rings.map(([label, score]) => ringMarkup(label, score)).join("")}
    </div>

    ${recsBlock}

    <p class="audit-disclaimer">
      Scores come from Google PageSpeed Insights, from a single test run using its
      mobile profile. Each item above is an audit that actually failed for this page;
      the points figure is how much that audit is costing its category score.
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

  // Paint the final value outright when we can't or shouldn't animate.
  // document.hidden matters here: an audit takes ~30s, so results often land
  // while the tab is backgrounded, and requestAnimationFrame won't fire there.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) {
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
