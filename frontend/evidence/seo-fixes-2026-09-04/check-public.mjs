import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { parse } = require('node-html-parser');
const dir = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(dir, '../../out');
async function walk(dir) { return (await Promise.all((await fs.readdir(dir, {withFileTypes:true})).map(e => e.isDirectory() ? walk(path.join(dir,e.name)) : path.join(dir,e.name)))).flat(); }
const pages = [];
for (const file of (await walk(path.join(out,'zh-CN'))).filter(f=>f.endsWith('.html'))) {
 const doc = parse(await fs.readFile(file,'utf8'));
 pages.push({ path:'/'+path.relative(out,file).replace(/\.html$/,''), title:doc.querySelector('title')?.text, robots:doc.querySelector('meta[name="robots"]')?.getAttribute('content'), canonical:doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), hreflang:doc.querySelectorAll('link[hreflang]').map(e=>e.attributes), icons:doc.querySelectorAll('link[rel="icon"]').map(e=>e.attributes) });
}
const sitemap = await fs.readFile(path.join(out,'sitemap.xml'),'utf8');
const icons = await Promise.all(['favicon.ico','favicon.svg'].map(async file => ({ file, bytes: (await fs.stat(path.join(out,file))).size })));
const report = {pages, robots:await fs.readFile(path.join(out,'robots.txt'),'utf8'), sitemap, icons};
await fs.writeFile(path.join(dir,'public-seo.json'),JSON.stringify(report,null,2));
const detail=pages.find(p=>p.path==='/zh-CN/prompts/country-miniature-stamp-poster');
if (!detail?.robots?.includes('noindex') || !detail.robots.includes('nofollow')) throw Error('Internal Beta Prompt indexing gate not preserved');
if (detail.canonical!=='https://ancher.space'+detail.path || !detail.hreflang.length) throw Error('Approved Prompt canonical/alternates lost');
if (pages.some(p=>p.icons.length<2)) throw Error('Missing favicon metadata');
if (parse(sitemap).querySelectorAll('loc').length) throw Error('Current Internal Beta snapshot must have no sitemap locations');
console.log(JSON.stringify({pages:pages.length, detail, sitemapLocations:0, icons:report.icons},null,2));
