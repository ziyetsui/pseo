import {readFile} from 'node:fs/promises';
import {parse} from 'node-html-parser';
const mapping=JSON.parse(await readFile('src/data/queenie-source-attribution.json','utf8'));
for(const locale of ['en','zh-CN'])for(const row of mapping.records){
 const html=parse(await readFile(`out/${locale}/prompts/${row.id}.html`,'utf8'));
 const main=html.querySelector('main');
 if(!main?.textContent.includes(row.author)||!main.querySelectorAll('a').some(a=>a.getAttribute('href')===row.sourceUrl)||main.querySelectorAll('a').some(a=>a.getAttribute('href')?.includes('youmind.com')))throw Error(`Wrong attribution: ${locale}/${row.id}`);
}
console.log(`Verified ${mapping.records.length*2} bilingual detail pages with original X attribution`);
