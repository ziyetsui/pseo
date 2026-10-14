import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {SiteFooter} from '@/components/Chrome';
import {WebsiteCaseResults} from '@/components/WebsiteCaseResults';
import {WebsiteCaseDetail} from '@/components/WebsiteCases';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {libraryIndex} from '@/site/navigation';
const catalog=createGitBetaCatalog('zh-CN');
it('keeps the footer short while the index retains every Website technology',()=>{
 const footer=parse(renderToStaticMarkup(<SiteFooter catalog={catalog}/>));
 expect(footer.querySelectorAll('.footnav > div')).toHaveLength(2);
 expect(footer.querySelectorAll('.footnav a')).toHaveLength(7);
 expect(footer.querySelector('a[href$="/library-index"]')).not.toBeNull();
 expect(libraryIndex(catalog).groups.find(g=>g.id==='website-tool')?.entries).toHaveLength(21);
});
it.each(['deck','findings','anthology'] as const)('highlights Website variables in %s without changing the source text',presentation=>{
 const row=catalog.websites![0]!;const text='Build [PRODUCT NAME].\nPalette: ["red", "blue"].';
 const doc=parse(renderToStaticMarkup(<WebsiteCaseResults rows={[row]} presentation={presentation} promptTexts={{[row.id]:text}} topics={{}}/>),{blockTextElements:{script:true,style:true,textarea:true}});
 const body=doc.querySelector(presentation==='deck'?'.prompt':presentation==='findings'?'.verbatim':'.mono')!;
 expect(body.textContent).toBe(text);expect(body.querySelectorAll('.prompt-placeholder').map(n=>n.textContent)).toEqual(['[PRODUCT NAME]']);
});
it('uses the same variable tokens in the imported recipe and existing case detail',()=>{
 const p=catalog.prompts.find(p=>p.prompt.includes('[PRODUCT NAME]'))!;
 expect(p.variables.some(v=>v.token==='[PRODUCT NAME]')).toBe(true);
 const row={...catalog.websites![0]!,id:'test-case',promptHref:p.href};
 const doc=parse(renderToStaticMarkup(<WebsiteCaseDetail catalog={catalog} entry={row}/>),{blockTextElements:{script:true,style:true,textarea:true}});
 expect(doc.querySelector('.website-prompt .prompt-placeholder')?.textContent).toBe('[PRODUCT NAME]');
});
