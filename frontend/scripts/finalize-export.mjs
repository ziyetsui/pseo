import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'node-html-parser';

/** The sitemap is a request to index these exact canonical documents. */
export async function verifySitemapHtml(xml, outputRoot, expectedOrigin) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported sitemap declaration');
  const document = parse(xml);
  const sitemap = document.children[0];
  if (document.children.length !== 1 || sitemap?.rawTagName !== 'urlset' || sitemap.getAttribute('xmlns') !== 'http://www.sitemaps.org/schemas/sitemap/0.9') throw new Error('Sitemap urlset expected');
  const seen = new Set();
  for (const node of sitemap.children) {
    const locations = node.children.filter(child => child.rawTagName === 'loc');
    if (node.rawTagName !== 'url' || locations.length !== 1 || locations[0].children.length) throw new Error('One sitemap loc expected');
    const loc = locations[0].textContent.trim();
    const url = new URL(loc);
    if (url.origin !== expectedOrigin || url.username || url.password || url.search || url.hash || url.href !== loc) throw new Error('Sitemap URL does not match the canonical site origin');
    if (!/^\/(?:en|zh-CN)\/[a-zA-Z0-9/_-]+$/.test(url.pathname)) throw new Error('Unsupported sitemap path');
    if (seen.has(loc)) throw new Error('Duplicate sitemap URL');
    seen.add(loc);
    const html = parse(await readFile(path.join(outputRoot, `${url.pathname}.html`), 'utf8'));
    const blocked = html.querySelectorAll('meta[name]').some(meta => {
      const name = meta.getAttribute('name')?.trim().toLowerCase();
      return ['robots', 'googlebot', 'googlebot-news'].includes(name) && meta.getAttribute('content')?.toLowerCase().split(/[\s,]+/).some(rule => rule === 'noindex' || rule === 'none');
    });
    if (blocked) throw new Error(`Sitemap URL is noindex in its HTML: ${url.pathname}`);
    const canonicals = html.querySelectorAll('link[rel]').filter(link => link.getAttribute('rel')?.toLowerCase().split(/\s+/).includes('canonical'));
    if (canonicals.length !== 1 || canonicals[0].getAttribute('href') !== loc) throw new Error(`Sitemap URL does not match its HTML canonical: ${url.pathname}`);
  }
}

async function finalizeExport() {
const mode = process.env.FRONTEND_DATA_MODE;
if (!['visual-fixture', 'public-api'].includes(mode)) throw new Error('Build data mode must be explicit');
const revision = mode === 'public-api' ? process.env.FRONTEND_EXPECTED_REVISION : `sha256:${createHash('sha256').update(JSON.stringify({ prototype: JSON.parse(await readFile('src/data/prototype.json', 'utf8')), promptTemplateEdits: JSON.parse(await readFile('src/data/wireframe/prompt-templates.json', 'utf8')) })).digest('hex')}`;
if (!revision) throw new Error('Public builds must pin FRONTEND_EXPECTED_REVISION');
const out = path.resolve('out');
if (mode === 'visual-fixture') {
  await writeFile(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: private, no-store\n');
  await writeFile(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
}
const staticDirectory = process.env.FRONTEND_STATIC_DIR;
const copied = [];
const publicPrompts = [];
if (mode === 'public-api') {
  const contract = JSON.parse(await readFile('src/lib/api/schema.generated.json', 'utf8'));
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  ajv.addSchema({ $id: 'https://pseo.invalid/build-contract', components: contract.components });
  async function get(endpoint, query = {}) {
    const url = new URL(endpoint, process.env.FRONTEND_API_URL);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Public build receipt API request failed');
    const value = await response.json();
    const validate = ajv.compile({ $ref: `https://pseo.invalid/build-contract${contract.paths[endpoint].response.$ref}` });
    if (!validate(value)) throw new Error('Public build receipt does not match OpenAPI');
    if (response.headers.get('x-content-revision') !== revision || value.meta.contentRevision !== revision) throw new Error('Public build receipt revision drift');
    return value;
  }
  const locales = await get('/api/v1/locales');
  for (const locale of locales.data.filter(item => item.enabled)) {
    const seen = new Set();
    let cursor = null;
    do {
      const page = await get('/api/v1/prompts', { locale: locale.locale, limit: '50', ...(cursor ? { cursor } : {}) });
      publicPrompts.push(...page.data.map(item => ({ id: item.id, slug: item.slug, href: item.href, locale: item.locale, title: item.title })));
      cursor = page.page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('Receipt pagination did not advance');
      seen.add(cursor);
    } while (cursor);
  }
}
if (mode === 'public-api' && staticDirectory) {
  const root = path.resolve(staticDirectory);
  const manifest = JSON.parse(await readFile(path.join(root, 'build-manifest.json'), 'utf8'));
  if (manifest.contentRevision !== revision) throw new Error('Static feeds and catalog revision differ');
  for (const file of manifest.files) {
    if (file.path !== 'sitemap.xml' && !/^(?:en|zh-CN)\/(?:prompts|blog)\/rss\.xml$/.test(file.path)) continue;
    const bytes = await readFile(path.join(root, file.path));
    if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== file.sha256 || bytes.length !== file.bytes) throw new Error('Feed hash mismatch');
    if (file.path === 'sitemap.xml') {
      await verifySitemapHtml(bytes.toString('utf8'), out, new URL(process.env.FRONTEND_SITE_URL).origin);
    }
    const destination = path.join(out, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    copied.push(file.path);
  }
}
if (mode === 'public-api') await verifySitemapHtml(await readFile(path.join(out, 'sitemap.xml'), 'utf8'), out, new URL(process.env.FRONTEND_SITE_URL).origin);
await writeFile(path.join(out, 'frontend-build.json'), JSON.stringify({ mode, revision, feeds: copied, publicPrompts, sourceMirrorSha: process.env.FRONTEND_MIRROR_SHA ?? null, productionRelease: false }, null, 2) + '\n');
console.log(`Export finalized: ${mode}, ${revision}, ${copied.length} verified feeds`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await finalizeExport();
