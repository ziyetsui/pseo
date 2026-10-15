import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
export const PROMPT_RSC_REWRITES = ['en','zh-CN'].map(locale=>`/${locale}/prompts/:slug.txt /${locale}/prompts/:slug/__next._full.txt 200`);

/** Keep full/tree/page prefetch segments. Two Pages 200 proxies preserve legacy .txt URLs
 * without storing their byte-identical copies beside each route's __next._full.txt. */
export async function compactPromptRsc(root) {
  const duplicates=[];
  for(const locale of ['en','zh-CN']) {
    const directory=path.join(root,locale,'prompts');
    for(const file of await readdir(directory,{withFileTypes:true})) {
      if(!file.isFile()||!/^[a-z0-9-]+\.txt$/.test(file.name))continue;
      const source=path.join(directory,file.name), target=path.join(directory,file.name.slice(0,-4),'__next._full.txt');
      const [left,right]=await Promise.all([readFile(source),readFile(target)]);
      if(!left.equals(right))throw Error(`RSC export mismatch: ${locale}/prompts/${file.name}`);
      duplicates.push({source,bytes:left.length});
    }
  }
  const redirectPath=path.join(root,'_redirects');
  let existing='';try{existing=await readFile(redirectPath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const rules=PROMPT_RSC_REWRITES;
  const added=rules.filter(rule=>!existing.split('\n').includes(rule));
  if(added.length)await writeFile(redirectPath,existing+(existing&&!existing.endsWith('\n')?'\n':'')+added.join('\n')+'\n');
  // Validate all pairs and persist compatibility routes before deleting any duplicate.
  for(const item of duplicates)await unlink(item.source);
  return {removed:duplicates.length,savedBytes:duplicates.reduce((sum,item)=>sum+item.bytes,0),rewrites:rules};
}
