import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildIntake,checkIntake,validateGraph} from './lib/case-import.mjs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../docs/intake/2026-10-14-website-supplement');
const original=JSON.parse(await readFile(resolve(import.meta.dirname,'../docs/intake/2026-10-14/graph.json'),'utf8'));
const rows=JSON.parse(await readFile(`${root}/source-records.json`,'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const seen=new Set(original.nodes.filter(n=>n.type==='prompt').map(n=>sha(n.prompt)));
const skipped=[],valid=[];
for(const row of rows){
 const signature=sha(row.prompt.trim().replace(/\s+/gu,' ').replace(/^["“]|["”]$/gu,''));
 if(seen.has(sha(row.prompt))||seen.has(signature)){skipped.push({id:row.id,reason:'identical_prompt',source:row.post_url});continue;}
 seen.add(signature);valid.push(row);
}
const metadata=JSON.parse(await readFile(`${root}/source-metadata.json`,'utf8'));
const result=buildIntake({websites:valid,gallery:{cases:[]},observedAt:metadata.observedAt,upstreamCommit:'5cb9109ca2d29476f8e34dbc0cdb43607bdd3f77'});
const accepted=new Set(result.proposals.map(p=>p.body.prompt.artifactKey));
const graph={schemaVersion:1,nodes:result.nodes.map(n=>n.type==='prompt'?{...n,promptOnly:true,betaEligible:accepted.has(n.id)}:n),edges:result.edges};
const nodes=new Map(original.nodes.map(n=>[n.id,n]));
for(const n of graph.nodes)if(n.betaEligible!==false&&!nodes.has(n.id))nodes.set(n.id,n);
const edges=new Map();
for(const e of [...original.edges,...graph.edges])if(nodes.has(e.from)&&nodes.has(e.to))edges.set(`${e.from}:${e.type}:${e.to}`,e);
const combined={schemaVersion:1,nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),edges:[...edges.values()].sort((a,b)=>`${a.from}:${a.type}:${a.to}`.localeCompare(`${b.from}:${b.type}:${b.to}`))};
validateGraph(combined);
await writeFile(`${root}/combined-graph.json`,JSON.stringify(combined,null,2)+'\n');
const manifest={...result.manifest,observedAt:result.observedAt,nodes:graph.nodes.length,edges:graph.edges.length,proposals:result.proposals.length,rawRecords:rows.length,duplicateRecords:skipped.length,combinedSha256:sha(JSON.stringify(combined)),originalGraphSha256:sha(JSON.stringify(original)),blockedRecords:result.reviews.filter(r=>r.reasons.includes('proposal_contract_blocked')).length,sourceSha256:sha(await readFile(`${root}/source-records.json`))};
checkIntake({graph:{nodes:result.nodes,edges:result.edges},proposals:result.proposals,reviews:result.reviews,manifest:{...manifest,nodes:result.nodes.length,edges:result.edges.length}});
for(const [key,value] of Object.entries({graph,proposals:result.proposals,reviews:result.reviews,manifest,duplicates:skipped}))await writeFile(`${root}/${key}.json`,JSON.stringify(value,null,2)+'\n');
console.log(manifest);console.log('BLOCKED',result.reviews.filter(r=>r.reasons.includes('proposal_contract_blocked')));
