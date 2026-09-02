#!/usr/bin/env node
/**
 * Extracts every datum the flow-proto wireframe embeds into a typed fixture
 * under `src/data/wireframe/`, plus an audit trail in
 * `evidence/fixture-extraction.md`.
 *
 * Run with `pnpm extract:wireframe`. The script is deterministic: running it
 * twice produces byte-identical files (verified by tests/unit/content/extract.test.ts).
 *
 * Reading strategy: the prototype embeds its four pages as JS string literals in
 * `const PAGES={l1:"…",l2:"…",l3:"…",l4:"…"};` inside a single <script>. We slice
 * that declaration out and evaluate it, then parse each page as HTML.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "node-html-parser";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const REPO = resolve(FRONTEND, "..");
const WIREFRAME = join(REPO, "docs/wireframes/flow-proto.html");
const DATA_DIR = join(FRONTEND, "src/data/wireframe");
const EVIDENCE = join(FRONTEND, "evidence/fixture-extraction.md");

const OBSERVED_AT = "2026-08-20";
const SOURCE_LABEL = "docs/wireframes/flow-proto.html";
const PAGE_IDS = ["l1", "l2", "l3", "l4"];
const GOLDEN_ID = "2063814043631280180";
const GOLDEN_SLUG = "country-miniature-stamp-poster";
const L1_FEATURED_ID = "2071174186978951379";

/** Every datum we deliberately leave out of the fixture, with the reason. */
const exclusions = [];
function exclude(what, reason) {
  exclusions.push({ what, reason });
}

/* ----------------------------------------------------------------- helpers */

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function text(node) {
  return node === null || node === undefined ? "" : node.textContent.replace(/\s+/g, " ").trim();
}

/** `2,512` → 2512. `3.8K` → 3800 (rounded, flagged by the caller). */
function parseCount(raw) {
  const value = raw.replace(/[,\s]/g, "");
  const match = /^(\d+(?:\.\d+)?)([KM]?)$/i.exec(value);
  if (match === null) return { value: null, rounded: false };
  const base = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "K") return { value: Math.round(base * 1000), rounded: true };
  if (unit === "M") return { value: Math.round(base * 1_000_000), rounded: true };
  return { value: base, rounded: false };
}

function unique(values) {
  return [...new Set(values)];
}

function assert(condition, message) {
  if (!condition) throw new Error(`extract-wireframe: ${message}`);
}

/* ------------------------------------------------------------ page loading */

function loadPages() {
  const html = readFileSync(WIREFRAME, "utf8");
  const start = html.indexOf("const PAGES=");
  assert(start !== -1, "could not find `const PAGES=` in the wireframe");
  const end = html.indexOf("\n};", start);
  assert(end !== -1, "could not find the end of the PAGES declaration");
  const declaration = html.slice(start, end + 3);
  // The wireframe embeds its four pages as JS string literals; evaluating the
  // declaration is the only faithful way to unescape them.
  const pages = new Function(`${declaration}\nreturn PAGES;`)();
  for (const id of PAGE_IDS) assert(typeof pages[id] === "string", `PAGES.${id} is missing`);
  return Object.fromEntries(PAGE_IDS.map((id) => [id, parse(pages[id])]));
}

/* --------------------------------------------------------------- taxonomy */

/**
 * The four pages label the same axis differently (`Camera movement` on L1 cards,
 * `Camera / shot language` on L2/L3 cards, `Camera movement / shot language` on
 * the L1 tile). We canonicalise on the L1 tile label where one exists and keep
 * every raw variant as an alias.
 */
const ALIASES = {
  technique: {
    "Camera movement": "Camera movement / shot language",
    "Camera / shot language": "Camera movement / shot language",
    "Transition / morph": "Transition / morph / match cut",
  },
  useCase: {
    "Web & motion": "Web & motion design",
  },
  style: {
    // L4 renders its chips in Chinese; 超写实 is the same term as Photorealistic.
    超写实: "Photorealistic",
  },
  model: {},
  subject: {},
  contentType: {},
};

/**
 * Terms the prototype only ever labels in Chinese (L4 chips, content-type
 * tiles), plus `unknown`, which the prototype has no tile for at all.
 */
const EXTRA_TERMS = [
  { axis: "technique", label: "微缩摄影", slug: "miniature-photography", labelZh: "微缩摄影" },
  { axis: "contentType", label: "图片", slug: "image", labelZh: "图片" },
  { axis: "contentType", label: "视频", slug: "video", labelZh: "视频" },
  { axis: "contentType", label: "未标注类型", slug: "unknown", labelZh: "未标注类型" },
];

/** zh labels the prototype itself uses for a term (footer / related links / L4). */
const LABEL_ZH = {
  "useCase:fashion": "时尚",
  "useCase:beauty": "美妆",
  "useCase:advertising": "广告",
  "useCase:food-beverage": "餐饮",
  "useCase:automotive": "汽车",
  "style:cinematic": "电影感",
  "style:photorealistic": "写实风",
  "style:luxury": "奢华风",
  "style:retro-vintage": "复古风",
  "technique:camera-movement-shot-language": "镜头运动",
  "technique:transition-morph-match-cut": "转场",
  "technique:image-to-video": "图生视频",
  "technique:multi-shot-storyboard": "分镜",
};

/**
 * @typedef {object} TaxonomyTerm
 * @property {string} id
 * @property {string} axis
 * @property {string} slug
 * @property {string} label
 * @property {string | null} labelZh
 * @property {string[]} aliases
 * @property {number | null} wireframeDeclaredCount
 * @property {string[]} appearsOn
 */

class TaxonomyRegistry {
  constructor() {
    /** @type {Map<string, TaxonomyTerm>} */
    this.terms = new Map();
  }

  key(axis, slug) {
    return `${axis}:${slug}`;
  }

  /** Registers/updates a canonical term. Returns its slug. */
  register(axis, rawLabel, { page, declaredCount = null, slug: forcedSlug } = {}) {
    const canonicalLabel = ALIASES[axis][rawLabel] ?? rawLabel;
    const extra = EXTRA_TERMS.find((t) => t.axis === axis && t.label === canonicalLabel);
    const slug = forcedSlug ?? extra?.slug ?? slugify(canonicalLabel);
    assert(slug.length > 0, `taxonomy term "${rawLabel}" (${axis}) produced an empty slug`);

    const id = this.key(axis, slug);
    const existing = this.terms.get(id);
    const term = existing ?? {
      id,
      axis,
      slug,
      label: canonicalLabel,
      labelZh: extra?.labelZh ?? LABEL_ZH[id] ?? null,
      aliases: [],
      wireframeDeclaredCount: null,
      appearsOn: [],
    };
    if (rawLabel !== canonicalLabel && !term.aliases.includes(rawLabel)) term.aliases.push(rawLabel);
    if (page !== undefined && !term.appearsOn.includes(page)) term.appearsOn.push(page);
    // L1 tiles declare library-wide counts; keep the first (widest-scope) one.
    if (declaredCount !== null && term.wireframeDeclaredCount === null) {
      term.wireframeDeclaredCount = declaredCount;
    }
    this.terms.set(id, term);
    return slug;
  }

  list() {
    return [...this.terms.values()]
      .map((term) => ({ ...term, aliases: [...term.aliases].sort(), appearsOn: sortPages(term.appearsOn) }))
      .sort((a, b) => a.axis.localeCompare(b.axis) || a.slug.localeCompare(b.slug));
  }
}

function sortPages(pages) {
  return [...new Set(pages)].sort((a, b) => PAGE_IDS.indexOf(a) - PAGE_IDS.indexOf(b));
}

