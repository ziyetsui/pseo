import {mkdtemp, mkdir, writeFile, readFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {it, expect} from 'vitest';
// @ts-expect-error Build-time JavaScript utility.
import {compactPromptRsc} from '../scripts/compact-rsc-export.mjs';
it('deduplicates identical route payloads with two relative rewrites and retains segment prefetch files',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'queenie-rsc-'));
 for(const locale of ['en','zh-CN']){
  const p=path.join(root,locale,'prompts');await mkdir(path.join(p,'example'),{recursive:true});
  await writeFile(path.join(p,'__next._tree.txt'),'root-tree');await writeFile(path.join(p,'example.txt'),'same RSC');await writeFile(path.join(p,'example','__next._full.txt'),'same RSC');await writeFile(path.join(p,'example','__next._tree.txt'),'tree');
 }
 const result=await compactPromptRsc(root);
 expect(result.removed).toBe(2);expect(await readFile(path.join(root,'_redirects'),'utf8')).toContain('/en/prompts/:slug.txt /en/prompts/:slug/__next._full.txt 200');
 await expect(access(path.join(root,'en/prompts/example.txt'))).rejects.toThrow();
 expect(await readFile(path.join(root,'en/prompts/example/__next._tree.txt'),'utf8')).toBe('tree');
});
it('fails closed on different payloads before deleting either route',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'queenie-rsc-'));const p=path.join(root,'en/prompts');await mkdir(path.join(p,'example'),{recursive:true});await mkdir(path.join(root,'zh-CN/prompts'),{recursive:true});
 await writeFile(path.join(p,'example.txt'),'first');await writeFile(path.join(p,'example/__next._full.txt'),'second');
 await expect(compactPromptRsc(root)).rejects.toThrow(/mismatch/);expect(await readFile(path.join(p,'example.txt'),'utf8')).toBe('first');
});
it('keeps article HTML and full/page segments while compacting native-link tree payloads',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'article-rsc-'));
 for(const locale of ['en','zh-CN']){
  const parent=path.join(root,locale,'prompts','articles'),detail=path.join(parent,'123');
  await mkdir(detail,{recursive:true});
  await writeFile(path.join(parent,'123.html'),'<main><h1>Article</h1></main>');
  await writeFile(path.join(parent,'123.txt'),'full article RSC');
  await writeFile(path.join(detail,'__next._full.txt'),'full article RSC');
  await writeFile(path.join(detail,'__next._tree.txt'),'tree');
  await writeFile(path.join(detail,'__next.$d$locale.$oc$path.__PAGE__.txt'),'page');
 }
 const result=await compactPromptRsc(root);
 expect(result.removed).toBe(2);expect(result.treeRemoved).toBe(2);
 expect(result.rewrites).toContain('/en/prompts/articles/:slug.txt /en/prompts/articles/:slug/__next._full.txt 200');
 await expect(access(path.join(root,'en/prompts/articles/123.txt'))).rejects.toThrow();
 await expect(access(path.join(root,'en/prompts/articles/123/__next._tree.txt'))).rejects.toThrow();
 expect(await readFile(path.join(root,'en/prompts/articles/123/__next._full.txt'),'utf8')).toBe('full article RSC');
 expect(await readFile(path.join(root,'en/prompts/articles/123/__next.$d$locale.$oc$path.__PAGE__.txt'),'utf8')).toBe('page');
});
