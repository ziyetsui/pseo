import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {TaskFindings} from '@/components/TaskFindings';
import {Creators} from '@/components/Browse';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {isPromptCreator} from '@/lib/catalog/creator-match';
describe('compact creator sections',()=>{
 for(const locale of ['zh-CN','en'] as const)for(const model of [false,true])it(`${locale}, model=${model}: previews eight and retains every associated author in a native disclosure`,()=>{
  const catalog=createGitBetaCatalog(locale),authors=catalog.creators.filter(author=>catalog.prompts.some(prompt=>isPromptCreator(prompt,author)));
  expect(authors.length).toBeGreaterThan(8);
  const doc=parse(renderToStaticMarkup(<Creators catalog={catalog} model={model} />)),details=doc.querySelector('details.creator-more');
  expect(details).not.toBeNull();expect(details?.hasAttribute('open')).toBe(false);
  expect(doc.querySelectorAll('.creator-preview > a')).toHaveLength(8);
  const links=doc.querySelectorAll('.creator-preview > a, details.creator-more .people > a, details.creator-more .creators > a');
  expect(links).toHaveLength(authors.length);expect(new Set(links.map(link=>link.getAttribute('href')))).toEqual(new Set(authors.map(author=>author.url||author.href)));
  expect(details?.querySelector('summary')?.text).toContain(locale==='en'?'View all':'查看全部');
 });
 it('applies the same compact list to task pages and keeps the task-specific heading',()=>{
  const catalog=createGitBetaCatalog('en'),task=catalog.useCases.find(ref=>ref.sourceLabel==='Photography & Realism')!;
  expect(task).toBeDefined();
  const doc=parse(renderToStaticMarkup(<TaskFindings catalog={catalog} task={task} />)),section=doc.querySelector('#creators')!;
  expect(section.querySelectorAll('.creator-preview > a')).toHaveLength(8);
  expect(section.querySelector('details.creator-more')).not.toBeNull();
  expect(section.querySelector('h2')?.text).toBe(`Who writes ${task.label} prompts`);
 });
 it('does not add a disclosure when eight or fewer authors match the current collection',()=>{
  const catalog=createGitBetaCatalog('en'),prompt=catalog.prompts[0]!;
  const doc=parse(renderToStaticMarkup(<Creators catalog={catalog} prompts={[prompt]} />));
  expect(doc.querySelector('details')).toBeNull();expect(doc.querySelectorAll('.creator-preview > a')).toHaveLength(1);
 });
});