/* ------------------------------------------------------------------ media */

function mediaFromBadge(label) {
  if (label === null) return { kind: "image", total: 1, durationSeconds: null };
  const video = /视频|VIDEO/i.test(label);
  const durationMatch = /(\d+)s/.exec(label);
  const totalMatch = /×(\d+)/.exec(label);
  const indexTotalMatch = /(\d+)\s*\/\s*(\d+)/.exec(label);
  return {
    kind: video ? "video" : "image",
    total: totalMatch !== null ? Number(totalMatch[1]) : indexTotalMatch !== null ? Number(indexTotalMatch[2]) : 1,
    durationSeconds: video && durationMatch !== null ? Number(durationMatch[1]) : null,
  };
}

function mediaAlt(kind, index, total, durationSeconds) {
  if (kind === "video") {
    return durationSeconds === null ? "来源帖媒体（视频）" : `来源帖媒体（视频 ${durationSeconds}s）`;
  }
  return total > 1 ? `来源帖媒体（图片 ${index}/${total}）` : "来源帖媒体（图片）";
}

/**
 * X serves one photo at several sizes behind a `name` query parameter —
 * `thumb` ≈150, `small` ≈680, `medium` ≈1200, `large` ≈2048 px on the long
 * edge. Every prototype URL pins `name=small`, so any slot wider than ~340 CSS
 * px on a 2× display was being upscaled from 680 px. Emitting the ladder as a
 * `srcset` lets the browser pick; `src` keeps the prototype's own URL as the
 * fallback for anything that cannot read `srcset`.
 *
 * Only `pbs.twimg.com` URLs that actually carry a `name` parameter get one.
 * Any other host (or an unparsable URL) gets `null` — we do not invent a size
 * ladder for a CDN whose contract we have not verified.
 */
const X_MEDIA_HOST = "pbs.twimg.com";
const X_SRCSET_STEPS = [
  ["small", 680],
  ["medium", 1200],
  ["large", 2048],
];

function buildSrcSet(src) {
  let url;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.hostname !== X_MEDIA_HOST) return null;
  if (!url.searchParams.has("name")) return null;

  return X_SRCSET_STEPS.map(([name, width]) => {
    const variant = new URL(url);
    variant.searchParams.set("name", name);
    return `${variant.toString()} ${width}w`;
  }).join(", ");
}

/**
 * @typedef {object} RawMediaEntry
 * @property {string} id
 * @property {"image" | "video"} kind
 * @property {string} src
 * @property {string} alt
 * @property {string | null} label
 * @property {number | null} durationSeconds
 * @property {number} index
 * @property {number} total
 */

function buildMedia(promptId, entries) {
  return entries.map((entry, i) => ({
    id: `${promptId}-${i + 1}`,
    kind: entry.kind,
    src: entry.src,
    srcSet: buildSrcSet(entry.src),
    alt: mediaAlt(entry.kind, i + 1, entry.total, entry.durationSeconds),
    label: entry.label,
    durationSeconds: entry.durationSeconds,
    index: i + 1,
    total: entry.total,
  }));
}

/* ------------------------------------------------------------- card parsing */

function parseL1Cards(doc, registry) {
  const cards = doc.querySelectorAll("template#allcards article.card");
  return cards.map((card) => {
    const id = card.getAttribute("data-id");
    assert(typeof id === "string" && id.length > 0, "an L1 card has no data-id");

    const listAttr = (name) => (card.getAttribute(name) ?? "").split("|").filter(Boolean);
    const title = text(card.querySelector("h3"));
    const metaSpans = card.querySelectorAll(".cardmeta span").map((s) => text(s));
    const handle = text(card.querySelector(".cardmeta a"));
    const likes = parseCount((metaSpans[2] ?? "").replace("赞", ""));
    const bookmarks = parseCount((metaSpans[3] ?? "").replace("藏", ""));

    const badge = card.querySelector(".mb");
    const img = card.querySelector(".ph img");
    const label = badge === null ? null : text(badge);
    const shape = mediaFromBadge(label);
    const media =
      img === null
        ? []
        : buildMedia(id, [{ src: img.getAttribute("src"), label, kind: shape.kind, total: shape.total, durationSeconds: shape.durationSeconds }]);
    if (img === null) {
      exclude(`L1 card ${id} media`, `原帖无媒体（prototype placeholder "${text(card.querySelector(".ph"))}"）→ media: []`);
    }

    const vs = Number(card.getAttribute("data-vs"));

    return {
      page: "l1",
      id,
      slug: null,
      title,
      promptText: card.querySelector(".ptext").textContent,
      modelSlugs: listAttr("data-models").map((v) => registry.register("model", v, { page: "l1" })),
      useCaseSlugs: listAttr("data-use_cases").map((v) => registry.register("useCase", v, { page: "l1" })),
      techniqueSlugs: listAttr("data-techniques").map((v) => registry.register("technique", v, { page: "l1" })),
      styleSlugs: listAttr("data-styles").map((v) => registry.register("style", v, { page: "l1" })),
      subjectSlugs: [],
      handle,
      sourceUrl: card.querySelector("a.src").getAttribute("href"),
      publishedAt: card.getAttribute("data-date") ?? null,
      likes: likes.value,
      bookmarks: bookmarks.value,
      metricsRounded: likes.rounded || bookmarks.rounded,
      valueScore: Number.isFinite(vs) ? vs : null,
      highValue: card.getAttribute("data-hv") === "1",
      media,
      featuredOn: id === L1_FEATURED_ID ? ["l1"] : [],
    };
  });
}

function parseTaggedCard(page, card, registry, featuredIds) {
  const link = card.querySelector(".meta a[href*='/status/']");
  assert(link !== null, `a ${page} card has no source link`);
  const sourceUrl = link.getAttribute("href");
  const id = sourceUrl.split("/status/")[1];
  assert(typeof id === "string" && id.length > 0, `a ${page} card has an unparseable source URL`);

  const tags = (card.getAttribute("data-tags") ?? "").split("|").filter(Boolean);
  const byAxis = { model: [], useCase: [], technique: [], style: [], subject: [] };
  const AXIS_OF_TAG = {
    model: "model",
    use_case: "useCase",
    technique: "technique",
    style: "style",
    subject: "subject",
  };
  for (const tag of tags) {
    const at = tag.indexOf(":");
    const axis = AXIS_OF_TAG[tag.slice(0, at)];
    assert(axis !== undefined, `unknown tag axis in "${tag}" on ${page}`);
    byAxis[axis].push(registry.register(axis, tag.slice(at + 1), { page }));
  }

  const metrics = card.querySelectorAll(".meta b").map((b) => parseCount(text(b)));
  const likes = metrics[0] ?? { value: null, rounded: false };
  const bookmarks = metrics[1] ?? { value: null, rounded: false };

  const badge = card.querySelector(".mb");
  const label = badge === null ? null : text(badge);
  const shape = mediaFromBadge(label);
  const img = card.querySelector(".media img");

  const detailHref = card.querySelector(".acts a[href^='/prompts/']")?.getAttribute("href") ?? null;

  return {
    page,
    id,
    slug: detailHref === null ? null : detailHref.replace("/prompts/", ""),
    title: text(card.querySelector("h3")).replace(/…$/, "").trim(),
    promptText: card.querySelector("pre.prompt").textContent,
    modelSlugs: byAxis.model,
    useCaseSlugs: byAxis.useCase,
    techniqueSlugs: byAxis.technique,
    styleSlugs: byAxis.style,
    subjectSlugs: byAxis.subject,
    handle: text(card.querySelector(".meta span")),
    sourceUrl,
    publishedAt: null,
    likes: likes.value,
    bookmarks: bookmarks.value,
    metricsRounded: likes.rounded || bookmarks.rounded,
    valueScore: null,
    highValue: card.querySelector(".hv") !== null,
    media:
      img === null
        ? []
        : buildMedia(id, [{ src: img.getAttribute("src"), label, kind: shape.kind, total: shape.total, durationSeconds: shape.durationSeconds }]),
    featuredOn: featuredIds.has(id) ? ["l2"] : [],
  };
}

