/*
 * Audit smoke test — run before showing the audit tool to anyone.
 *
 *   node audit/smoke-test.mjs <PSI_API_KEY>
 *
 * Guards against the failure this was written for: in September 2026 the
 * recommendation card rendered identical copy for every site audited, because
 * it came from fixed thresholds with a catch-all rather than from the
 * response. A prospect would have seen a confident report about someone
 * else's site. These checks would have caught it.
 *
 * The key is referrer-restricted to rwilliamsdev.com, so requests are sent
 * with a matching Referer header. Nothing is written to disk and no state is
 * kept — this only reads.
 */

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "seo", "accessibility", "best-practices"];
const REFERER = "https://rwilliamsdev.com/";

// Three unrelated sites: a huge one, Richard's own, and a heavy media site.
const SITES = [
  "https://www.google.com",
  "https://dumelapress.com",
  "https://www.espn.com",
];

const key = process.argv[2];
if (!key) {
  console.error("Usage: node audit/smoke-test.mjs <PSI_API_KEY>");
  process.exit(2);
}

/* The functions under test, kept in step with audit.js. If you change the
   ranking there, mirror it here — that is the point of the exercise. */

function plainText(markdown) {
  return String(markdown ?? "")
    .replace(/\[Learn more[^\]]*\]\([^)]*\)\.?/gi, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

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
      best.set(ref.id, { id: ref.id, text: plainText(audit.title), category: category.title, cost });
    }
  }

  return [...best.values()].sort((a, b) => b.cost - a.cost).slice(0, limit);
}

// PageSpeed throws intermittent 500s on heavy pages, so retry before failing.
async function psi(target, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    const params = new URLSearchParams({ url: target, strategy: "mobile", key });
    for (const c of CATEGORIES) params.append("category", c);
    const res = await fetch(`${ENDPOINT}?${params}`, { headers: { Referer: REFERER } });
    if (res.ok) return (await res.json()).lighthouseResult;
    if (res.status === 403) throw new Error(`403 — the key does not allow ${REFERER}`);
    process.stdout.write(`  attempt ${i}: HTTP ${res.status}, retrying\n`);
    await new Promise(r => setTimeout(r, 15000));
  }
  throw new Error(`gave up on ${target} after ${attempts} attempts`);
}

const failures = [];
const results = [];

for (const site of SITES) {
  console.log(`\nAuditing ${site}`);
  const lighthouse = await psi(site);
  const c = lighthouse.categories;
  const triplet = [c.accessibility, c["best-practices"], c.seo]
    .map(x => Math.round(x.score * 100)).join("/");
  const recs = buildRecommendations(lighthouse);

  console.log(`  a11y/bp/seo = ${triplet}`);
  console.log(`  formFactor  = ${lighthouse.configSettings.formFactor}`);
  console.log(`  finalUrl    = ${lighthouse.finalUrl || lighthouse.finalDisplayedUrl}`);
  recs.forEach(r => console.log(`  • ${Math.round(r.cost)}pt ${r.category} — ${r.text}`));

  // Every gauge must read live data, so the mobile profile must be what ran.
  if (lighthouse.configSettings.formFactor !== "mobile") {
    failures.push(`${site}: formFactor is "${lighthouse.configSettings.formFactor}", expected "mobile"`);
  }
  // A site with no failing audits is legitimate; fixed copy is not.
  if (recs.some(r => /WhatsApp|bookings|Strong foundation/i.test(r.text))) {
    failures.push(`${site}: recommendation text looks like the old fixed copy`);
  }
  results.push({ site, triplet, top: recs.map(r => r.id).join(",") });
}

console.log("\n--- checks ---");

const triplets = new Set(results.map(r => r.triplet));
if (triplets.size !== results.length) {
  failures.push(`only ${triplets.size} distinct a11y/bp/seo triplets across ${results.length} domains`);
}

const recSets = new Set(results.map(r => r.top));
if (recSets.size !== results.length) {
  failures.push(`only ${recSets.size} distinct recommendation sets across ${results.length} domains`);
}

if (failures.length) {
  failures.forEach(f => console.error(`FAIL  ${f}`));
  process.exit(1);
}

console.log(`PASS  ${results.length} domains, ${triplets.size} distinct score triplets, ${recSets.size} distinct recommendation sets`);
