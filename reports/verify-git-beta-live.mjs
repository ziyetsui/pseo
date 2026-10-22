import { writeFile } from 'node:fs/promises';
const origin = 'https://beta.ancher.site';
const rawFetch = globalThis.fetch;
let networkRetries = 0;
globalThis.fetch = async (url, init = {}) => {
  for (let attempt=0; ; attempt++) {
    try { return await rawFetch(url, {...init, signal:AbortSignal.timeout(30000)}); }
    catch(error) { if(attempt>=4) throw error; networkRetries++; await new Promise(resolve=>setTimeout(resolve,1000)); }
  }
};
const receiptResponse = await fetch(`${origin}/frontend-build.json`, {cache:'no-store'});
const receipt = await receiptResponse.json();
if (receipt.mode !== 'git-beta' || receipt.revision !== 'sha256:9028b46fb5a264d2944b524df63c31cb18e993398358d4c84bca1e7be0dcf129') throw new Error('Expected Git beta revision is not live');
if (receipt.gitBeta.imagePrompts !== 543 || receipt.gitBeta.importedImageExamples !== 541 || receipt.gitBeta.importedWebsites !== 59 || receipt.gitBeta.sourceRecords !== 600) throw new Error('Live source counts differ');
const routes = [...new Set([...receipt.gitBeta.publishedPrompts, ...receipt.gitBeta.publishedWebsites].map(item => item.href))];
if (routes.length !== 615 || routes.some(path => !/^\/zh-CN\/prompts\/[a-z0-9_/-]+$/.test(path))) throw new Error('Unexpected publication route set');
const checks = [];
let cursor = 0;
await Promise.all(Array.from({length:6},async()=>{
  while(cursor<routes.length){const path=routes[cursor++];const response=await fetch(origin+path,{method:'HEAD',redirect:'manual'});checks.push({path,status:response.status,robots:response.headers.get('x-robots-tag')});if(checks.length%50===0)console.log(`Checked ${checks.length}/${routes.length} live routes`);}
}));
const websiteResponse=await fetch(`${origin}/zh-CN/prompts/website`);const website=await websiteResponse.text();
const websiteCount=[...website.matchAll(/data-website-case="/g)].length;
const hubResponse=await fetch(`${origin}/zh-CN/prompts`);const hub=await hubResponse.text();
const missing=await fetch(`${origin}/zh-CN/prompts/website/not-a-real-case`,{method:'HEAD'});
const license=await fetch(`${origin}/licenses/awesome-gpt-image-2`,{method:'HEAD'});
const failures=checks.filter(check=>check.status!==200 || !check.robots?.includes('noindex'));
const passed=!failures.length&&websiteResponse.status===200&&websiteCount===60&&hub.includes('/zh-CN/prompts/website')&&missing.status===404&&license.status===200;
const result={origin,checkedAt:new Date().toISOString(),passed,mode:receipt.mode,revision:receipt.revision,sourceRecords:600,imagePrompts:543,importedImageExamples:541,importedWebsiteCases:59,websiteCount,detailRoutesChecked:checks.length,networkRetries,failures,unknownCaseStatus:missing.status,licenseStatus:license.status,checks};
await writeFile(new URL('./git-beta-live-2026-10-14.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,checks:undefined},null,2));if(!passed)process.exitCode=1;
