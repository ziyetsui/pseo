#!/usr/bin/env node
/**
 * Static-output gate for the exported site.
 *
 * Everything here is checked against the artefact that actually ships
 * (`out/`), plus the production sources under `src/`, so a rule can never be
 * satisfied by a test double. Prints counts for every check and exits non-zero
 * on the first category that fails.
 *
 * Run after `pnpm build`:  pnpm check:static
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const SRC = path.join(ROOT, "src");

/* ------------------------------------------------------------------ report */

const failures = [];

function ok(message) {
  process.stdout.write(`  ok    ${message}\n`);
}

function fail(message, details = []) {
  failures.push(message);
  process.stdout.write(`  FAIL  ${message}\n`);
  for (const line of details.slice(0, 20)) process.stdout.write(`          ${line}\n`);
  if (details.length > 20) process.stdout.write(`          … ${details.length - 20} more\n`);
}

function heading(title) {
  process.stdout.write(`\n${title}\n`);
}

/* -------------------------------------------------------------------- fs */

async function walk(dir, filter) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full, filter)));
    else if (filter(full)) found.push(full);
  }
  return found;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

const rel = (file) => path.relative(ROOT, file);

/**
 * Removes `/* … *\/` blocks and whole-line `//` comments so a rule can be
 * discussed in a source comment without tripping the grep that enforces it.
 * Line comments are only stripped when the line STARTS with `//`, so a URL's
 * `https://` inside real code is never truncated.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

/** Build-asset URLs carry content hashes; digits in them mean nothing. */
function stripBuildAssetUrls(text) {
  return text.replace(/\/_next\/[^"'\\\s)]*/g, "");
}

/* --------------------------------------------------------- 1. route files */

/** The routes `global-constraints.md` §5 requires the export to contain. */
const REQUIRED = [
  "out/zh-CN.html",
  "out/zh-CN/prompts.html",
  "out/zh-CN/prompts/image.html",
  "out/zh-CN/prompts/models/nano-banana-pro.html",
  "out/zh-CN/prompts/country-miniature-stamp-poster.html",
  "out/zh-CN/blog.html",
  "out/zh-CN/blog/category/guides.html",
  "out/404.html",
];

async function checkRequiredFiles() {
  heading("1. required routes in out/");
  const missing = [];
  for (const relative of REQUIRED) {
    if (!(await exists(path.join(ROOT, relative)))) missing.push(relative);
  }
  if (missing.length > 0) fail(`${missing.length} required file(s) missing`, missing);
  else ok(`${REQUIRED.length} required route files present`);

  const articles = await walk(path.join(OUT, "zh-CN", "blog"), (file) => file.endsWith(".html"));
  const topLevelArticles = articles.filter(
    (file) => path.dirname(file) === path.join(OUT, "zh-CN", "blog"),
  );
  if (topLevelArticles.length === 0) fail("no out/zh-CN/blog/*.html article pages");
  else ok(`${topLevelArticles.length} blog article page(s)`);
}

/* --------------------------------------------------- 2. forbidden patterns */

/**
 * `iframe` / `srcdoc` / hash routing are banned outright (global constraint 2).
 * The `srcdoc` needle is matched case-insensitively as an attribute, not as a
 * bare word, so prose that merely mentions it in a comment is not a hit.
 */
const FORBIDDEN = [
  { id: "<iframe", pattern: /<iframe[\s>]/gi },
  { id: "srcdoc=", pattern: /\bsrcdoc\s*=/gi },
  { id: "location.hash", pattern: /\blocation\s*\.\s*hash\b/g },
];

async function checkForbidden(files, label, { comments = "keep" } = {}) {
  heading(`${label}`);
  const hits = [];
  let scanned = 0;
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const text = comments === "strip" ? stripComments(raw) : raw;
    scanned += 1;
    for (const { id, pattern } of FORBIDDEN) {
      const matches = text.match(pattern);
      if (matches !== null) hits.push(`${rel(file)}: ${id} ×${matches.length}`);
    }
  }
  if (hits.length > 0) fail(`${hits.length} forbidden pattern hit(s) in ${scanned} file(s)`, hits);
  else ok(`0 iframe / srcdoc / location.hash in ${scanned} file(s)`);
}

/* ------------------------------------------------------ 3. fragment hrefs */

/**
 * A `href="#…"` is allowed only when it points at an id that exists in the
 * SAME document (the skip link's `#main`, the model page's `#all-prompts`).
 * A bare `href="#"` is a placeholder link and always fails.
 */
async function checkFragmentHrefs(files) {
  heading("3. fragment hrefs point at ids in the same document");
  const bad = [];
  let total = 0;
  const byFragment = new Map();

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const ids = new Set(
      Array.from(text.matchAll(/\bid="([^"]+)"/g), (match) => match[1]),
    );
    for (const match of text.matchAll(/href="#([^"]*)"/g)) {
      total += 1;
      const fragment = match[1];
      byFragment.set(`#${fragment}`, (byFragment.get(`#${fragment}`) ?? 0) + 1);
      if (fragment === "") {
        bad.push(`${rel(file)}: href="#" placeholder link`);
      } else if (!ids.has(fragment)) {
        bad.push(`${rel(file)}: href="#${fragment}" has no matching id in this document`);
      }
    }
  }

  const inventory = [...byFragment.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([fragment, count]) => `${fragment} ×${count}`);
  process.stdout.write(`        fragments seen: ${inventory.join(", ") || "none"}\n`);

  if (bad.length > 0) fail(`${bad.length} of ${total} fragment href(s) unresolved`, bad);
  else ok(`${total} fragment href(s), all resolved in-document`);
}

