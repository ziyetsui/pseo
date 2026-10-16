import {websiteLegacyPaths} from '../src/lib/catalog/website-taxonomy-routes.ts';
import { compactPromptRsc } from './compact-rsc-export.mjs';
import { gitBetaRevision } from '../src/lib/catalog/git-beta-revision.ts';
import {readReferenceStudies} from '../src/lib/catalog/reference-studies.ts';
import { verifyCreatorAvatarAssets } from './creator-avatar-assets.mjs';
import { gitBetaReceipt, verifyGitBetaAssets } from './git-beta-receipt.mjs';
import { readWebsiteViews } from './website-view-output.mjs';
import { readLibraryIndex, publishedNavigation, indexHash } from './library-index-output.mjs';
import { checkIntake } from '../../scripts/lib/case-import.mjs';
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
if (!['visual-fixture', 'public-api', 'git-beta'].includes(mode)) throw new Error('Build data mode must be explicit');
let revision = mode === 'public-api' ? process.env.FRONTEND_EXPECTED_REVISION : `sha256:${createHash('sha256').update(JSON.stringify({ prototype: JSON.parse(await readFile('src/data/prototype.json', 'utf8')), promptTemplateEdits: JSON.parse(await readFile('src/data/wireframe/prompt-templates.json', 'utf8')) })).digest('hex')}`;
if (!revision) throw new Error('Public builds must pin FRONTEND_EXPECTED_REVISION');
const out = path.resolve('out');
let gitBeta = null;
if (mode === 'git-beta') {
  const intake = Object.fromEntries(await Promise.all(['graph','reviews','manifest','proposals'].map(async name => [name, JSON.parse(await readFile(`../docs/intake/2026-10-14/${name}.json`,'utf8'))])));
  checkIntake(intake);
  const supplement = Object.fromEntries(await Promise.all(['graph','reviews','manifest','proposals'].map(async name => [name, JSON.parse(await readFile(`../docs/intake/2026-10-14-website-supplement/${name}.json`,'utf8'))])));
  checkIntake(supplement);
  const verifiedGaps = Object.fromEntries(await Promise.all(['graph','reviews','manifest','proposals'].map(async name => [name, JSON.parse(await readFile(`../docs/intake/2026-10-16-verified-gaps/${name}.json`, 'utf8'))])));
  checkIntake(verifiedGaps);
  for (const [file, field] of [['source-records','sourceSha256'], ['media-links','mediaSha256']]) if (createHash('sha256').update(await readFile(`../docs/intake/2026-10-16-verified-gaps/${file}.json`)).digest('hex') !== verifiedGaps.manifest[field]) throw new Error('Verified gap source checksum mismatch');
  const combined = JSON.parse(await readFile('../docs/intake/2026-10-14-website-supplement/combined-graph.json','utf8'));
  if (createHash('sha256').update(JSON.stringify(combined)).digest('hex') !== supplement.manifest.combinedSha256 || createHash('sha256').update(JSON.stringify(intake.graph)).digest('hex') !== supplement.manifest.originalGraphSha256) throw new Error('Website supplement graph checksum mismatch');
  const sourceBytes = await readFile('../docs/intake/2026-10-14-website-supplement/source-records.json');
  if (createHash('sha256').update(sourceBytes).digest('hex') !== supplement.manifest.sourceSha256) throw new Error('Website supplement source checksum mismatch');
  const previews = JSON.parse(await readFile('src/data/website-previews.json','utf8'));
  await verifyGitBetaAssets(out, previews, JSON.parse(await readFile('../docs/intake/2026-10-14-website-supplement/media-evidence.json', 'utf8')));
  const avatars = JSON.parse(await readFile('src/data/creator-avatars.json','utf8'));
  await verifyCreatorAvatarAssets(out, avatars);
  const queenieImages = JSON.parse(await readFile('src/data/queenie-images.json','utf8'));
  const sourceAttributions = JSON.parse(await readFile('src/data/queenie-source-attribution.json','utf8'));
  const websiteVisuals = JSON.parse(await readFile('src/data/website-visuals.json','utf8'));
  for(const asset of Object.values(websiteVisuals.assets)) for(const [src,hash] of [[asset.src,asset.sha256],...(asset.poster?[[asset.poster,asset.posterSha256]]:[])]) {
    if(!/^\/website-(?:videos\/\d+\.mp4|previews\/\d+\.(?:jpg|png|webp))$/.test(src)) throw Error('Invalid website visual path');
    if(createHash('sha256').update(await readFile(path.join(out,src.slice(1)))).digest('hex')!==hash) throw Error('Website visual checksum mismatch');
  }
  const queenieManifest = JSON.parse(await readFile('../docs/intake/2026-10-15-queenie/manifest.json','utf8'));
  if (createHash('sha256').update(await readFile('src/data/queenie-images.json')).digest('hex') !== queenieManifest.datasetSha256 || createHash('sha256').update(await readFile('../docs/intake/2026-10-15-queenie/source-analysis.json')).digest('hex') !== queenieManifest.analysisSha256) throw new Error('Queenie snapshot checksum mismatch');
  const promptBodies = JSON.parse(await readFile('src/data/zh-prompt-bodies.json','utf8'));
  const referenceStudyInput=JSON.parse(await readFile('src/data/reference-studies.json','utf8'));
  const referenceStudies=readReferenceStudies(referenceStudyInput);
  for(const row of referenceStudies.records)for(const asset of row.media){
    const bytes=await readFile(path.join(out,asset.src.slice(1)));
    if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Reference study asset checksum mismatch');
  }
  const xArticleBytes=await readFile('src/data/x-article-cases.json');
  const xArticleCases=JSON.parse(xArticleBytes);
  if(xArticleCases.length!==105 || new Set(xArticleCases.map(article=>article.id)).size!==105 || xArticleCases.some((article,index)=>article.rank!==index+1||article.rights!=='review_required'||!article.body||!article.title||!Number.isInteger(article.likes)||!article.authorHandle||article.sourceUrl!==`https://x.com/${article.authorHandle}/status/${article.id}`||index>0&&article.likes>xArticleCases[index-1].likes))throw new Error('X Article case dataset invalid');
  const xArticleCasesHash=createHash('sha256').update(xArticleBytes).digest('hex');
  revision = gitBetaRevision(revision, combined, previews, JSON.parse(await readFile('src/data/localized-case-copy.json','utf8')), avatars, promptBodies, JSON.parse(await readFile('src/data/website-placeholder-templates.json','utf8')), JSON.parse(await readFile('src/data/website-category-membership.json','utf8')), queenieImages, sourceAttributions, JSON.parse(await readFile('src/data/verified-gap-updates.json','utf8')), websiteVisuals, referenceStudyInput);
  await writeFile(path.join(out,'_redirects'),['zh-CN','en'].flatMap(locale=>websiteLegacyPaths(locale).map(alias=>`${alias} /${locale}/prompts/website 301`)).join('\n')+'\n');
  gitBeta = gitBetaReceipt(combined, [...intake.reviews, ...supplement.reviews], JSON.parse(await readFile('src/data/prototype.json','utf8')).prompts, queenieImages);
  gitBeta.referenceStudies=referenceStudies.records.length;
  gitBeta.referenceStudyImages=referenceStudies.records.reduce((n,row)=>n+row.media.length,0);
  gitBeta.promptCount+=referenceStudies.records.length;gitBeta.imagePrompts+=referenceStudies.records.length;
  gitBeta.publishedPrompts.push(...referenceStudies.records.map(row=>({id:row.id,href:`/zh-CN/prompts/${row.slug}`})));
  gitBeta.imageUrls.push(...referenceStudies.records.flatMap(row=>row.media.map(asset=>asset.src)));
  gitBeta.verifiedGaps = { prompts: verifiedGaps.proposals.length, mediaRecords: verifiedGaps.manifest.acceptedMediaRecords, sourceSha256: verifiedGaps.manifest.sourceSha256, mediaSha256: verifiedGaps.manifest.mediaSha256 };
  gitBeta.websiteVisualCases=websiteVisuals.records.filter(row=>row.status==='available'||row.status==='existing').length;
  gitBeta.websiteVisualAssets=Object.keys(websiteVisuals.assets).length;
  gitBeta.articleCaseRevision=`sha256:${xArticleCasesHash}`;
  const localeReceipts=[];
  for(const locale of ['zh-CN','en']){
    const localHref=href=>href.replace(/^\/zh-CN(?=\/)/,`/${locale}`);
    const local={locale,publishedPrompts:gitBeta.publishedPrompts.map(item=>({...item,href:localHref(item.href)})),publishedWebsites:gitBeta.publishedWebsites.map(item=>({...item,href:localHref(item.href)})),betaArticleCases:xArticleCases.map(article=>({id:article.id,href:`/${locale}/prompts/articles/${article.id}`,rights:article.rights})),articleGraph:{nodes:xArticleCases.length*2+new Set(xArticleCases.map(article=>article.authorHandle)).size,edges:xArticleCases.length*2}};
    local.publishedWebsiteViews=readWebsiteViews(parse(await readFile(path.join(out,`${locale}/prompts/website.html`),'utf8')));
    const index=readLibraryIndex(parse(await readFile(path.join(out,`${locale}/prompts/library-index.html`),'utf8')),revision,locale);
    const bytes=JSON.stringify(index,null,2)+'\n',indexPath=locale==='zh-CN'?'/library-index.json':'/en/library-index.json';
    await writeFile(path.join(out,indexPath),bytes);
    local.publishedNavigation=publishedNavigation(index,locale);
    local.navigationIndex={path:indexPath,sha256:indexHash(bytes),routes:index.routes.length};
    localeReceipts.push(local);
  }
  Object.assign(gitBeta,localeReceipts[0]);
  gitBeta.locales=localeReceipts;
}
if (mode !== 'public-api') {
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
if (gitBeta) gitBeta.rscExport = await compactPromptRsc(out);
await writeFile(path.join(out, 'frontend-build.json'), JSON.stringify({ mode, revision, ...(gitBeta ? { gitBeta } : {}), feeds: copied, publicPrompts, sourceMirrorSha: process.env.FRONTEND_MIRROR_SHA ?? null, productionRelease: false }, null, 2) + '\n');
console.log(`Export finalized: ${mode}, ${revision}, ${copied.length} verified feeds`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await finalizeExport();
