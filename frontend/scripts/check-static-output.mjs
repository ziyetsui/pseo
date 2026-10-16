import {PROMPT_RSC_REWRITES} from './compact-rsc-export.mjs';
import {websiteLegacyPaths} from '../src/lib/catalog/website-taxonomy-routes.ts';
import { verifyGitBetaAssets } from './git-beta-receipt.mjs';
import { verifyWebsiteViewOutput, websiteValidationGraph } from './website-view-output.mjs';
import { WIREFRAME_TAXONOMIES } from '../src/data/wireframe/taxonomies.ts';
import {readLibraryIndex,indexHash,verifyLibraryIndex} from './library-index-output.mjs';
import { verifyBilingualOutput } from './bilingual-output.mjs';
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
  if(manifest.mode==='git-beta'){
    const locale=route.match(/^\/(zh-CN|en)(?:\/|$)/)?.[1];
    if(locale){
      if(document.querySelector('html')?.getAttribute('lang')!==locale||document.querySelector('body')?.getAttribute('lang')!==locale)throw new Error(`Interface language mismatch: ${route}`);
      const counterpart=document.querySelector('[data-language-switch]');
      const canonicalPath=route===`/${locale}`?`/${locale}/prompts`:route;
      const target=locale==='en'?'zh-CN':'en';
      if(counterpart?.getAttribute('href')!==canonicalPath.replace(`/${locale}`,`/${target}`)||counterpart.getAttribute('hreflang')!==target)throw new Error(`Language switch lost page identity: ${route}`);
    }
  }
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
    verifyBilingualOutput(documents);
    // Presentation titles must follow the English route; raw prompt/source blocks are separate.
    for (const [route, document] of documents) if (route.startsWith('/en/prompts')) {
      for (const node of document.querySelectorAll('.run .u, .allof a, .toc .t, .lop .t, [data-case-title]')) {
        if (/[\u3400-\u9fff]/u.test(node.text)) throw new Error(`Mixed-language case title at ${route}: ${node.text}`);
      }
    }
    const receipt = manifest.gitBeta;
    if (!receipt || receipt.authorization !== '2026-10-14-owner-direct-git-beta' || receipt.cmsPublication !== false) throw new Error('Missing Git beta authorization receipt');
    const viewGraph = websiteValidationGraph(JSON.parse(await readFile('../docs/intake/2026-10-14-website-supplement/combined-graph.json','utf8')), JSON.parse(await readFile('src/data/prototype.json','utf8')).prompts, WIREFRAME_TAXONOMIES, JSON.parse(await readFile('src/data/website-category-membership.json','utf8')), JSON.parse(await readFile('src/data/verified-gap-updates.json','utf8')).baselineModels);
    if(!Array.isArray(receipt.locales)||JSON.stringify(receipt.locales.map(item=>item.locale).sort())!==JSON.stringify(['en','zh-CN']))throw new Error('Bilingual locale receipt missing');
    const published=[];
    for(const local of receipt.locales){
      const locale=local.locale;
      verifyWebsiteViewOutput(documents,local,viewGraph,locale);
      const index=readLibraryIndex(documents.get(`/${locale}/prompts/library-index`),manifest.revision,locale),indexBytes=await readFile(path.join(root,local.navigationIndex.path),'utf8');
      if(indexHash(indexBytes)!==local.navigationIndex.sha256||JSON.stringify(JSON.parse(indexBytes))!==JSON.stringify(index))throw new Error('Library index receipt or HTML mismatch');
      verifyLibraryIndex(documents,index,local,locale);
      published.push(...local.publishedPrompts,...local.publishedWebsites,...local.publishedWebsiteViews,...local.publishedNavigation);
    }
    const allowed = new Set(published.map(item=>item.href));
    const redirects=['zh-CN','en'].flatMap(locale=>websiteLegacyPaths(locale).map(alias=>({alias,target:`/${locale}/prompts/website`})));
    const redirectBytes=await readFile(path.join(root,'_redirects'),'utf8');
    if(redirectBytes!==[...redirects.map(({alias,target})=>`${alias} ${target} 301`),...PROMPT_RSC_REWRITES].join('\n')+'\n')throw new Error('Website alias redirect contract mismatch');
    for(const {alias,target} of redirects){
      if(!allPaths.has(alias)||!allPaths.has(target)||documents.get(alias).querySelector('meta[http-equiv="refresh"]')?.getAttribute('content')!==`0;url=${target}`)throw new Error(`Website alias fallback missing: ${alias}`);
      allowed.add(alias);
    }
    for (const route of allowed) if (!allPaths.has(route)) throw new Error(`Git beta published route missing: ${route}`);
    for (const route of allPaths) {
      if (/^\/(en|zh-CN)\/prompts\/[^/]+$/.test(route) && !/\/(image|video|website|models|creators)$/.test(route) && !allowed.has(route)) throw new Error(`Unlisted Git beta detail: ${route}`);
      if (/^\/(?:en|zh-CN)\/prompts\/website\//.test(route) && !allowed.has(route)) throw new Error(`Unlisted Website case: ${route}`);
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
