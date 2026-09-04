// Read-only localhost audit; no CMS, publishing or application writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { parse } = require('node-html-parser');
const dir = path.dirname(new URL(import.meta.url).pathname);
const origin = 'http://127.0.0.1:3000';
async function walk(p) { const entries = await fs.readdir(p, {withFileTypes:true}); return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(p,e.name)) : path.join(p,e.name)))).flat(); }
const files = (await walk(path.resolve(dir,'../../out'))).filter(f=>f.endsWith('.html'));
const routes = files.map(f=>'/'+path.relative(path.resolve(dir,'../../out'),f).replace(/\.html$/,'').replace(/^index$/,'')).filter(p=>!p.includes('_not-found') && p!='/404');
const extra = ['/robots.txt','/sitemap.xml','/seo-audit-missing-20260904','/zh-CN/prompts/seo-audit-missing-20260904','/en/prompts','/about','/contact','/privacy','/terms','/zh-CN/about','/zh-CN/contact','/zh-CN/privacy','/zh-CN/terms','/zh-CN/prompts?useCase=fashion','/zh-CN/prompts?contentType=video','/zh-CN/prompts/styles/photorealistic?q=portrait','/zh-CN/prompts/model-families/nano-banana?model=nano-banana-pro'];
await fs.mkdir(path.join(dir,'html'),{recursive:true});
const pages=[];
const queue=[...new Set([...routes,...extra])];
async function one(route) {
 const start=Date.now();
 try {
  const res=await fetch(origin+route,{signal:AbortSignal.timeout(45000)}), html=await res.text();
  const file=encodeURIComponent(route||'/')+'.html'; await fs.writeFile(path.join(dir,'html',file),html);
  const root=parse(html), main=parse(root.querySelector('main')?.outerHTML ?? `<main>${html}</main>`); main.querySelectorAll('script,style').forEach(el=>el.remove());
  const metas=Object.fromEntries(root.querySelectorAll('meta').map(el=>[el.getAttribute('name')||el.getAttribute('property')||'charset',el.getAttribute('content')||el.getAttribute('charset')]));
  const links=root.querySelectorAll('a[href]').map(el=>({href:el.getAttribute('href'),text:el.text.trim(),rel:el.getAttribute('rel')||'',target:el.getAttribute('target')||''}));
  const images=root.querySelectorAll('img').map(el=>({src:el.getAttribute('src'),alt:el.getAttribute('alt'),width:el.getAttribute('width'),height:el.getAttribute('height'),loading:el.getAttribute('loading'),srcset:el.getAttribute('srcset')}));
  const schemas=root.querySelectorAll('script[type="application/ld+json"]').map(el=>{try{return JSON.parse(el.text)}catch{return {parseError:true}}});
  return {route,status:res.status,finalUrl:res.url,elapsedMs:Date.now()-start,bytes:Buffer.byteLength(html),contentType:res.headers.get('content-type'),headers:{robots:res.headers.get('x-robots-tag'),cache:res.headers.get('cache-control'),encoding:res.headers.get('content-encoding')},file,lang:root.querySelector('html')?.getAttribute('lang'),title:root.querySelector('title')?.text,metas,canonical:root.querySelector('link[rel="canonical"]')?.getAttribute('href'),hreflang:root.querySelectorAll('link[hreflang]').map(e=>e.attributes),h1:root.querySelectorAll('h1').map(el=>el.text.trim()),headings:main.querySelectorAll('h1,h2,h3,h4,h5,h6').map(el=>({tag:el.tagName,text:el.text.trim()})),mainText:main.text.replace(/\s+/g,' ').trim(),wordCount:main.text.trim().split(/\s+/).length,links,images,schemas,videos:root.querySelectorAll('video').length,ids:root.querySelectorAll('[id]').map(el=>el.id),scripts:root.querySelectorAll('script[src]').map(el=>el.getAttribute('src'))};
 }catch(e){return {route,error:String(e)}}
}
await Promise.all(Array.from({length:4},async()=>{while(queue.length){const p=await one(queue.shift());pages.push(p);console.log(p.status||'ERROR',p.route)}}));
const byRoute=new Map(pages.map(p=>[p.route,p]));
const broken=[], unseen=new Set();let checked=0;
for(const p of pages.filter(p=>p.status===200&&routes.includes(p.route)&&!p.route.startsWith('/proto/'))) for(const a of p.links){
 const u=new URL(a.href,origin+p.route); if(u.origin!==origin)continue;const dest=byRoute.get(u.pathname); if(!dest){unseen.add(u.pathname);continue;}checked++;
 if(dest.status!==200)broken.push({from:p.route,...a,status:dest.status});
 else if(u.hash&&!dest.ids.includes(decodeURIComponent(u.hash.slice(1))))broken.push({from:p.route,...a,error:'missing fragment'});
}
const content=pages.filter(p=>p.status===200&&routes.includes(p.route)&&p.route.startsWith('/zh-CN'));
const duplicates=key=>{const map={};for(const p of content){const v=key(p);(map[v]??=[]).push(p.route)}return Object.entries(map).filter(([,v])=>v.length>1).map(([value,routes])=>({value,routes}));};
const depth={'/zh-CN/prompts':0};let changed=true;while(changed){changed=false;for(const p of content){if(depth[p.route]===undefined)continue;for(const a of p.links){const u=new URL(a.href,origin+p.route);if(u.origin===origin&&byRoute.get(u.pathname)?.status===200&&(depth[u.pathname]===undefined||depth[u.pathname]>depth[p.route]+1)){depth[u.pathname]=depth[p.route]+1;changed=true;}}}}
const summary={generatedAt:new Date().toISOString(),origin,seedRoutes:routes.length,totalRequests:pages.length,contentPages:content.length,statuses:pages.reduce((r,p)=>(r[p.status||'error']=(r[p.status||'error']||0)+1,r),{}),checkedInternalLinks:checked,brokenLinks:broken,unseenLinkPaths:[...unseen],missingTitle:content.filter(p=>!p.title).map(p=>p.route),nonUniqueH1:content.filter(p=>p.h1.length!==1).map(p=>({route:p.route,h1:p.h1})),noindex:content.filter(p=>p.metas.robots?.includes('noindex')).length,canonical:content.filter(p=>p.canonical).length,jsonLd:content.filter(p=>p.schemas.length).length,missingAlt:content.flatMap(p=>p.images.filter(i=>i.alt===undefined).map(i=>({route:p.route,...i}))),emptyAltCount:content.flatMap(p=>p.images.filter(i=>i.alt==='')).length,duplicateTitles:duplicates(p=>p.title),duplicateDescriptions:duplicates(p=>p.metas.description),depth,orphans:content.filter(p=>depth[p.route]===undefined).map(p=>p.route)};
await fs.writeFile(path.join(dir,'crawl.json'),JSON.stringify({summary,pages},null,2));await fs.writeFile(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