/**
 * `src/` must not build a PLACEHOLDER `#` href — an empty fragment is a link
 * that goes nowhere (global constraint 5). Non-empty fragments are real
 * in-page anchors; check 3 above already proves every one of them resolves in
 * the shipped HTML, so they are listed here rather than failed.
 */
async function checkSourceFragmentHrefs(files) {
  heading("4. no `#` placeholder hrefs in src/");
  const bad = [];
  const anchors = new Map();
  for (const file of files) {
    const text = stripComments(await readFile(file, "utf8"));
    for (const match of text.matchAll(/href=(?:"#([^"]*)"|\{`#([^`]*)`\})/g)) {
      const fragment = match[1] ?? match[2] ?? "";
      if (fragment === "") {
        bad.push(`${rel(file)}: href="#" placeholder link`);
        continue;
      }
      anchors.set(`${rel(file)}: #${fragment}`, true);
    }
  }
  for (const anchor of anchors.keys()) process.stdout.write(`        in-page anchor  ${anchor}\n`);
  if (bad.length > 0) fail(`${bad.length} placeholder href(s) in src/`, bad);
  else ok(`0 placeholder hrefs in src/ (${anchors.size} real in-page anchor(s))`);
}

/* ------------------------------------------------------- 5. data honesty */

/** Only zh-CN is published, so no `en` alternate may ship (constraint 4). */
async function checkNoEnglishAlternate(files) {
  heading("5. no en hreflang in the export");
  const hits = [];
  const langs = new Map();
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/hreflang="([^"]*)"/g)) {
      langs.set(match[1], (langs.get(match[1]) ?? 0) + 1);
      if (/^en\b/i.test(match[1] ?? "")) hits.push(`${rel(file)}: hreflang="${match[1]}"`);
    }
  }
  const inventory = [...langs.entries()].map(([lang, count]) => `${lang} ×${count}`);
  process.stdout.write(`        hreflang values: ${inventory.join(", ") || "none"}\n`);
  if (hits.length > 0) fail(`${hits.length} en hreflang tag(s)`, hits);
  else ok("0 en hreflang tags");
}

