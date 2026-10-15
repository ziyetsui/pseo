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
