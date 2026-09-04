import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSurfaceSeo } from '@/site/surface-seo';
import type { Catalog, Prompt } from '@/lib/catalog/types';

const revision = `sha256:${'1'.repeat(64)}`;
const origin = 'https://example.com';
const catalog: Catalog = { locale: 'en', mode: 'public-api', revision, observedAt: null, prompts: [], models: [], useCases: [], techniques: [], styles: [], subjects: [], collections: [], creators: [], locales: [] };
const roots: string[] = [];
const hub = { kind: 'prompt-hub', locale: 'en', path: '/en/prompts' };
const blog = { kind: 'blog-index', locale: 'en', path: '/en/blog' };
const promptRoute = { kind: 'prompt-detail', locale: 'en', path: '/en/prompts/example', artifactId: 'prm_example' };
const prompt: Prompt = {
  id: promptRoute.artifactId, slug: 'example', href: promptRoute.path, locale: 'en', title: 'Example', summary: '', prompt: 'Test text', language: 'en',
  kind: 'text', models: [], useCases: [], techniques: [], styles: [], subjects: [], handle: '', img: null, media: [], likes: null, saves: null, views: null,
  highValue: false, score: null, publishedAt: null, variables: [], steps: [], requiredInputs: [], optionalInputs: [], parameters: [],
  source: { url: '', platform: '', observedAt: null }, evidence: [], actions: { canCopy: false, tryUrl: null }, localeVariants: [], revision,
  appearsOn: ['l4'], featuredOn: [], seo: { title: 'Example', description: 'Test metadata', canonicalUrl: `${origin}${promptRoute.path}`, robots: 'index,follow', hreflang: { en: `${origin}${promptRoute.path}`, 'x-default': `${origin}${promptRoute.path}` } },
};
const promptCatalog: Catalog = { ...catalog, prompts: [prompt] };
const sitemap = (body: string) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;
const entry = (pathname: string, extra = '') => `<url><loc>${origin}${pathname}</loc>${extra}</url>`;