/**
 * The prototype declared counts (982 prompts, 324 条, 136 条) that this phase's
 * fixture does not have. Constraint 3 forbids rendering them as if implemented.
 */
const PROTOTYPE_NUMBERS = [
  { id: "982", pattern: /982/g },
  { id: "324 条", pattern: /324\s*条/g },
  { id: "136 条", pattern: /136\s*条/g },
];

async function checkPrototypeNumbers(files) {
  heading("6. no prototype-declared counts in the export");
  const hits = [];
  for (const file of files) {
    const text = stripBuildAssetUrls(await readFile(file, "utf8"));
    for (const { id, pattern } of PROTOTYPE_NUMBERS) {
      const matches = text.match(pattern);
      if (matches !== null) hits.push(`${rel(file)}: "${id}" ×${matches.length}`);
    }
  }
  if (hits.length > 0) fail(`${hits.length} prototype count(s) rendered`, hits);
  else ok(`0 occurrences of ${PROTOTYPE_NUMBERS.map((n) => n.id).join(" / ")}`);
}

/**
 * Presentation truth must survive the real export, not only component tests:
 * creator handles carry one `@`, every shell names the repository snapshot,
 * and static pages cannot depend on React moving a streamed hidden buffer into
 * `<main>` after JavaScript starts.
 */
async function checkPresentationTruth(files) {
  heading("7. presentation truth and no-JS static HTML");
  const hits = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (/@@[A-Za-z0-9_]/.test(text)) hits.push(`${rel(file)}: double-@ creator handle`);
    if (text.includes("尚未接入内容仓库")) hits.push(`${rel(file)}: snapshot placeholder`);
    if (!/数据快照日期：[\s\S]{0,40}\d{4}-\d{2}-\d{2}/.test(text)) {
      hits.push(`${rel(file)}: missing dated footer snapshot`);
    }
    if (/<div hidden id="S:\d+">/.test(text)) {
      hits.push(`${rel(file)}: streamed content hidden until JavaScript runs`);
    }
    if (/<template id="B:\d+">/.test(text)) {
      hits.push(`${rel(file)}: unresolved Suspense boundary parked in the HTML`);
    }
    // The `<h1>` must be *inside* `<main>`, not merely present somewhere in the
    // document — a heading sitting in a hidden buffer is not published content.
    const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(text);
    if (main === null) hits.push(`${rel(file)}: no <main>`);
    else if (!/<h1\b/.test(main[1])) hits.push(`${rel(file)}: no <h1> inside <main>`);
  }
  if (hits.length > 0) fail(`${hits.length} presentation truth violation(s)`, hits);
  else {
    ok(
      `${files.length} HTML file(s) expose dated, no-JS-safe content without double handles, ` +
        `each with its <h1> inside <main> and no hidden Suspense buffer`,
    );
  }
}

/* ------------------------------------------------------------------ main */

const outHtml = await walk(OUT, (file) => file.endsWith(".html"));
const srcFiles = await walk(SRC, (file) => /\.(ts|tsx|css)$/.test(file));

process.stdout.write(
  `check-static-output: ${outHtml.length} html file(s) in out/, ${srcFiles.length} source file(s) in src/\n`,
);

if (outHtml.length === 0) {
  fail("out/ contains no HTML — run `pnpm build` first");
} else {
  await checkRequiredFiles();
  await checkForbidden(outHtml, "2a. forbidden patterns in out/**/*.html");
  await checkForbidden(srcFiles, "2b. forbidden patterns in src/", { comments: "strip" });
  await checkFragmentHrefs(outHtml);
  await checkSourceFragmentHrefs(srcFiles);
  await checkNoEnglishAlternate(outHtml);
  await checkPrototypeNumbers(outHtml);
  await checkPresentationTruth(outHtml);
}

process.stdout.write("\n");
if (failures.length > 0) {
  process.stdout.write(`check-static-output: FAILED (${failures.length} check(s))\n`);
  process.exit(1);
}
process.stdout.write("check-static-output: PASSED\n");
