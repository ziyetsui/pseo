import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
const root = path.resolve('out');
const manifest = JSON.parse(await readFile(path.join(root, 'frontend-build.json'), 'utf8'));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const htmlFiles = (await files(root)).filter(file => file.endsWith('.html'));
if (htmlFiles.length < 3) throw new Error('Static route output is incomplete');
let links = 0;
const routeForFile = file => ('/' + path.relative(root, file).replace(/\.html$/, '').replace(/(^|\/)index$/, '')).replace(/\/$/, '') || '/';
const documents = new Map(await Promise.all(htmlFiles.map(async file => [routeForFile(file), parse(await readFile(file, 'utf8'))])));
const allPaths = new Set(documents.keys());
for (const file of htmlFiles) {
  const route = routeForFile(file);
  const document = documents.get(route);
  if (!document.querySelector('main h1')) throw new Error(`Missing server-rendered main heading: ${file}`);
  if (document.querySelector('iframe[srcdoc]')) throw new Error('Prototype iframe leaked into static output');
  if (manifest.mode === 'visual-fixture' && !document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex')) throw new Error(`Visual fixture lacks server noindex: ${file}`);
  for (const link of document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (href === '#') throw new Error(`Placeholder navigation: ${file}`);
    if (!href || href.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;
    const target = new URL(href, `https://static.invalid${route}`);
    const pathname = decodeURI(target.pathname).replace(/\/$/, '') || '/';
    if (pathname.startsWith('/_next/')) continue;
    if (pathname.endsWith('.xml')) continue;
    if (!allPaths.has(pathname)) throw new Error(`Broken internal static link ${href} from ${file}`);
    if (target.hash) {
      const anchor = decodeURIComponent(target.hash.slice(1));
      const targetDocument = documents.get(pathname);
      const namedAnchor = targetDocument.querySelectorAll('a[name]').some(element => element.getAttribute('name') === anchor);
      if (!targetDocument.getElementById(anchor) && !namedAnchor) throw new Error(`Broken internal anchor ${href} from ${file}`);
    }
    links++;
  }
}
if (manifest.mode === 'visual-fixture') {
  if (!(await readFile(path.join(root, '_headers'), 'utf8')).includes('X-Robots-Tag: noindex')) throw new Error('Missing preview response noindex');
  if (!(await readFile(path.join(root, 'robots.txt'), 'utf8')).includes('Disallow: /')) throw new Error('Fixture crawl access is not blocked');
} else {
  const fixture = JSON.parse(await readFile('src/data/prototype.json', 'utf8'));
  if (!Array.isArray(manifest.publicPrompts)) throw new Error('Missing approved API route receipt');
  const approvedIds = new Set(manifest.publicPrompts.map(prompt => prompt.id.replace(/^prm_/, '')));
  const allowedRoutes = new Set(manifest.publicPrompts.map(prompt => prompt.href));
  for (const route of allowedRoutes) if (!allPaths.has(route)) throw new Error(`Approved Prompt route is missing: ${route}`);
  for (const route of allPaths) {
    if (/^\/(en|zh-CN)\/prompts\/[^/]+$/.test(route) && !/\/(image|video|models|creators)$/.test(route) && !allowedRoutes.has(route)) throw new Error(`Prompt route is not in the approved API receipt: ${route}`);
  }
  const bundles = (await files(root)).filter(file => /\.(html|js|json)$/.test(file));
  const output = (await Promise.all(bundles.map(file => readFile(file, 'utf8')))).join('\n');
  for (const prompt of fixture.prompts.filter(prompt => !approvedIds.has(prompt.id))) {
    if (output.includes(prompt.id) || output.includes(prompt.title)) throw new Error(`Unapproved visual record leaked into public output: ${prompt.id}`);
  }
}
console.log(`Static checks passed: ${htmlFiles.length} HTML pages, ${links} local links, mode=${manifest.mode}, revision=${manifest.revision}`);
