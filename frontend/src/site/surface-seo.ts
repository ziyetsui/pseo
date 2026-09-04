import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { siteOrigin } from '@/lib/catalog/config';
import type { Catalog } from '@/lib/catalog/types';

export interface SurfaceSeo {
  canonicalUrl: string;
  robots: 'index,follow' | 'noindex,nofollow';
  hreflang: Record<string, string>;
}

function invalid(message: string): never { throw new Error(`Invalid static surface SEO: ${message}`); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('object expected');
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid('array expected'); return value; }
function string(value: unknown): string { if (typeof value !== 'string') invalid('string expected'); return value; }
function same(actual: unknown, expected: unknown, message: string) { if (actual !== expected) invalid(message); }

/** Compiler sitemap membership is its indexability projection, not a new editorial approval. */
export async function loadSurfaceSeo(catalog: Catalog, pathname: string, configuredRoot = process.env.FRONTEND_STATIC_DIR): Promise<SurfaceSeo | null> {
  const prompt = catalog.prompts.find(item => item.href === pathname);
  const kind = pathname === `/${catalog.locale}/prompts` ? 'prompt-hub' : pathname === `/${catalog.locale}/blog` ? 'blog-index' : prompt ? 'prompt-detail' : null;
  if (catalog.mode !== 'public-api' || !kind || !configuredRoot) return null;
  const origin = siteOrigin();
  const root = await realpath(path.resolve(configuredRoot));
  const manifest = object(JSON.parse(await readFile(path.join(root, 'build-manifest.json'), 'utf8')));
  same(manifest.schemaVersion, 1, 'manifest schema version');
  same(manifest.contentRevision, catalog.revision, 'manifest/catalog revision mismatch');
  const locales = array(manifest.publishedLocales).map(string);
  if (!locales.includes(catalog.locale) || new Set(locales).size !== locales.length) invalid('published locale set');
  const files = new Map<string, Buffer>();
  for (const value of array(manifest.files)) {
    const entry = object(value); const name = string(entry.path);
    if (!name || path.isAbsolute(name) || name.includes('\\') || name.split('/').some(segment => !segment || segment === '.' || segment === '..') || files.has(name)) invalid('unsafe or duplicate file path');
    const actual = await realpath(path.join(root, name));
    if (!actual.startsWith(`${root}${path.sep}`)) invalid('file escapes static root');
    const bytes = await readFile(actual);
    same(bytes.length, entry.bytes, `file size mismatch: ${name}`);
    same(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, entry.sha256, `file hash mismatch: ${name}`);
    files.set(name, bytes);
  }
  function file(name: string): Buffer { const value = files.get(name); if (!value) invalid(`unlisted file: ${name}`); return value; }
  const manifestRoutes = object(JSON.parse(file('route-manifest.json').toString('utf8')));
  same(manifestRoutes.schemaVersion, 1, 'route schema version');
  same(manifestRoutes.contentRevision, catalog.revision, 'route revision mismatch');
  same(JSON.stringify(array(manifestRoutes.publishedLocales).map(string).sort()), JSON.stringify([...locales].sort()), 'route locale set');
  const routes = array(manifestRoutes.routes).map(object);
  const paths = routes.map(route => string(route.path));
  if (new Set(paths).size !== paths.length) invalid('duplicate route');
  const route = routes.find(row => row.path === pathname);
  if (route && (route.locale !== catalog.locale || route.kind !== kind)) invalid('surface route membership mismatch');
  if (prompt && route && route.artifactId !== prompt.id) invalid('Prompt route identity mismatch');

  function url(value: string): URL {
    let result: URL;
    try { result = new URL(value); } catch { invalid('invalid sitemap URL'); }
    if (result.origin !== origin || result.username || result.password || result.search || result.hash || result.href !== value) invalid('sitemap URL does not match canonical site origin');
    if (!/^\/(?:en|zh-CN)\/[a-zA-Z0-9/_-]+$/.test(result.pathname)) invalid('unsupported sitemap path');
    return result;
  }
  const xml = file('sitemap.xml').toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) invalid('unsupported sitemap declaration');
  const document = parse(xml);
  const sitemap = document.children[0];
  if (document.children.length !== 1 || sitemap?.rawTagName !== 'urlset' || sitemap.getAttribute('xmlns') !== 'http://www.sitemaps.org/schemas/sitemap/0.9') invalid('sitemap urlset expected');
  const seen = new Set<string>();
  let result: SurfaceSeo | null = null;
  for (const node of sitemap.children) {
    if (node.rawTagName !== 'url') invalid('unexpected sitemap element');
    const locations = node.children.filter(child => child.rawTagName === 'loc');
    if (locations.length !== 1 || locations[0]?.children.length) invalid('one sitemap loc expected');
    const canonical = string(locations[0]?.textContent).trim();
    const location = url(canonical);
    if (seen.has(canonical)) invalid('duplicate sitemap URL');
    seen.add(canonical);
    if (!routes.some(row => row.path === location.pathname && row.locale === location.pathname.split('/')[1])) invalid('sitemap URL lacks route membership');
    if (location.pathname !== pathname) continue;
    if (!route) invalid('indexable surface has no route');
    const hreflang: Record<string, string> = {};
    for (const alternate of node.children.filter(child => child.rawTagName === 'xhtml:link')) {
      const language = alternate.getAttribute('hreflang');
      if (alternate.getAttribute('rel') !== 'alternate' || !language || Object.hasOwn(hreflang, language)) invalid('invalid sitemap alternate');
      const href = string(alternate.getAttribute('href'));
      const target = url(href);
      if (!routes.some(row => row.path === target.pathname && row.kind === kind && (!prompt || row.artifactId === prompt.id) && (language === 'x-default' || row.locale === language))) invalid('unpublished surface alternate');
      hreflang[language] = href;
    }
    result = { canonicalUrl: canonical, robots: 'index,follow', hreflang };
  }
  if (prompt) {
    const canonical = string(prompt.seo.canonicalUrl);
    if (url(canonical).pathname !== pathname) invalid('Prompt canonical path mismatch');
    if (prompt.seo.robots !== 'index,follow' && prompt.seo.robots !== 'noindex,nofollow') invalid('unsupported Prompt robots');
    // Internal-beta surface restrictions still apply even when the content DTO
    // is independently indexable. Never elevate either side's permission.
    return {
      canonicalUrl: canonical,
      robots: result && prompt.seo.robots === 'index,follow' ? 'index,follow' : 'noindex,nofollow',
      hreflang: prompt.seo.hreflang,
    };
  }
  return result;
}
