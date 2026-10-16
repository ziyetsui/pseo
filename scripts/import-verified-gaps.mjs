import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {buildIntake,checkIntake,validateGraph} from './lib/case-import.mjs';
const root=resolve(import.meta.dirname,'..'), dir=`${root}/docs/intake/2026-10-16-verified-gaps`;
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const write=(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n');
const sha=v=>createHash('sha256').update(v).digest('hex');
const rows=await read(`${dir}/source-records.json`), media=await read(`${dir}/media-links.json`);
const intake=buildIntake({websites:rows,gallery:{cases:[]},observedAt:'2026-10-15T10:00:00.000Z',upstreamCommit:(await read(`${dir}/source-metadata.json`)).upstreamCommit});
intake.graph={schemaVersion:1,nodes:intake.nodes,edges:intake.edges};
if(intake.proposals.length!==rows.length)throw new Error('New prompt contract rejected');
const graph=await read(`${root}/docs/intake/2026-10-14-website-supplement/combined-graph.json`);
const nodes=new Map(graph.nodes.map(n=>[n.id,n])),edges=new Map(graph.edges.map(e=>[`${e.from}:${e.type}:${e.to}`,e]));
const edge=(from,type,to)=>edges.set(`${from}:${type}:${to}`,{from,type,to});
const node=(type,key,fields)=>{const id=`${type==='prompt'?'prm':type.replaceAll('-','')}_${sha(key).slice(0,32)}`;if(!nodes.has(id))nodes.set(id,{id,type,...fields});return id;};
for(const n of intake.graph.nodes)nodes.set(n.id,n.type==='prompt'?{...n,promptOnly:true,betaEligible:true}:n.type==='source'&&nodes.has(n.id)?{...nodes.get(n.id),...n,publishedAt:n.publishedAt??nodes.get(n.id).publishedAt}:n);
for(const e of intake.graph.edges)edge(e.from,e.type,e.to);
const promptIds=intake.graph.nodes.filter(n=>n.type==='prompt').map(n=>n.id);
for(const row of rows){const p=intake.graph.nodes.find(n=>n.type==='prompt'&&n.prompt===row.prompt);for(const url of row.context){const id=node('source',`url:${url}`,{url,platform:'url'});edge(p.id,'related_to',id);}}
const sourceFor=url=>node('source',`x:${url.split('/').at(-1)}`,{url,platform:'x',sourceId:url.split('/').at(-1),observedAt:'2026-10-15T10:00:00.000Z'});
// Explicit review exclusions also remove a prior run's rejected association.
for(const rejected of await read(`${dir}/review-excluded-media.json`)) {
 for(const [key,e] of edges) if(e.from===rejected.id && e.type==='has_example' && rejected.media.some(m=>nodes.get(e.to)?.url===m.url)) edges.delete(key);
}
const baseline=[];
for(const row of media){
 const owner=nodes.get(row.id);const sourceId=sourceFor(row.mediaSource);
 const examples=row.media.map(m=>({id:node('media',m.url,{url:m.url,kind:m.kind,poster:m.poster??null,width:m.width??null,height:m.height??null,alt:owner?.title??'1970s sedan, four-shot street sequence',rightsStatus:'review_required'}),...m}));
 if(owner){for(const m of examples)edge(row.id,'has_example',m.id);edge(row.id,'related_to',sourceId);}
 else baseline.push({id:row.id,source:row.promptSource,mediaSource:row.mediaSource,media:examples});
}
const websiteBySource=pid=>[...nodes.values()].find(n=>n.type==='website-case'&&[...edges.values()].some(e=>e.from===n.id&&e.type==='sourced_from'&&nodes.get(e.to)?.sourceId===pid));
const newBySource=pid=>intake.graph.nodes.find(n=>n.type==='prompt'&&intake.graph.edges.some(e=>e.from===n.id&&e.type==='sourced_from'&&intake.graph.nodes.find(x=>x.id===e.to)?.sourceId===pid));
const links=[['2053737547831067073',newBySource('2053737547831067073').id],['2050020216671715729',newBySource('2050020222652792889').id],['2108518201793396891','prm_6f97555db109605911a7e435aec2fa50'],['2102436416437580159','prm_b98dd74fb3f6235014b72babf64c7a45']].map(([source,prompt])=>{const c=websiteBySource(source);if(!c||!nodes.has(prompt))throw new Error('Case link endpoint missing');edge(c.id,'has_prompt',prompt);return {caseId:c.id,promptId:prompt,source};});
// The author says Fable, without a numeric version. Preserve that evidence at family level.
edge('prm_7d46d699adedf29269d0660aa4086291','designed_for','model_c857d09db23e6822e3600bc06ad8d58f');
const combined={schemaVersion:1,nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),edges:[...edges.values()].sort((a,b)=>`${a.from}:${a.type}:${a.to}`.localeCompare(`${b.from}:${b.type}:${b.to}`))};validateGraph(combined);
await write(`${root}/docs/intake/2026-10-14-website-supplement/combined-graph.json`,combined);
const priorManifest=await read(`${root}/docs/intake/2026-10-14-website-supplement/manifest.json`);priorManifest.combinedSha256=sha(JSON.stringify(combined));await write(`${root}/docs/intake/2026-10-14-website-supplement/manifest.json`,priorManifest);
const manifest={...intake.manifest,nodes:intake.graph.nodes.length,edges:intake.graph.edges.length,proposals:intake.proposals.length,acceptedMediaRecords:media.length,sourceSha256:sha(await readFile(`${dir}/source-records.json`)),mediaSha256:sha(await readFile(`${dir}/media-links.json`)),combinedSha256:sha(JSON.stringify(combined))};
checkIntake({...intake,manifest});
for(const name of ['graph','reviews','proposals'])await write(`${dir}/${name}.json`,intake[name]);await write(`${dir}/manifest.json`,manifest);await write(`${dir}/case-prompt-links.json`,links);
await write(`${root}/frontend/src/data/verified-gap-updates.json`,{baselineMedia:baseline,baselineModels:[{id:'2073529429838696592',slug:'claude',evidence:'https://x.com/zeuuss_01/status/2073529429838696592'}]});
const copy=await read(`${root}/frontend/src/data/localized-case-copy.json`);Object.assign(copy,await read(`${dir}/display-copy.json`));await write(`${root}/frontend/src/data/localized-case-copy.json`,copy);
console.log({newPromptIds:promptIds,mediaRecords:media.length,baselineMedia:baseline.length,caseLinks:links});
