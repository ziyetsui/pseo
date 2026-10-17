import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {SiteFooter} from '@/components/Chrome';
import {WebsiteCaseResults} from '@/components/WebsiteCaseResults';
import {WebsiteCaseDetail} from '@/components/WebsiteCases';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {libraryIndex} from '@/site/navigation';
const catalog=createGitBetaCatalog('zh-CN');
it('keeps the footer curated while the index retains every Website technology',()=>{
 const footer=parse(renderToStaticMarkup(<SiteFooter catalog={catalog}/>));
 expect(footer.querySelectorAll('.footnav > div')).toHaveLength(5);
 expect(footer.querySelectorAll('.footnav a')).toHaveLength(28);
 expect(footer.querySelector('a[href="/zh-CN/prompts/articles"]')).not.toBeNull();
 expect(footer.querySelector('a[href$="/library-index"]')).not.toBeNull();
 expect(libraryIndex(catalog).groups.find(g=>g.id==='website-tool')?.entries).toHaveLength(33);
});
it.each(['deck','findings','anthology'] as const)('highlights Website variables in %s without changing the source text',presentation=>{
 const row=catalog.websites![0]!;const text='Build [PRODUCT NAME].\nPalette: ["red", "blue"].';
 const doc=parse(renderToStaticMarkup(<WebsiteCaseResults rows={[row]} presentation={presentation} promptTexts={{[row.id]:text}} topics={{}}/>),{blockTextElements:{script:true,style:true,textarea:true}});
 const body=doc.querySelector(presentation==='deck'?'.prompt':presentation==='findings'?'.verbatim':'.mono')!;
 expect(body.textContent).toBe(text);expect(body.querySelectorAll('.prompt-placeholder').map(n=>n.textContent)).toEqual(['[PRODUCT NAME]']);
});
it('uses the same variable tokens in the imported recipe and existing case detail',async()=>{
 const {websiteEditableTemplate}=await import('@/lib/catalog/website-templates');
 const row=catalog.websites!.find(row=>row.id==='prm_92f371524da72b3bcde64de274448347')!;
 const template=websiteEditableTemplate(catalog,row);
 const doc=parse(renderToStaticMarkup(<WebsiteCaseDetail catalog={catalog} entry={row}/>),{blockTextElements:{script:true,style:true,textarea:true}});
 expect(doc.querySelectorAll('.prompt-placeholder').map(n=>n.textContent)).toEqual(expect.arrayContaining(template.variables.map(v=>v.token)));
});