function parseGoldenRecord(doc, registry) {
  const promptText = doc.querySelector("#ptext").textContent;
  const options = doc.querySelectorAll("#countryOpts .opt").map((b) => text(b));
  assert(options.length > 0, "L4 country options are missing");

  const steps = doc.querySelectorAll(".steps .step").map((step, i) => ({
    order: i + 1,
    title: text(step.querySelector("b")),
    body: text(step.querySelector("p")),
  }));

  const variations = doc.querySelectorAll(".vargrid .vcard").map((card) => ({
    title: text(card.querySelector("b")),
    variableValue: text(card.querySelector(".m")).replace(/^country\s*=\s*/i, ""),
    media: null,
    status: "pending",
  }));

  const signals = {};
  for (const cell of doc.querySelectorAll(".signals div")) {
    signals[text(cell.querySelector("span"))] = parseCount(text(cell.querySelector("b"))).value;
  }

  const followersRow = doc.querySelectorAll(".panel .kv").find((kv) => text(kv.querySelector("span")) === "粉丝");
  const followers = followersRow === undefined ? null : parseCount(text(followersRow.querySelector("b"))).value;

  const mediaEntries = doc.querySelectorAll(".ph.has").map((ph) => {
    const label = text(ph.querySelector(".mb"));
    const shape = mediaFromBadge(label);
    return { src: ph.querySelector("img").getAttribute("src"), label, kind: shape.kind, total: shape.total, durationSeconds: shape.durationSeconds };
  });

  // Chips: `Prompt` is a content badge, `Higgsfield` is the generation platform —
  // neither is a taxonomy term. `GPT Image 2` is the model, the rest are tags.
  const chips = doc.querySelectorAll(".kicker .chip").map((c) => text(c));
  exclude("L4 chip `Prompt`", "内容类型徽标，不是 taxonomy 词条");
  exclude("L4 chip `Higgsfield`", "生成平台标签（brief 明确不建模为 taxonomy）");
  assert(chips.includes("GPT Image 2"), "L4 model chip changed");

  const parameterSpecs = [
    { label: "分辨率", value: "8k resolution" },
    { label: "渲染器", value: "octane render" },
    { label: "镜头", value: "tilt-shift lens effect" },
    { label: "景深", value: "shallow depth of field" },
  ];
  for (const spec of parameterSpecs) {
    assert(promptText.includes(spec.value), `L4 prompt no longer contains the parameter "${spec.value}"`);
  }

  const countryCount = promptText.split("[COUNTRY]").length - 1;
  assert(countryCount > 0, "L4 prompt no longer contains [COUNTRY]");

  // The prototype's `varnote` under the payload: a sentence about THIS prompt's
  // variable ("同时驱动地标、动植物、传统服饰…"), not a generic template. It is
  // carried as data on the variable so the detail page can print it verbatim
  // instead of inventing one sentence every record would repeat. The selector
  // deliberately skips `#countryNote`, which is the 换个国家试试 live status
  // line, not a description of the variable.
  const varnoteNode = doc
    .querySelectorAll(".varnote")
    .find((node) => node.getAttribute("id") !== "countryNote");
  assert(varnoteNode !== undefined, "L4 varnote is missing");
  const variableNote = text(varnoteNode);
  assert(
    variableNote.startsWith("[COUNTRY]") && variableNote.endsWith("。"),
    "L4 varnote no longer reads as a [COUNTRY] sentence",
  );

  return {
    page: "l4",
    id: GOLDEN_ID,
    slug: GOLDEN_SLUG,
    slugSource: "curated",
    title: text(doc.querySelector("h1")),
    summary: text(doc.querySelector(".dek")),
    promptText,
    modelSlugs: [registry.register("model", "GPT Image 2", { page: "l4" })],
    useCaseSlugs: [],
    techniqueSlugs: [registry.register("technique", "微缩摄影", { page: "l4" })],
    styleSlugs: [registry.register("style", "超写实", { page: "l4" })],
    subjectSlugs: [],
    handle: text(doc.querySelector(".byline b")),
    sourceUrl: doc.querySelector(".srcnote a").getAttribute("href"),
    publishedAt: /(\d{4}-\d{2}-\d{2})/.exec(text(doc.querySelector(".byline")))?.[1] ?? null,
    followers,
    likes: signals["点赞"] ?? null,
    bookmarks: signals["收藏"] ?? null,
    views: signals["浏览"] ?? null,
    reposts: signals["转发"] ?? null,
    replies: signals["评论"] ?? null,
    quotes: signals["引用"] ?? null,
    metricsRounded: false,
    valueScore: null,
    highValue: false,
    media: buildMedia(GOLDEN_ID, mediaEntries),
    featuredOn: [],
    variables: [
      { token: "[COUNTRY]", label: "国家", options, defaultValue: options[0], note: variableNote },
    ],
    steps,
    requiredInputs: ["国家名（替换 [COUNTRY]）"],
    optionalInputs: [],
    parameters: parameterSpecs,
    variations,
    countryCount,
  };
}

/* ------------------------------------------------------------------ tiles */

function registerTiles(pages, registry) {
  const declared = { models: [], contentTypes: [] };

  // L1 feature tiles: library-wide declared counts per axis.
  const AXIS_OF_TILE = { models: "model", use_cases: "useCase", techniques: "technique", styles: "style" };
  for (const tile of pages.l1.querySelectorAll("a.feature[data-axis]")) {
    const axis = AXIS_OF_TILE[tile.getAttribute("data-axis")];
    if (axis === undefined) continue;
    const label = tile.getAttribute("data-value");
    const count = parseCount(text(tile.querySelector("p")).replace("条提示词", "")).value;
    const slug = registry.register(axis, label, { page: "l1", declaredCount: count });
    if (axis === "model") declared.models.push({ slug, label, page: "l1", promptCount: count, hotCount: null, hasPage: false });
  }

  // L2 facet chips (image-scope counts) + subject axis, which only exists here.
  for (const page of ["l2", "l3"]) {
    for (const chip of pages[page].querySelectorAll("button.chip[data-facet]")) {
      const AXIS_OF_FACET = { use_case: "useCase", style: "style", subject: "subject" };
      const axis = AXIS_OF_FACET[chip.getAttribute("data-facet")];
      if (axis === undefined) continue;
      const count = parseCount(text(chip.querySelector("small"))).value;
      registry.register(axis, chip.getAttribute("data-value"), { page, declaredCount: count });
    }
  }

  // L2 model tiles: `#` href means the prototype has no page for that model.
  const modelSection = pages.l2
    .querySelectorAll("section.sec")
    .find((s) => text(s.querySelector("h2")) === "按模型浏览");
  assert(modelSection !== undefined, "L2 model tile section not found");
  for (const tile of modelSection.querySelectorAll("a.tile")) {
    const label = text(tile.querySelector(".t"));
    const [promptRaw, hotRaw] = text(tile.querySelector(".n")).split("·");
    const promptCount = parseCount((promptRaw ?? "").replace("条", "")).value;
    const slug = registry.register("model", label, { page: "l2", declaredCount: promptCount });
    const href = tile.getAttribute("href");
    declared.models.push({
      slug,
      label,
      page: "l2",
      promptCount,
      hotCount: parseCount((hotRaw ?? "").replace(/条热门/, "")).value,
      hasPage: href !== null && href.startsWith("/prompts/models/"),
    });
    if (href === "#") exclude(`L2 model tile "${label}" href`, "原型为 `#` 占位链接：本阶段不渲染为链接");
  }

  // L2 "其他类型" tiles → contentType axis.
  const typeSection = pages.l2
    .querySelectorAll("section.sec")
    .find((s) => text(s.querySelector("h2")) === "其他类型");
  assert(typeSection !== undefined, "L2 content-type tile section not found");
  const TYPE_SLUG = { 图片: "image", 视频: "video" };
  for (const tile of typeSection.querySelectorAll("a.tile")) {
    const label = text(tile.querySelector(".t"));
    const count = parseCount(text(tile.querySelector(".n")).split("·")[0].replace("条", "")).value;
    const slug = TYPE_SLUG[label];
    if (slug === undefined) {
      exclude(`L2 content-type tile "${label}"（声明 ${count} 条）`, "未建模的内容类型：Prompt 只区分 image / video / unknown");
      continue;
    }
    registry.register("contentType", label, { page: "l2", declaredCount: count, slug });
    declared.contentTypes.push({ slug, count });
  }
  registry.register("contentType", "未标注类型", { page: "l1", slug: "unknown" });
  exclude(
    "contentType `未标注类型`（slug `unknown`）",
    "原型没有这个词条：为原帖无媒体、且不在图片页面的 Prompt 自造的诚实兜底标签，不是原型数据",
  );

  return declared;
}

