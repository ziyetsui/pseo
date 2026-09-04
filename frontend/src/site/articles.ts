import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { Catalog } from "@/lib/catalog/types";

export interface ArticleRef { id: string; slug: string; name: string; href: string }
export interface ArticleSummary {
  id: string; slug: string; href: string; locale: string; title: string; excerpt: string;
  author: ArticleRef; category: ArticleRef; tags: ArticleRef[];
  cover: { url: string; alt: string; width: number; height: number } | null;
  publishedAt: string; updatedAt: string; readingTimeMinutes: number;
}
export interface ArticleSeo { title: string; description: string; canonicalUrl: string; robots: string; hreflang: Record<string, string> }
export interface ArticleDetail {
  summary: ArticleSummary; bodyHtml: string; revision: string;
  toc: { id: string; label: string; level: number }[];
  citations: { label: string; url: string; accessedAt: string | null }[];
  source: { platform: string; sourceId: string; url: string; authorHandle: string | null; observedAt: string } | null;
  related: ArticleSummary[]; seo: ArticleSeo;
  localeVariants: { locale: string; slug: string; href: string }[];
}
export interface ArticleCategory {
  id: string; slug: string; href: string; name: string; description: string; updatedAt: string;
  items: ArticleSummary[]; seo: ArticleSeo;
}
export interface ArticleSite {
  state: "ready" | "unavailable";
  revision: string;
  articles: ArticleSummary[];
  details: Record<string, ArticleDetail>;
  categories: Record<string, ArticleCategory>;
  routes: string[];
}

function invalid(message: string): never { throw new Error(`Invalid static Article projection: ${message}`); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("object expected");
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid("array expected"); return value; }
function string(value: unknown): string { if (typeof value !== "string") invalid("string expected"); return value; }
function nullableString(value: unknown): string | null { return value === null ? null : string(value); }
function integer(value: unknown): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) invalid("nonnegative integer expected"); return value; }
function date(value: unknown): string { const result = string(value); if (!Number.isFinite(Date.parse(result))) invalid("date expected"); return result; }
function slug(value: unknown): string { const result = string(value); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) invalid("invalid slug"); return result; }
function safeUrl(value: unknown): string {
  const result = string(value);
  if (!/^(?:https:\/\/|\/(?!\/))[^\s\\]+$/.test(result)) invalid("unsafe URL");
  if (result.startsWith("https://")) { const url = new URL(result); if (url.username || url.password) invalid("URL credentials"); }
  return result;
}
function same(a: unknown, b: unknown, message: string) { if (a !== b) invalid(message); }
function ref(value: unknown): ArticleRef {
  const item = object(value);
  return { id: string(item.id), slug: slug(item.slug), name: string(item.name), href: safeUrl(item.href) };
}
function summary(value: unknown, locale: string): ArticleSummary {
  const item = object(value); const articleSlug = slug(item.slug);
  same(item.locale, locale, "locale mismatch"); same(item.href, `/${locale}/blog/${articleSlug}`, "article href mismatch");
  const cover = item.cover === null ? null : object(item.cover);
  return {
    id: string(item.id), slug: articleSlug, href: safeUrl(item.href), locale, title: string(item.title), excerpt: string(item.excerpt),
    author: ref(item.author), category: ref(item.category), tags: array(item.tags).map(ref),
    cover: cover ? { url: safeUrl(cover.url), alt: string(cover.alt), width: integer(cover.width), height: integer(cover.height) } : null,
    publishedAt: date(item.publishedAt), updatedAt: date(item.updatedAt), readingTimeMinutes: integer(item.readingTimeMinutes),
  };
}
function seo(value: unknown): ArticleSeo {
  const item = object(value);
  return { title: string(item.title), description: string(item.description), canonicalUrl: safeUrl(item.canonicalUrl), robots: item.robots === undefined ? "index,follow" : string(item.robots), hreflang: Object.fromEntries(Object.entries(object(item.hreflang)).map(([locale, url]) => [locale, safeUrl(url)])) };
}
function detail(value: unknown, locale: string): ArticleDetail {
  const item = object(value); const source = item.source === null ? null : object(item.source);
  return {
    summary: summary(item.summary, locale), bodyHtml: string(item.bodyHtml), revision: string(item.revision), seo: seo(item.seo),
    toc: array(item.toc).map((entry) => { const row = object(entry); const level = integer(row.level); if (level < 2 || level > 6) invalid("heading level"); return { id: string(row.id), label: string(row.label), level }; }),
    citations: array(item.citations).map((entry) => { const row = object(entry); return { label: string(row.label), url: safeUrl(row.url), accessedAt: row.accessedAt === null ? null : date(row.accessedAt) }; }),
    source: source ? { platform: string(source.platform), sourceId: string(source.sourceId), url: safeUrl(source.url), authorHandle: nullableString(source.authorHandle), observedAt: date(source.observedAt) } : null,
    related: array(item.related).map((entry) => summary(entry, locale)),
    localeVariants: array(item.localeVariants).map((entry) => { const row = object(entry); return { locale: string(row.locale), slug: slug(row.slug), href: safeUrl(row.href) }; }),
  };
}

