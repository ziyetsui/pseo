import { verifyGitBetaAssets } from './git-beta-receipt.mjs';
import { verifyWebsiteViewOutput, websiteValidationGraph } from './website-view-output.mjs';
import { WIREFRAME_TAXONOMIES } from '../src/data/wireframe/taxonomies.ts';
import {readLibraryIndex,indexHash,verifyLibraryIndex} from './library-index-output.mjs';
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
  if (manifest.mode !== 'public-api' && !document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex')) throw new Error(`Visual fixture lacks server noindex: ${file}`);
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
if (manifest.mode !== 'public-api') {
  if (!(await readFile(path.join(root, '_headers'), 'utf8')).includes('X-Robots-Tag: noindex')) throw new Error('Missing preview response noindex');
  if (!(await readFile(path.join(root, 'robots.txt'), 'utf8')).includes('Disallow: /')) throw new Error('Fixture crawl access is not blocked');
  if (manifest.mode === 'git-beta') {
    const receipt = manifest.gitBeta;
    if (!receipt || receipt.authorization !== '2026-10-14-owner-direct-git-beta' || receipt.cmsPublication !== false) throw new Error('Missing Git beta authorization receipt');
    const viewGraph = websiteValidationGraph(JSON.parse(await readFile('../docs/intake/2026-10-14-website-supplement/combined-graph.json','utf8')), JSON.parse(await readFile('src/data/prototype.json','utf8')).prompts, WIREFRAME_TAXONOMIES);
    verifyWebsiteViewOutput(documents, receipt, viewGraph);
    const index=readLibraryIndex(documents.get('/zh-CN/prompts/library-index'),manifest.revision),indexBytes=await readFile(path.join(root,'library-index.json'),'utf8');
    if(indexHash(indexBytes)!==receipt.navigationIndex?.sha256||JSON.stringify(JSON.parse(indexBytes))!==JSON.stringify(index))throw new Error('Library index receipt or HTML mismatch');
    verifyLibraryIndex(documents,index,receipt);
    const allowed = new Set([...receipt.publishedPrompts, ...receipt.publishedWebsites, ...receipt.publishedWebsiteViews,...receipt.publishedNavigation].map(item => item.href));
    for (const route of allowed) if (!allPaths.has(route)) throw new Error(`Git beta published route missing: ${route}`);
    for (const route of allPaths) {
      if (/^\/(en|zh-CN)\/prompts\/[^/]+$/.test(route) && !/\/(image|video|website|models|creators)$/.test(route) && !allowed.has(route)) throw new Error(`Unlisted Git beta detail: ${route}`);
      if (route.startsWith('/zh-CN/prompts/website/') && !allowed.has(route)) throw new Error(`Unlisted Website case: ${route}`);
    }
    const imageDocuments = receipt.publishedPrompts.map(item => documents.get(item.href).toString()).join('');
    for (const url of receipt.imageUrls) if (!imageDocuments.includes(url)) throw new Error(`Git beta image example not rendered: ${url}`);
    await verifyGitBetaAssets(root, JSON.parse(await readFile('src/data/website-previews.json','utf8')));
  }
} else {
  const fixture = JSON.parse(await readFile('src/data/prototype.json', 'utf8'));
  if (!Array.isArray(manifest.publicPrompts)) throw new Error('Missing approved API route receipt');
  const approvedIds = new Set(manifest.publicPrompts.map(prompt => prompt.id.replace(/^prm_/, '')));
  const allowedRoutes = new Set(manifest.publicPrompts.map(prompt => prompt.href));
  for (const route of allowedRoutes) if (!allPaths.has(route)) throw new Error(`Approved Prompt route is missing: ${route}`);
  for (const route of allPaths) {
    if (/^\/(en|zh-CN)\/prompts\/[^/]+$/.test(route) && !/\/(image|video|website|models|creators)$/.test(route) && !allowedRoutes.has(route)) throw new Error(`Prompt route is not in the approved API receipt: ${route}`);
  }
  const bundles = (await files(root)).filter(file => /\.(html|js|json)$/.test(file));
  const output = (await Promise.all(bundles.map(file => readFile(file, 'utf8')))).join('\n');
  for (const prompt of fixture.prompts.filter(prompt => !approvedIds.has(prompt.id))) {
    if (output.includes(prompt.id) || output.includes(prompt.title)) throw new Error(`Unapproved visual record leaked into public output: ${prompt.id}`);
  }
}
console.log(`Static checks passed: ${htmlFiles.length} HTML pages, ${links} local links, mode=${manifest.mode}, revision=${manifest.revision}`);