/* --------------------------------------------------------------- creators */

function creatorIdOf(handle) {
  const id = slugify(handle.replace(/^@/, ""));
  assert(id.length > 0, `creator handle "${handle}" produced an empty id`);
  return id;
}

/**
 * @typedef {object} DeclaredCreator
 * @property {string} handle
 * @property {string} url
 * @property {string | null} avatarUrl
 * @property {number | null} wireframeDeclaredPromptCount
 * @property {number | null} wireframeDeclaredLikes
 * @property {number | null} wireframeDeclaredBookmarks
 */

function parseCreatorDirectories(pages) {
  /** @type {Map<string, DeclaredCreator>} */
  const declared = new Map();

  for (const anchor of pages.l1.querySelectorAll(".creators .creator")) {
    const handle = text(anchor.querySelector("b"));
    const [prompts, likes, bookmarks] = text(anchor.querySelector("span"))
      .split("·")
      .map((part) => parseCount(part.replace(/条提示词|赞|藏/g, "")).value);
    declared.set(handle, {
      handle,
      url: anchor.getAttribute("href"),
      avatarUrl: null,
      wireframeDeclaredPromptCount: prompts ?? null,
      wireframeDeclaredLikes: likes ?? null,
      wireframeDeclaredBookmarks: bookmarks ?? null,
    });
  }

  for (const entry of pages.l3.querySelectorAll(".inline-list span")) {
    const anchor = entry.querySelector("a");
    if (anchor === null) continue;
    const handle = text(anchor);
    const existing = declared.get(handle) ?? {
      handle,
      url: anchor.getAttribute("href"),
      avatarUrl: null,
      wireframeDeclaredPromptCount: null,
      wireframeDeclaredLikes: null,
      wireframeDeclaredBookmarks: null,
    };
    existing.avatarUrl = entry.querySelector("img")?.getAttribute("src") ?? existing.avatarUrl;
    // L3's count is model-scoped, so it must not overwrite L1's library-wide one.
    if (existing.wireframeDeclaredPromptCount === null) {
      existing.wireframeDeclaredPromptCount = parseCount(text(entry.querySelector("b"))).value;
    }
    declared.set(handle, existing);
  }

  return declared;
}

/* ------------------------------------------------------------------ merge */

/**
 * One card's worth of data as seen on a single page (l1/l2/l3), or the golden
 * L4 record. `mergePrompts` groups these by X status id and reduces each
 * group down to one merged prompt record.
 *
 * @typedef {object} PromptObservation
 * @property {string} id
 * @property {"l1" | "l2" | "l3" | "l4"} page
 * @property {string | null} slug
 * @property {string} title
 * @property {string} promptText
 * @property {string | null} [summary]
 * @property {RawMediaEntry[]} media
 * @property {string[]} modelSlugs
 * @property {string[]} useCaseSlugs
 * @property {string[]} techniqueSlugs
 * @property {string[]} styleSlugs
 * @property {string[]} subjectSlugs
 * @property {string} handle
 * @property {string} sourceUrl
 * @property {string | null} publishedAt
 * @property {number | null} likes
 * @property {number | null} bookmarks
 * @property {number | null} [views]
 * @property {number | null} [reposts]
 * @property {number | null} [replies]
 * @property {number | null} [quotes]
 * @property {boolean} metricsRounded
 * @property {number | null} valueScore
 * @property {boolean} highValue
 * @property {string[]} featuredOn
 */

function mergePrompts(observations, golden) {
  /** @type {Map<string, PromptObservation[]>} */
  const byId = new Map();
  for (const obs of observations) {
    const bucket = byId.get(obs.id) ?? [];
    bucket.push(obs);
    byId.set(obs.id, bucket);
  }
  byId.set(GOLDEN_ID, [golden]);

  const records = [];
  for (const [id, group] of byId) {
    const ordered = [...group].sort((a, b) => PAGE_IDS.indexOf(a.page) - PAGE_IDS.indexOf(b.page));
    const first = ordered[0];

    // Slug: L2/L3 publish one, the golden record has a curated one, otherwise
    // derive with the prototype's own rule (slugify(title)[0..44] + "-" + id).
    const wireframeSlug = ordered.find((o) => o.slug !== null && o.page !== "l4")?.slug ?? null;

    // The prototype's published slugs must be reproducible by our own rule; if
    // they ever stop matching, the rule (not the data) is wrong.
    for (const observation of ordered) {
      if (observation.slug === null || observation.page === "l4") continue;
      const derived = `${slugify(observation.title).slice(0, 44)}-${id}`;
      assert(
        derived === observation.slug,
        `slug rule mismatch on ${observation.page} for ${id}: derived "${derived}" ≠ published "${observation.slug}"`,
      );
    }

    const title = ordered.reduce((best, o) => (o.title.length > best.length ? o.title : best), "");
    let slug;
    let slugSource;
    if (id === GOLDEN_ID) {
      slug = GOLDEN_SLUG;
      slugSource = "curated";
    } else if (wireframeSlug !== null) {
      slug = wireframeSlug;
      slugSource = "wireframe-slug";
    } else {
      slug = `${slugify(title).slice(0, 44)}-${id}`;
      slugSource = "derived";
    }

    const promptText = ordered.reduce((best, o) => (o.promptText.length > best.length ? o.promptText : best), "");
    const media = ordered.reduce(
      (best, o) => (o.media.length > best.length ? o.media : best),
      /** @type {RawMediaEntry[]} */ ([]),
    );

    const exact = ordered.find((o) => !o.metricsRounded && o.likes !== null);
    const anyLikes = ordered.find((o) => o.likes !== null);
    const likesSource = exact ?? anyLikes ?? null;

    const appearsOn = sortPages(ordered.map((o) => o.page));
    const contentType = deriveContentType(media, appearsOn);

    records.push({
      id,
      slug,
      slugSource,
      title,
      summary: ordered.find((o) => o.summary !== undefined)?.summary ?? null,
      promptText,
      contentType: contentType.slug,
      contentTypeReason: contentType.reason,
      modelSlugs: unique(ordered.flatMap((o) => o.modelSlugs)).sort(),
      useCaseSlugs: unique(ordered.flatMap((o) => o.useCaseSlugs)).sort(),
      techniqueSlugs: unique(ordered.flatMap((o) => o.techniqueSlugs)).sort(),
      styleSlugs: unique(ordered.flatMap((o) => o.styleSlugs)).sort(),
      subjectSlugs: unique(ordered.flatMap((o) => o.subjectSlugs)).sort(),
      creatorId: creatorIdOf(first.handle),
      handle: first.handle,
      sourceUrl: first.sourceUrl,
      publishedAt: ordered.find((o) => o.publishedAt !== null)?.publishedAt ?? null,
      likes: likesSource?.likes ?? null,
      bookmarks: likesSource?.bookmarks ?? null,
      views: ordered.find((o) => o.views !== undefined && o.views !== null)?.views ?? null,
      reposts: ordered.find((o) => o.reposts !== undefined && o.reposts !== null)?.reposts ?? null,
      replies: ordered.find((o) => o.replies !== undefined && o.replies !== null)?.replies ?? null,
      quotes: ordered.find((o) => o.quotes !== undefined && o.quotes !== null)?.quotes ?? null,
      metricsRounded: likesSource?.metricsRounded ?? false,
      valueScore: ordered.find((o) => o.valueScore !== null)?.valueScore ?? null,
      highValue: ordered.some((o) => o.highValue),
      media,
      appearsOn,
      featuredOn: unique(ordered.flatMap((o) => o.featuredOn)).sort(),
      variables: first.variables ?? [],
      steps: first.steps ?? [],
      requiredInputs: first.requiredInputs ?? [],
      optionalInputs: first.optionalInputs ?? [],
      parameters: first.parameters ?? [],
      variations: first.variations ?? [],
    });
  }

  return records.sort((a, b) => a.id.localeCompare(b.id));
}