/** Read only compiler output. A configured but broken/mixed projection must stop the build. */
export async function loadArticleSite(catalog: Catalog, configuredRoot = process.env.FRONTEND_STATIC_DIR): Promise<ArticleSite> {
  const empty: ArticleSite = { state: "unavailable", revision: catalog.revision, articles: [], details: {}, categories: {}, routes: [] };
  if (!configuredRoot) return empty;
  const root = await realpath(path.resolve(configuredRoot));
  const manifest = object(JSON.parse(await readFile(path.join(root, "build-manifest.json"), "utf8")));
  same(manifest.schemaVersion, 1, "manifest schema version"); same(manifest.contentRevision, catalog.revision, "manifest/catalog revision mismatch");
  if (!array(manifest.publishedLocales).includes(catalog.locale)) invalid("locale absent from manifest");
  const files = new Map<string, Buffer>();
  for (const entry of array(manifest.files)) {
    const row = object(entry); const name = string(row.path);
    if (!name || path.isAbsolute(name) || name.includes("\\") || name.split("/").some((segment) => !segment || segment === "." || segment === "..") || files.has(name)) invalid("unsafe or duplicate manifest path");
    const actual = await realpath(path.join(root, name));
    if (!actual.startsWith(`${root}${path.sep}`)) invalid("file escapes static root");
    const bytes = await readFile(actual);
    same(bytes.length, integer(row.bytes), `file size mismatch: ${name}`);
    same(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, row.sha256, `file hash mismatch: ${name}`);
    files.set(name, bytes);
  }
  function json(name: string): unknown { const bytes = files.get(name); if (!bytes) invalid(`unlisted file: ${name}`); return JSON.parse(bytes.toString("utf8")); }
  const routes = object(json("route-manifest.json"));
  same(routes.schemaVersion, 1, "route schema version"); same(routes.contentRevision, catalog.revision, "route revision mismatch");
  const routeRows = array(routes.routes).map(object);
  const routeSet = new Set(routeRows.map((item) => string(item.path)));
  if (routeSet.size !== routeRows.length) invalid("duplicate route");
  function routeMember(href: string, kind: string, id: string) {
    const match = routeRows.find((row) => row.path === href);
    if (!match || match.kind !== kind || match.locale !== catalog.locale || match.artifactId !== id) invalid("route membership mismatch");
  }
  const index = object(json(`${catalog.locale}/articles/index.json`));
  same(object(index.meta).contentRevision, catalog.revision, "Article index revision mismatch");
  const articles = array(index.data).map((entry) => summary(entry, catalog.locale));
  if (articles.length && !routeRows.some((row) => row.path === `/${catalog.locale}/blog` && row.kind === "blog-index" && row.locale === catalog.locale)) invalid("missing Blog index route");
  const page = object(index.page);
  same(page.hasMore, false, "incomplete Article index"); same(page.nextCursor, null, "incomplete Article cursor"); same(page.total, articles.length, "Article total mismatch");
  const details: Record<string, ArticleDetail> = {}; const categories: Record<string, ArticleCategory> = {};
  for (const article of articles) {
    routeMember(article.href, "article-detail", article.id);
    if (details[article.slug]) invalid("duplicate Article slug");
    const full = detail(json(`${catalog.locale}/articles/by-slug/${article.slug}.json`), catalog.locale);
    same(JSON.stringify(full.summary), JSON.stringify(article), "Article detail/index mismatch");
    for (const variant of full.localeVariants) if (!routeRows.some((row) => row.path === variant.href && row.locale === variant.locale && row.kind === "article-detail" && row.artifactId === article.id)) invalid("unpublished locale alternate");
    details[article.slug] = full;
  }
  for (const row of routeRows.filter((row) => row.locale === catalog.locale && row.kind === "article-category")) {
    const href = string(row.path); const categorySlug = slug(href.split("/").at(-1));
    same(href, `/${catalog.locale}/blog/category/${categorySlug}`, "category href");
    const category = object(json(`${catalog.locale}/article-categories/${categorySlug}.json`)); const entity = object(category.entity);
    same(category.schemaVersion, 1, "category schema"); same(entity.slug, categorySlug, "category slug");
    routeMember(href, "article-category", string(entity.id));
    const items = array(category.items).map((item) => summary(item, catalog.locale));
    for (const item of items) if (!details[item.slug] || JSON.stringify(details[item.slug]?.summary) !== JSON.stringify(item)) invalid("category references absent Article");
    same(object(category.page).total, items.length, "category count"); same(object(category.page).hasMore, false, "incomplete category"); same(object(category.page).nextCursor, null, "incomplete category cursor"); same(entity.articleCount, items.length, "category entity count");
    categories[categorySlug] = { id: string(entity.id), slug: categorySlug, href, name: string(entity.name), description: string(entity.description), updatedAt: date(entity.updatedAt), items, seo: seo(entity.seo) };
  }
  for (const article of articles) {
    if (!Object.values(categories).some((item) => item.href === article.category.href)) invalid("missing primary Article category");
    for (const related of details[article.slug]?.related ?? []) if (!details[related.slug]) invalid("related Article not in snapshot");
  }
  const articleRoutes = routeRows.filter((row) => row.locale === catalog.locale && row.kind === "article-detail");
  same(articleRoutes.length, articles.length, "unclosed Article route set");
  return { state: "ready", revision: catalog.revision, articles, details, categories, routes: [...articles.map((item) => item.href), ...Object.values(categories).map((item) => item.href)] };
}
