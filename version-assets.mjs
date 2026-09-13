/*
 * Stamps one shared cache-busting token onto every versioned asset.
 *
 *   node version-assets.mjs
 *
 * Run this after editing styles.css, script.js, or anything under audit/ or
 * storefront/. GitHub Pages serves with Cache-Control: max-age=600, so an
 * edited asset can keep being served from cache for ten minutes — long enough
 * for a change to look broken while you are testing it. A ?v= query makes the
 * edited file a new URL, so it reaches everyone immediately.
 *
 * One shared token rather than a hash per file, because storefront/preview.js
 * imports template.js and presets.js. A per-file hash would version the entry
 * point but leave its imports cached, so editing template.js would be masked
 * by the stale copy. The token is derived from every asset's contents with
 * any existing ?v= stripped first, so it is deterministic and re-running
 * against unchanged files is a no-op.
 *
 * Note this differs from dumela-press, which uses a hash per file — that repo
 * has no ES modules importing siblings, so it does not need a shared token.
 *
 * This is not a build step. Nothing runs it automatically.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => writeFileSync(join(ROOT, p), s);

// Everything whose URL should carry the token.
const ASSETS = [
  "styles.css",
  "script.js",
  "audit/audit.js",
  "storefront/preview.js",
  "storefront/template.js",
  "storefront/presets.js",
];

const STRIP_V = /\?v=[a-f0-9]+/g;

const token = createHash("md5")
  .update(ASSETS.map(a => read(a).replace(STRIP_V, "")).join("\0"))
  .digest("hex")
  .slice(0, 8);

console.log("token:", token);
let changed = 0;

// HTML references: href="styles.css", src="audit/audit.js", and so on.
const htmlRe = /(href|src)="(styles\.css|script\.js|audit\/audit\.js|storefront\/preview\.js)(\?v=[a-f0-9]+)?"/g;
for (const file of readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
  const before = read(file);
  const after = before.replace(htmlRe, (_m, attr, asset) => `${attr}="${asset}?v=${token}"`);
  if (after !== before) { write(file, after); changed++; console.log("  html  " + file); }
}

// preview.js imports its siblings, so those URLs need the token too.
const importRe = /from "(\.\/(?:template|presets)\.js)(\?v=[a-f0-9]+)?"/g;
{
  const before = read("storefront/preview.js");
  const after = before.replace(importRe, (_m, spec) => `from "${spec}?v=${token}"`);
  if (after !== before) { write("storefront/preview.js", after); changed++; console.log("  js    storefront/preview.js"); }
}

console.log(changed ? `\n${changed} file(s) updated` : "\nalready current — no-op");
