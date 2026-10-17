import {mkdtemp, mkdir, writeFile, readFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {it, expect} from 'vitest';
// @ts-expect-error Build-time JavaScript utility.
import {compactPromptRsc,omitsTreeForNativeAnchorRoute} from '../scripts/compact-rsc-export.mjs';
it('deduplicates identical route payloads with compatibility rewrites and retains full/page payloads',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'queenie-rsc-'));
 for(const locale of ['en','zh-CN']){
  const p=path.join(root,locale,'prompts');await mkdir(path.join(p,'example'),{recursive:true});
  await writeFile(path.join(p,'index.html'),'<main><h1>Prompts</h1></main>');await writeFile(path.join(root,locale,'prompts.html'),'<main><h1>Prompts</h1></main>');
  await writeFile(path.join(p,'__next._full.txt'),'full');await writeFile(path.join(p,'__next._tree.txt'),'root-tree');await writeFile(path.join(p,'__next.$d$locale.$oc$path.__PAGE__.txt'),'page');
  await writeFile(path.join(p,'example.txt'),'same RSC');await writeFile(path.join(p,'example','__next._full.txt'),'same RSC');await writeFile(path.join(p,'example','__next._tree.txt'),'tree');await writeFile(path.join(p,'example.html'),'<main><h1>Example</h1></main>');await writeFile(path.join(p,'example','__next.$d$locale.$oc$path.__PAGE__.txt'),'page');
 }
 const result=await compactPromptRsc(root);
 expect(result.removed).toBe(2);expect(result.treeRemoved).toBe(4);expect(await readFile(path.join(root,'_redirects'),'utf8')).toContain('/en/prompts/:slug.txt /en/prompts/:slug/__next._full.txt 200');
 await expect(access(path.join(root,'en/prompts/__next._tree.txt'))).rejects.toThrow();
 await expect(access(path.join(root,'en/prompts/example.txt'))).rejects.toThrow();
 await expect(access(path.join(root,'en/prompts/example/__next._tree.txt'))).rejects.toThrow();
 expect(await readFile(path.join(root,'en/prompts/example/__next._full.txt'),'utf8')).toBe('same RSC');
 expect(await readFile(path.join(root,'en/prompts/example/__next.$d$locale.$oc$path.__PAGE__.txt'),'utf8')).toBe('page');
});
it('fails closed on different payloads before deleting either route',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'queenie-rsc-'));const p=path.join(root,'en/prompts');await mkdir(path.join(p,'example'),{recursive:true});await mkdir(path.join(root,'zh-CN/prompts'),{recursive:true});
 await writeFile(path.join(p,'example.txt'),'first');await writeFile(path.join(p,'example/__next._full.txt'),'second');
 await expect(compactPromptRsc(root)).rejects.toThrow(/mismatch/);expect(await readFile(path.join(p,'example.txt'),'utf8')).toBe('first');
});
it('compacts tree payloads only for routes that use native anchor navigation',async()=>{
 for(const route of ['en','zh-CN/prompts','en/prompts/articles/123','zh-CN/prompts/website/views/example','en/prompts/use-cases/example','zh-CN/prompts/model-families/example','en/prompts/styles/example','zh-CN/prompts/subjects/example','en/prompts/creators','zh-CN/prompts/library-index','en/prompts/monetization/example','en/prompts/models/example','en/prompts/website/example','en/prompts/case-example','en/prompts/image','zh-CN/prompts/queenie-example'])expect(omitsTreeForNativeAnchorRoute(route)).toBe(true);
 for(const route of ['en/proto/model-hero','unrelated/example'])expect(omitsTreeForNativeAnchorRoute(route)).toBe(false);
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
it('keeps catalog navigation native so omitted tree-only payloads cannot be requested',async()=>{
 const {readdir}=await import('node:fs/promises');const ts=await import('typescript');
 async function sourceFiles(directory:string):Promise<string[]>{
  const entries=await readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?sourceFiles(path.join(directory,entry.name)):Promise.resolve(/\.tsx?$/.test(entry.name)?[path.join(directory,entry.name)]:[])))).flat();
 }
 const files=[...await sourceFiles(path.resolve('src/components')),...await sourceFiles(path.resolve('src/lib')),path.resolve('src/app/not-found.tsx'),path.resolve('src/app/[locale]/[[...path]]/page.tsx')];
 for(const file of files){
  const source=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  for(const statement of source.statements){
   if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier))continue;
   const module=statement.moduleSpecifier.text;
   expect(['next/link','next/router'],file).not.toContain(module);
   if(module==='next/navigation'){
    const bindings=statement.importClause?.namedBindings;
    if(bindings&&ts.isNamedImports(bindings))expect(bindings.elements.map(e=>e.propertyName?.text??e.name.text),file).not.toContain('useRouter');
   }
  }
 }
});