function deriveContentType(media, appearsOn) {
  const label = media[0]?.label ?? null;
  if (label !== null && /视频|VIDEO/i.test(label)) return { slug: "video", reason: `媒体标签 "${label}"` };
  if (label !== null && /图片|PHOTO|IMAGE/i.test(label)) return { slug: "image", reason: `媒体标签 "${label}"` };
  if (appearsOn.includes("l2") || appearsOn.includes("l3")) {
    return { slug: "image", reason: "出现在 L2 图片 Gallery / L3 图片模型页" };
  }
  return { slug: "unknown", reason: "原帖无媒体且未出现在图片页面，类型未知" };
}

/* ------------------------------------------------------------- collections */

/**
 * The prototype defines its six collections as JS predicates in the L1 script.
 * We re-express them as serialisable rules against canonical taxonomy slugs.
 */
const COLLECTIONS = [
  {
    slug: "cinematic-camera",
    title: "电影感镜头合集",
    subtitle: "镜头控制 × 电影质感",
    rule: {
      type: "axis-all",
      conditions: [
        { axis: "technique", value: "camera-movement-shot-language" },
        { axis: "style", value: "cinematic" },
      ],
    },
  },
  {
    slug: "multi-shot-storyboard",
    title: "多镜头分镜合集",
    subtitle: "一条提示词生成完整分镜",
    rule: { type: "axis-all", conditions: [{ axis: "technique", value: "multi-shot-storyboard" }] },
  },
  {
    slug: "transitions",
    title: "转场特效合集",
    subtitle: "无缝转场与形变",
    rule: { type: "axis-all", conditions: [{ axis: "technique", value: "transition-morph-match-cut" }] },
  },
  {
    slug: "beauty-photorealistic",
    title: "美妆写实合集",
    subtitle: "真实皮肤质感的美妆画面",
    rule: {
      type: "axis-all",
      conditions: [
        { axis: "useCase", value: "beauty" },
        { axis: "style", value: "photorealistic" },
      ],
    },
  },
  {
    slug: "template-prompts",
    title: "模板提示词合集",
    subtitle: "带占位变量，替换即用",
    rule: { type: "regex", pattern: "\\[[A-Z][A-Z0-9 _/-]{1,40}\\]|@img\\d+|@image\\d+" },
  },
  {
    slug: "advertising",
    title: "广告创意合集",
    subtitle: "面向投放的广告画面",
    rule: { type: "axis-all", conditions: [{ axis: "useCase", value: "advertising" }] },
  },
];

/* ---------------------------------------------------------------- writing */

const GENERATED_HEADER = [
  "// GENERATED by scripts/extract-wireframe.mjs — do not edit.",
  `// Source: ${SOURCE_LABEL} (snapshot ${OBSERVED_AT}).`,
  "// Only src/lib/content/fixture-repository.ts (and tests) may import this module.",
].join("\n");

function renderModule({ typeImports, name, type, value }) {
  const body = JSON.stringify(value, null, 2);
  return `${GENERATED_HEADER}\n\nimport type { ${typeImports.join(", ")} } from "@/lib/content/types";\n\nexport const ${name}: ${type} = ${body};\n`;
}

function writeIfChanged(path, contents) {
  let previous = null;
  try {
    previous = readFileSync(path, "utf8");
  } catch {
    previous = null;
  }
  if (previous === contents) return false;
  writeFileSync(path, contents, "utf8");
  return true;
}

/* ------------------------------------------------------------------- main */