async function snapshot({ xml = sitemap(entry(hub.path)), routes = [hub, blog] as { kind: string; locale: string; path: string; artifactId?: string }[], routeRevision = revision, manifestRevision = revision, publishedLocales = ['en'] } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'pseo-surface-seo-')); roots.push(root);
  const content: Record<string, string> = {
    'route-manifest.json': JSON.stringify({ schemaVersion: 1, contentRevision: routeRevision, publishedLocales, routes }),
    'sitemap.xml': xml,
    'en/contract.json': 'stable',
  };
  const files = [];
  for (const [name, text] of Object.entries(content)) {
    const bytes = Buffer.from(text);
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), bytes);
    files.push({ path: name, bytes: bytes.length, sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}` });
  }
  await writeFile(path.join(root, 'build-manifest.json'), JSON.stringify({ schemaVersion: 1, contentRevision: manifestRevision, publishedLocales, files }));
  return root;
}

beforeEach(() => vi.stubEnv('FRONTEND_SITE_URL', origin));
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('approved static list surface SEO', () => {
  it('projects independently approved L1 and Blog paths from the same verified snapshot', async () => {
    const root = await snapshot({ xml: sitemap(entry(hub.path) + entry(blog.path)) });
    expect(await loadSurfaceSeo(catalog, hub.path, root)).toEqual({ canonicalUrl: `${origin}${hub.path}`, robots: 'index,follow', hreflang: {} });
    expect(await loadSurfaceSeo(catalog, blog.path, root)).toEqual({ canonicalUrl: `${origin}${blog.path}`, robots: 'index,follow', hreflang: {} });
  });
  it('keeps absence, fixture mode, unapproved paths, and aliases unqualified', async () => {
    expect(await loadSurfaceSeo(catalog, hub.path, '')).toBeNull();
    expect(await loadSurfaceSeo({ ...catalog, mode: 'visual-fixture' }, hub.path, '/missing')).toBeNull();
    for (const pathname of ['/', '/en', '/en/prompts/image', '/en/prompts?style=portrait', '/zh-CN/prompts']) expect(await loadSurfaceSeo(catalog, pathname, '/missing')).toBeNull();
    expect(await loadSurfaceSeo(catalog, hub.path, await snapshot({ xml: sitemap('') }))).toBeNull();
    expect(await loadSurfaceSeo(catalog, blog.path, await snapshot())).toBeNull();
  });
  it('does not infer Blog approval from its route existing', async () => {
    expect(await loadSurfaceSeo(catalog, blog.path, await snapshot({ xml: sitemap('') }))).toBeNull();
  });
  it('preserves only provided and registered language alternates', async () => {
    const target = '/zh-CN/prompts';
    const root = await snapshot({
      publishedLocales: ['en', 'zh-CN'], routes: [hub, { kind: 'prompt-hub', locale: 'zh-CN', path: target }],
      xml: sitemap(entry(hub.path, `<xhtml:link rel="alternate" hreflang="en" href="${origin}${hub.path}"/><xhtml:link rel="alternate" hreflang="zh-CN" href="${origin}${target}"/>`) + entry(target)),
    });
    expect((await loadSurfaceSeo(catalog, hub.path, root))?.hreflang).toEqual({ en: `${origin}${hub.path}`, 'zh-CN': `${origin}${target}` });
  });
  it('rejects revision drift and any changed listed file', async () => {
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ manifestRevision: 'different' }))).rejects.toThrow('manifest/catalog revision mismatch');
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ routeRevision: 'different' }))).rejects.toThrow('route revision mismatch');
    const root = await snapshot(); await writeFile(path.join(root, 'en/contract.json'), 'tamper');
    await expect(loadSurfaceSeo(catalog, hub.path, root)).rejects.toThrow('file hash mismatch');
  });
  it('rejects matching sitemap paths without matching locale and route kind', async () => {
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ routes: [] }))).rejects.toThrow('route membership');
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ routes: [{ ...hub, kind: 'model-detail' }] }))).rejects.toThrow('surface route membership');
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ routes: [{ ...hub, locale: 'zh-CN' }] }))).rejects.toThrow('surface route membership');
  });
  it('rejects cross-site canonical locations and unregistered alternates', async () => {
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ xml: sitemap(entry(hub.path).replace(origin, 'https://other.example')) }))).rejects.toThrow('canonical site origin');
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ xml: sitemap(entry(hub.path, `<xhtml:link rel="alternate" hreflang="zh-CN" href="${origin}/zh-CN/prompts"/>`)) }))).rejects.toThrow('unpublished surface alternate');
  });
  it('rejects duplicate sitemap entries and external entity declarations', async () => {
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ xml: sitemap(entry(hub.path) + entry(hub.path)) }))).rejects.toThrow('duplicate sitemap');
    await expect(loadSurfaceSeo(catalog, hub.path, await snapshot({ xml: '<!DOCTYPE urlset SYSTEM "https://other.example/entity">' + sitemap(entry(hub.path)) }))).rejects.toThrow('unsupported sitemap declaration');
  });
  it('restricts an API-indexable Prompt omitted by the compiler without replacing its canonical or hreflang', async () => {
    const result = await loadSurfaceSeo(promptCatalog, prompt.href, await snapshot({ xml: sitemap(''), routes: [promptRoute] }));
    expect(result).toEqual({ canonicalUrl: prompt.seo.canonicalUrl, robots: 'noindex,nofollow', hreflang: prompt.seo.hreflang });
  });
  it('indexes a Prompt only when both contracts permit it, preserving stricter API noindex', async () => {
    const root = await snapshot({ xml: sitemap(entry(prompt.href)), routes: [promptRoute] });
    expect(await loadSurfaceSeo(promptCatalog, prompt.href, root)).toEqual({ canonicalUrl: prompt.seo.canonicalUrl, robots: 'index,follow', hreflang: prompt.seo.hreflang });
    const restricted = { ...promptCatalog, prompts: [{ ...prompt, seo: { ...prompt.seo, robots: 'noindex,nofollow' } }] };
    expect((await loadSurfaceSeo(restricted, prompt.href, root))?.robots).toBe('noindex,nofollow');
  });
  it('does not impose a static Prompt gate when the snapshot source is unconfigured', async () => {
    expect(await loadSurfaceSeo(promptCatalog, prompt.href, '')).toBeNull();
    expect(await loadSurfaceSeo({ ...promptCatalog, mode: 'visual-fixture' }, prompt.href, '/missing')).toBeNull();
  });
  it('rejects Prompt identity drift instead of applying another record’s permission', async () => {
    await expect(loadSurfaceSeo(promptCatalog, prompt.href, await snapshot({ routes: [{ ...promptRoute, artifactId: 'prm_different' }] }))).rejects.toThrow('Prompt route identity mismatch');
  });
});
