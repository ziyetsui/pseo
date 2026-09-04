import { readFile, readdir, writeFile } from 'node:fs/promises';
import { parse } from 'node-html-parser';
import path from 'node:path';

const base = 'http://127.0.0.1:3000';
const root = path.resolve('out');
async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? files(path.join(dir,e.name)) : path.join(dir,e.name)))).flat();
}
async function pool(items, run, concurrency = 4) {
  let index = 0;
  const results = [];
  await Promise.all(Array.from({length:concurrency}, async () => {
    while(index < items.length) { const i=index++; results[i]=await run(items[i]); }
  }));
  return results;
}
const external = new Set();
const pages = (await files(root)).filter(f => f.endsWith('.html'));
const routes = await pool(pages, async file => {
  const route = ('/'+path.relative(root,file).replace(/\.html$/,'')).replace(/\/index$/,'') || '/';
  const expected = parse(await readFile(file,'utf8'));
  for(const a of expected.querySelectorAll('a[href]')) {
    const href=a.getAttribute('href');
    if(/^https?:\/\//.test(href)) external.add(href);
  }
  try {
    const response = await fetch(base+route,{signal:AbortSignal.timeout(20000)});
    const actual = parse(await response.text());
    const heading=actual.querySelector('main h1')?.text.trim();
    const expectedHeading=expected.querySelector('main h1')?.text.trim();
    const statusExpected = /(?:^|\/)404$|_not-found/.test(route) ? 404 : 200;
    return {route,status:response.status,heading,pass:response.status===statusExpected && heading===expectedHeading};
  } catch(error) { return {route,pass:false,error:error.message}; }
});
const fixture=JSON.parse(await readFile('src/data/prototype.json','utf8'));
const mediaUrls=[...new Set([...fixture.prompts.flatMap(p=>p.imgs),...Object.values(fixture.avatars)])];
const probe=async url=>{
  try {
    const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000)});
    return {url,status:response.status,type:response.headers.get('content-type'),finalUrl:response.url};
  }catch(error){return {url,error:error.message};}
};
const media=await pool(mediaUrls,probe);
const outbound=await pool([...external],probe);
const result={checkedAt:new Date().toISOString(),base,routes,media,outbound};
await writeFile('evidence/catalog-audit/live-results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,routeFailures:routes.filter(r=>!r.pass),media:media.length,mediaUnavailable:media.filter(m=>m.status!==200||!m.type?.startsWith('image/')),outbound:outbound.length,outboundStatuses:outbound.reduce((a,r)=>(a[r.status??'unverified']=(a[r.status??'unverified']??0)+1,a),{})},null,2));