function main() {
  const pages = loadPages();
  const registry = new TaxonomyRegistry();
  const declaredTiles = registerTiles(pages, registry);

  const l1 = parseL1Cards(pages.l1, registry);

  const featuredIds = new Set(
    (pages.l2.querySelectorAll("section.sec").find((s) => text(s.querySelector("h2")) === "精选") ?? { querySelectorAll: () => [] })
      .querySelectorAll("article.card")
      .map((card) => card.querySelector(".meta a[href*='/status/']").getAttribute("href").split("/status/")[1]),
  );

  const l2 = pages.l2.querySelectorAll("article.card").map((card) => parseTaggedCard("l2", card, registry, featuredIds));
  const l3 = pages.l3.querySelectorAll("article.card").map((card) => parseTaggedCard("l3", card, registry, featuredIds));
  const golden = parseGoldenRecord(pages.l4, registry);

  const prompts = mergePrompts([...l1, ...l2, ...l3], golden);
  assert(prompts.length === 35, `expected 35 unique prompts, got ${prompts.length}`);
  assert(
    new Set(prompts.map((p) => p.slug)).size === prompts.length,
    "prompt slugs are not unique",
  );

  /* creators */
  const declaredCreators = parseCreatorDirectories(pages);
  const creatorsById = new Map();
  // creatorIdOf() slugifies the handle, so two distinct handles that only
  // differ by characters slugify() strips (e.g. "@Foo_" and "@Foo") would
  // silently collide on the same id and one creator's data would clobber the
  // other's. Assert every id maps back to exactly one handle instead.
  const handleById = new Map();
  for (const prompt of prompts) {
    const previousHandle = handleById.get(prompt.creatorId);
    assert(
      previousHandle === undefined || previousHandle === prompt.handle,
      `creator id collision: handles "${previousHandle}" and "${prompt.handle}" both slugify to creator id "${prompt.creatorId}"`,
    );
    handleById.set(prompt.creatorId, prompt.handle);

    if (creatorsById.has(prompt.creatorId)) continue;
    const declared = declaredCreators.get(prompt.handle);
    creatorsById.set(prompt.creatorId, {
      id: prompt.creatorId,
      handle: prompt.handle,
      url: declared?.url ?? `https://x.com/${prompt.handle.replace(/^@/, "")}`,
      avatarUrl: declared?.avatarUrl ?? null,
      // Only the L4 golden record's source panel publishes a follower count.
      // Keyed off the creator's own handle (not "is this the first prompt we
      // saw for this creator"), so it still lands on the right creator even if
      // an earlier, non-golden prompt from the same handle is processed first.
      followers: prompt.handle === golden.handle ? (golden.followers ?? null) : null,
      wireframeDeclaredPromptCount: declared?.wireframeDeclaredPromptCount ?? null,
      wireframeDeclaredLikes: declared?.wireframeDeclaredLikes ?? null,
      wireframeDeclaredBookmarks: declared?.wireframeDeclaredBookmarks ?? null,
    });
  }
  const creators = [...creatorsById.values()].sort((a, b) => a.id.localeCompare(b.id));

  for (const [handle, declared] of declaredCreators) {
    if (creators.some((c) => c.handle === handle)) continue;
    exclude(
      `创作者 ${handle}（原型声明 ${declared.wireframeDeclaredPromptCount ?? "?"} 条）`,
      "四页中没有任何一张卡片属于该创作者，收录会渲染出 0 条的空创作者",
    );
  }

  /* models */
  const taxonomies = registry.list();
  const modelTerms = taxonomies.filter((t) => t.axis === "model");
  const promptCountBySlug = new Map();
  for (const prompt of prompts) {
    for (const slug of prompt.modelSlugs) promptCountBySlug.set(slug, (promptCountBySlug.get(slug) ?? 0) + 1);
  }

  const declaredRelated = {
    "nano-banana-pro": {
      models: pages.l3
        .querySelectorAll(".mesh a[href^='/prompts/models/']")
        .map((a) => a.getAttribute("href").replace("/prompts/models/", "")),
      useCases: pages.l3
        .querySelectorAll(".mesh a[href^='/prompts/use-cases/']")
        .map((a) => a.getAttribute("href").replace("/prompts/use-cases/", "")),
    },
  };

  const models = modelTerms
    .map((term) => {
      const tiles = declaredTiles.models.filter((m) => m.slug === term.slug);
      const l1Tile = tiles.find((m) => m.page === "l1");
      const l2Tile = tiles.find((m) => m.page === "l2");
      return {
        slug: term.slug,
        label: term.label,
        wireframeHasPage: tiles.some((m) => m.hasPage),
        wireframeDeclaredPromptCount: l1Tile?.promptCount ?? l2Tile?.promptCount ?? null,
        wireframeDeclaredHotCount: l2Tile?.hotCount ?? null,
        declaredRelatedModelSlugs: declaredRelated[term.slug]?.models ?? [],
        declaredRelatedUseCaseSlugs: declaredRelated[term.slug]?.useCases ?? [],
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  for (const model of models) {
    if ((promptCountBySlug.get(model.slug) ?? 0) === 0) {
      exclude(
        `模型 ${model.label}（原型声明 ${model.wireframeDeclaredPromptCount ?? "?"} 条）`,
        "fixture 中没有任何 Prompt 点名该模型：不生成模型页、taxonomy count 为 0",
      );
    }
  }

  const collections = COLLECTIONS.map((c) => ({ id: `collection:${c.slug}`, ...c }));

  /* ------------------------------------------------------------- write out */
  mkdirSync(DATA_DIR, { recursive: true });
  const written = [];

  written.push([
    "snapshot.ts",
    writeIfChanged(
      join(DATA_DIR, "snapshot.ts"),
      renderModule({
        typeImports: ["Snapshot"],
        name: "WIREFRAME_SNAPSHOT",
        type: "Snapshot",
        value: { observedAt: OBSERVED_AT, indexVersion: "wireframe-flow-proto", source: SOURCE_LABEL },
      }),
    ),
  ]);

  written.push([
    "taxonomies.ts",
    writeIfChanged(
      join(DATA_DIR, "taxonomies.ts"),
      renderModule({
        typeImports: ["WireframeTaxonomyRecord"],
        name: "WIREFRAME_TAXONOMIES",
        type: "readonly WireframeTaxonomyRecord[]",
        value: taxonomies,
      }),
    ),
  ]);

  written.push([
    "creators.ts",
    writeIfChanged(
      join(DATA_DIR, "creators.ts"),
      renderModule({
        typeImports: ["Creator"],
        name: "WIREFRAME_CREATORS",
        type: "readonly Creator[]",
        value: creators,
      }),
    ),
  ]);

  written.push([
    "prompts.ts",
    writeIfChanged(
      join(DATA_DIR, "prompts.ts"),
      renderModule({
        typeImports: ["WireframePromptRecord"],
        name: "WIREFRAME_PROMPTS",
        type: "readonly WireframePromptRecord[]",
        value: prompts,
      }),
    ),
  ]);

  written.push([
    "models.ts",
    writeIfChanged(
      join(DATA_DIR, "models.ts"),
      renderModule({
        typeImports: ["WireframeModelRecord"],
        name: "WIREFRAME_MODELS",
        type: "readonly WireframeModelRecord[]",
        value: models,
      }),
    ),
  ]);

  written.push([
    "collections.ts",
    writeIfChanged(
      join(DATA_DIR, "collections.ts"),
      renderModule({
        typeImports: ["Collection"],
        name: "WIREFRAME_COLLECTIONS",
        type: "readonly Collection[]",
        value: collections,
      }),
    ),
  ]);

  const report = buildReport({
    pages,
    counts: { l1: l1.length, l2: l2.length, l3: l3.length, l4: 1 },
    prompts,
    taxonomies,
    creators,
    models,
    collections,
    declaredTiles,
    golden,
    promptCountBySlug,
  });
  written.push(["evidence/fixture-extraction.md", writeIfChanged(EVIDENCE, report)]);

  for (const [name, changed] of written) {
    process.stdout.write(`${changed ? "updated" : "unchanged"}  ${name}\n`);
  }
  process.stdout.write(
    `\n${prompts.length} prompts · ${taxonomies.length} taxonomy terms · ${creators.length} creators · ${collections.length} collections\n`,
  );
}

/* ----------------------------------------------------------------- report */

function buildReport(ctx) {
  const { counts, prompts, taxonomies, creators, models, collections, golden, promptCountBySlug } = ctx;
  const lines = [];
  const push = (line = "") => lines.push(line);

  const ids = {
    l1: new Set(prompts.filter((p) => p.appearsOn.includes("l1")).map((p) => p.id)),
    l2: new Set(prompts.filter((p) => p.appearsOn.includes("l2")).map((p) => p.id)),
    l3: new Set(prompts.filter((p) => p.appearsOn.includes("l3")).map((p) => p.id)),
    l4: new Set([GOLDEN_ID]),
  };

  push("# Fixture extraction record");
  push();
  push(`GENERATED by \`scripts/extract-wireframe.mjs\` (\`pnpm extract:wireframe\`) — do not edit by hand.`);
  push();
  push(`- Source: \`${SOURCE_LABEL}\``);
  push(`- Snapshot (\`observedAt\`): **${OBSERVED_AT}** — the wireframe's own \`CUT\` table and footer date.`);
  push(`- Trending windows: 7d ≥ ${shiftDate(OBSERVED_AT, 7)}, 30d ≥ ${shiftDate(OBSERVED_AT, 30)}.`);
  push(`- Content hash of this run: \`${hashOf(prompts)}\``);
  push();

  push("## 1. Cards per page");
  push();
  push("| Page | `article.card` nodes | unique X status ids |");
  push("| --- | --- | --- |");
  push(`| L1 (\`template#allcards\`) | ${counts.l1} | ${ids.l1.size} |`);
  push(`| L2 (image gallery) | ${counts.l2} | ${ids.l2.size} |`);
  push(`| L3 (Nano Banana Pro) | ${counts.l3} | ${ids.l3.size} |`);
  push(`| L4 (golden record) | ${counts.l4} | ${ids.l4.size} |`);
  push(`| **merged** | ${counts.l1 + counts.l2 + counts.l3 + counts.l4} | **${prompts.length}** |`);
  push();
  push(
    `L2 renders ${counts.l2} card nodes but only ${ids.l2.size} distinct prompts: the 精选 rail and the per-model rails re-use the same cards. Same for L3 (${counts.l3} nodes / ${ids.l3.size} prompts).`,
  );
  push();
  push("Cross-page overlap (unique ids):");
  push();
  push(`- L1 ∩ L2: ${[...ids.l1].filter((id) => ids.l2.has(id)).length}`);
  push(`- L1 ∩ L3: ${[...ids.l1].filter((id) => ids.l3.has(id)).length}`);
  push(`- L2 ∩ L3: ${[...ids.l2].filter((id) => ids.l3.has(id)).length}`);
  push(`- L4 is disjoint from L1/L2/L3 (${GOLDEN_ID} appears on no other page).`);
  push();
  push("Merge rule: identity = X status id. Taxonomies are unioned across pages, the longest prompt text and the richest media list win, `appearsOn` records every page the prompt was seen on.");
  push();

  push("## 2. Prompt records");
  push();
  const bySlugSource = countBy(prompts, (p) => p.slugSource);
  push(`- Total: **${prompts.length}** (expected 35).`);
  push(
    `- Slug source: ${Object.entries(bySlugSource)
      .map(([k, v]) => `\`${k}\` ${v}`)
      .join(" · ")} — \`wireframe-slug\` values are copied verbatim from the L2/L3 \`详情 →\` hrefs; \`derived\` follows the prototype's own rule \`slugify(title).slice(0,44) + "-" + id\` (verified to reproduce all 32 published slugs exactly).`,
  );
  push(`- With a publish date: ${prompts.filter((p) => p.publishedAt !== null).length} / ${prompts.length}. L2/L3 cards carry no date, so a prompt that appears only there has \`publishedAt: null\` (never 0, never a guess) and is excluded from every trending window.`);
  push(`- With a \`valueScore\`: ${prompts.filter((p) => p.valueScore !== null).length} / ${prompts.length} (only L1 exposes \`data-vs\`).`);
  push(`- \`highValue\`: ${prompts.filter((p) => p.highValue).length} / ${prompts.length} (L1 \`data-hv="1"\` or the L2/L3 \`热门\` badge).`);
  push(`- Metrics rounded from an abbreviated \`3.8K\`-style label: ${prompts.filter((p) => p.metricsRounded).length} (flagged with \`metricsRounded: true\`). Exact L1 values win whenever the same prompt also appears on L1.`);
  push(`- \`views/reposts/replies/quotes\`: only the L4 golden record publishes them; every other prompt stores \`null\`.`);
  push();
  push("Content type:");
  push();
  for (const [slug, n] of Object.entries(countBy(prompts, (p) => p.contentType))) {
    push(`- \`${slug}\`: ${n}`);
  }
  push();
  push("Rule: `video` when the media badge says 视频/VIDEO, `image` when it says 图片/PHOTO or the prompt appears on L2/L3, otherwise `unknown`.");
  push();

  push(
    `Slug rule check: the derived rule reproduces **all ${prompts.filter((p) => p.slugSource === "wireframe-slug").length}** slugs the prototype publishes on L2/L3 — the extractor asserts on any mismatch.`,
  );
  push();

  push("## 3. Taxonomy");
  push();
  for (const axis of ["model", "useCase", "technique", "style", "subject", "contentType"]) {
    const terms = taxonomies.filter((t) => t.axis === axis);
    push(`### ${axis} (${terms.length} terms)`);
    push();
    push("| slug | canonical label | aliases kept | prompts in fixture | wireframe declared |");
    push("| --- | --- | --- | --- | --- |");
    for (const term of terms) {
      const count = countPromptsFor(prompts, axis, term.slug);
      push(
        `| \`${term.slug}\` | ${term.label} | ${term.aliases.length === 0 ? "—" : term.aliases.map((a) => `\`${a}\``).join(", ")} | ${count} | ${term.wireframeDeclaredCount ?? "—"} |`,
      );
    }
    push();
  }
  push(
    "Canonicalisation: one term per axis, canonical label taken from the L1 tile when one exists. `wireframeDeclaredCount` is prototype metadata only — it is never rendered as an achieved count (global constraint 3).",
  );
  push();
  push("Declared-count scopes differ between pages and are **not** comparable: L1 tiles declare library-wide counts (982-scope), L2 chips declare image-gallery counts (324-scope), L3 chips declare model-scope counts. The first (widest) one seen is kept.");
  push();

  push("## 4. Creators");
  push();
  push(`- In the fixture: **${creators.length}** (every distinct handle that owns at least one prompt).`);
  push(`- With an avatar URL: ${creators.filter((c) => c.avatarUrl !== null).length} (only the L3 inline list publishes avatars).`);
  push(`- With a follower count: ${creators.filter((c) => c.followers !== null).length} (only the L4 source panel publishes one).`);
  push();

  push("## 5. Collections");
  push();
  push("| slug | title | rule | members in fixture |");
  push("| --- | --- | --- | --- |");
  for (const collection of collections) {
    const members = collectionMembers(prompts, collection);
    const rule =
      collection.rule.type === "regex"
        ? `regex \`${collection.rule.pattern}\``
        : collection.rule.conditions.map((c) => `${c.axis}=${c.value}`).join(" AND ");
    push(`| \`${collection.slug}\` | ${collection.title} | ${rule} | ${members.length} |`);
  }
  push();
  push("The prototype defines these six as JS predicates in the L1 script; they are re-expressed as serialisable rules over canonical slugs (so `Camera movement` → `camera-movement-shot-language`, `Transition / morph` → `transition-morph-match-cut`). Member counts are computed from the fixture at read time, never stored.");
  push();

  push("## 6. Models");
  push();
  push("| slug | label | prompts in fixture | prototype page | declared count |");
  push("| --- | --- | --- | --- | --- |");
  for (const model of models) {
    push(
      `| \`${model.slug}\` | ${model.label} | ${promptCountBySlug.get(model.slug) ?? 0} | ${model.wireframeHasPage ? "yes" : "no (`#`)"} | ${model.wireframeDeclaredPromptCount ?? "—"} |`,
    );
  }
  push();
  push(
    `\`ModelDetail\` is generated for every model with ≥ 1 prompt (${models.filter((m) => (promptCountBySlug.get(m.slug) ?? 0) > 0).length} of ${models.length}); its summary, capabilities, inputs, outputs and editorial numbers are all computed from the fixture, never copied from the prototype's 157/68/136 figures.`,
  );
  push();

  push("## 7. L4 golden record");
  push();
  push(`- id \`${GOLDEN_ID}\`, slug \`${GOLDEN_SLUG}\` (curated, per the task brief).`);
  push(`- \`[COUNTRY]\` occurs **${golden.countryCount}** times — counted by the parser, not copied from the prototype's "7 处" copy.`);
  push(`- ${golden.variables[0].options.length} country options, ${golden.steps.length} usage steps, ${golden.parameters.length} tail parameters, ${golden.variations.length} variations (all \`status: "pending"\`, \`media: null\` — the prototype renders 待生成 placeholders).`);
  push(
    `- variable note carried verbatim from the prototype's \`.varnote\`: \`${golden.variables[0].note}\` — record-specific copy, so no other prompt repeats it.`,
  );
  push(`- ${golden.media.length} media items, followers ${golden.followers}, views ${golden.views} / likes ${golden.likes} / bookmarks ${golden.bookmarks} / reposts ${golden.reposts} / replies ${golden.replies} / quotes ${golden.quotes}.`);
  push();

  push("## 8. Excluded or transformed data");
  push();
  push("| datum | reason |");
  push("| --- | --- |");
  for (const item of dedupeExclusions(exclusions)) {
    push(`| ${item.what} | ${item.reason} |`);
  }
  push();

  push("### Systematic transformations");
  push();
  push("| datum | treatment |");
  push("| --- | --- |");
  push("| 原型声明数量（982 / 324 / 136 / 162 / 698 …） | 只作为 `wireframeDeclaredCount` / `wireframeDeclared*` 元数据保存，不进渲染路径 |");
  push("| `href=\"#\"` 占位链接（footer 全部条目、L1 feature tiles、L4 crumb/related/nav） | 不建模为链接；Taxonomy.href 只对本阶段真实存在的页面非 null |");
  push("| `/prompts/video`、`/prompts/use-cases/*`、`/prompts/styles`、`/prompts/creators`、`/prompts/models` | 本阶段无对应页面 → 相关 Taxonomy.href = null，由页面渲染为非链接文本 |");
  push("| L2 `其他类型` tiles `unresolved` / `mixed` / `网页` | 不建模：ContentType 只有 image / video / unknown |");
  push("| 媒体尺寸 | 原型未提供 → 固定 640×360 占位并标记 `dimensionsSource: \"assumed\"` |");
  push("| 媒体 alt | L2/L3 的英文 alt（`photo from the source post`）统一改写为与 L1/L4 一致的中文 alt |");
  {
    const all = prompts.flatMap((p) => p.media);
    const withSrcSet = all.filter((m) => m.srcSet !== null).length;
    push(
      `| 媒体 srcset | \`pbs.twimg.com\` 的 \`?name=\` 尺寸参数展开为 \`small 680w, medium 1200w, large 2048w\`（${withSrcSet}/${all.length} 条媒体）；\`src\` 保持原型的 \`name=small\` 作为回退，其他 host 或无 \`name\` 参数 → \`srcSet: null\` |`,
    );
  }
  push(
    "| L1 `data-q` 搜索索引 | 不保存：由 `fixture-repository.ts` 用 `query.ts` 的 `buildPromptSearchText()` 从 title / **完整** promptText（非 240 字的 `promptPreview`）/ handle / taxonomy label·slug·labelZh 生成，存为 `PromptSummary.searchText` |",
  );
  push("| L3 genbox 的 设置 / 参考图 / 生成 按钮 | 无行为 → 不建模为数据（页面层按 global constraint 12 处理） |");
  push("| L3 `带变量的提示词` 标题声明 3 条，实际渲染 2 张卡 | 以实际卡片为准；`hasVariables` 由 `extractVariables()` 动态判定 |");
  push("| L1/L2/L3 的 copy / expand / tab 交互脚本 | 行为规格，不是数据 |");
  push();
  push("### Metric precision");
  push();
  push(
    `L2/L3 render likes/bookmarks abbreviated (\`3.8K\`, \`2.4K\`, \`1.2K\`). Where the same prompt also appears on L1 the exact value (\`3,849\`) is kept; where it does not, the abbreviated value is expanded (\`3.8K\` → \`3800\`) and the record is flagged \`metricsRounded: true\` so a renderer can qualify it. In this run every abbreviated card also appears on L1, so ${prompts.filter((p) => p.metricsRounded).length} record(s) are flagged. No metric is ever invented: everything unavailable is \`null\`.`,
  );
  push();
  push("### Cross-page model-tag unions");
  push();
  const multiModel = prompts.filter((p) => p.modelSlugs.length >= 2);
  push(
    `The prototype tags the same X status id with a different model on different pages (e.g. id \`2008952931484098637\` is \`Nano Banana\` on L1 but \`Nano Banana Pro\` on L2/L3). Per "union taxonomies across pages", the merged record keeps every model slug it was ever tagged with, so this one prompt is a member of two model pages rather than being forced onto one. **${multiModel.length}** of ${prompts.length} merged prompts carry 2+ model slugs for this reason.`,
  );
  push();
  push("### Rules that differ from the prototype's own code");
  push();
  push("| prototype | fixture | why |");
  push("| --- | --- | --- |");
  push(
    "| 合集「模板提示词」谓词 `/\\[[A-Z][A-Z _\\/]{2,40}\\]|@img\\d|@image\\d/` | `\\[[A-Z][A-Z0-9 _/-]{1,40}\\]|@img\\d+|@image\\d+` | 与 `extractVariables()` 用同一套 token 规则，避免「合集里有、详情页说没有变量」的自相矛盾；也覆盖 `[SHOT 2]` / `[CTA-TEXT]` 这类含数字与连字符的 token |",
  );
  push(
    "| 热门补位：`该时段收录较少，已补充全部时段热门。` | `该时段收录较少，已补充全部时段的高分提示词。` | 同一行为，措辞点明补位来源 |",
  );
  push(
    "| L4 文案「全文出现 7 次」 | 由 `extractVariables()` 数出（本次为 7） | 数量必须来自当前数据 |",
  );
  push(
    "| L1 卡片 `data-q` 预拼检索串 | `fixture-repository.ts` 用 `query.ts` 的 `buildPromptSearchText()` 预先算好并存为 `PromptSummary.searchText`（title + **完整** promptText + handle + taxonomy label/slug/labelZh），`applyPromptQuery()` 只读这个字段，不再退化到 240 字的 `promptPreview` | 服务端与客户端共用同一构造函数，命中中文标签，且不受预览截断影响 |",
  );
  push();
  push("### Unknown-parameter reporting");
  push();
  push(
    "`parsePromptQuery()` reports unrecognised **keys** (`sort`, `page`, an unusable `window` value); `ContentRepository.listPrompts()` reports unrecognised **values** as `key=value` (e.g. `model=not-a-model`) and keeps the unusable chip visible so it can be removed. Nothing is dropped silently (global constraint 6).",
  );
  push();

  return `${lines.join("\n")}\n`;
}

function shiftDate(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function hashOf(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const AXIS_FIELD = {
  model: "modelSlugs",
  useCase: "useCaseSlugs",
  technique: "techniqueSlugs",
  style: "styleSlugs",
  subject: "subjectSlugs",
};

function countPromptsFor(prompts, axis, slug) {
  if (axis === "contentType") return prompts.filter((p) => p.contentType === slug).length;
  return prompts.filter((p) => p[AXIS_FIELD[axis]].includes(slug)).length;
}

function collectionMembers(prompts, collection) {
  if (collection.rule.type === "regex") {
    const re = new RegExp(collection.rule.pattern);
    return prompts.filter((p) => re.test(p.promptText));
  }
  return prompts.filter((p) =>
    collection.rule.conditions.every((c) =>
      c.axis === "contentType" ? p.contentType === c.value : p[AXIS_FIELD[c.axis]].includes(c.value),
    ),
  );
}

function dedupeExclusions(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.what}|${item.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => a.what.localeCompare(b.what));
}

main();
