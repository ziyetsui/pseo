import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),front=`${root}/frontend`,require=createRequire(`${front}/package.json`);
const {createServer}=await import(createRequire(require.resolve('vitest/package.json')).resolve('vite'));
const server=await createServer({root:front,configFile:false,resolve:{alias:{'@':front+'/src'}},server:{middlewareMode:true},appType:'custom'});
try{
 const {createGitBetaCatalog}=await server.ssrLoadModule('/src/lib/catalog/git-beta.ts');
 const {websiteEntries}=await server.ssrLoadModule('/src/lib/catalog/website.ts');
 const catalog=createGitBetaCatalog('en'),cases=websiteEntries(catalog),byHref=new Map(catalog.prompts.map(p=>[p.href,p.id]));
 const keys=new Set([...catalog.prompts.map(p=>p.id),...cases.map(c=>byHref.get(c.promptHref)??c.id)]);
 const links=JSON.parse(await readFile(`${root}/docs/intake/2026-10-16-verified-gaps/case-prompt-links.json`));
 const changed=new Set(links.flatMap(row=>[row.caseId,row.promptId]));
 const membership=JSON.parse(await readFile(`${front}/src/data/monetization-membership.json`));
 const audit=JSON.parse(await readFile(`${front}/src/data/monetization-audit.json`));
 const removed=membership.edges.filter(e=>!keys.has(e.contentId)||changed.has(e.contentId));
 const evidenceFile=`${root}/docs/intake/2026-10-16-verified-gaps/deferred-monetization-edges.json`;
 // Preserve the first migration receipt on re-runs.
 try{await readFile(evidenceFile);}catch{await writeFile(evidenceFile,JSON.stringify({revision:membership.revision,reason:'Newly linked source prompts require separate scene review; all other reviewed memberships are preserved.',edges:removed},null,2)+'\n');}
 membership.revision=catalog.revision;membership.edges=membership.edges.filter(e=>keys.has(e.contentId)&&!changed.has(e.contentId)).map(e=>({...e,sourceRevision:catalog.revision}));
 const prior=new Map(audit.records.filter(r=>keys.has(r.contentId)&&!changed.has(r.contentId)).map(r=>[r.contentId,r]));
 audit.revision=catalog.revision;audit.records=[...keys].map(id=>prior.get(id)??{contentId:id,status:'review',reason:'Verified source import or newly linked case; no commercial scene membership has been approved in this update.',scenarioIds:[]});
 for(const [file,data] of [['monetization-membership.json',membership],['monetization-audit.json',audit]])await writeFile(`${front}/src/data/${file}`,JSON.stringify(data,null,2)+'\n');
 console.log({revision:catalog.revision,prompts:catalog.prompts.length,websites:cases.length,auditRecords:audit.records.length,preservedMemberships:membership.edges.length,deferredMemberships:removed.length});
}finally{await server.close();}
