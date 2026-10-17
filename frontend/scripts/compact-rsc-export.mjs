import {readFile,writeFile,readdir,unlink,access} from 'node:fs/promises';
import path from 'node:path';
export const PROMPT_RSC_REWRITES = ['en','zh-CN'].map(locale=>`/${locale}/prompts/:slug.txt /${locale}/prompts/:slug/__next._full.txt 200`);
export function omitsTreeForNativeAnchorRoute(relative){return /^(?:en|zh-CN)(?:\/prompts(?:\/.*)?)?$/u.test(relative);}

async function exists(file){try{await access(file);return true;}catch{return false;}}

/** Remove byte-identical route aliases. All catalog pages
 * use native anchor navigation, so their tree-only prefetch files can be omitted. */
export async function compactPromptRsc(root) {
  const duplicates=[],treeSegments=[];
  async function visit(directory,relative=''){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name),rel=relative?`${relative}/${entry.name}`:entry.name;
      if(entry.isDirectory()){
        if(entry.name==='_next'||entry.name==='node_modules')continue;
        await visit(file,rel);
        continue;
      }
      if(!entry.isFile())continue;
      if(entry.name==='__next._tree.txt'&&omitsTreeForNativeAnchorRoute(relative)){
        const sibling=path.join(path.dirname(directory),`${path.basename(directory)}.html`);
        const parts=await readdir(directory);
        if(!await exists(sibling)||!parts.includes('__next._full.txt')||!parts.some(name=>name.endsWith('.__PAGE__.txt')))throw Error(`Native-anchor RSC segments incomplete: ${rel}`);
        treeSegments.push({source:file,bytes:(await readFile(file)).length});
      }
      if(relative&&!entry.name.startsWith('__next.')&&entry.name.endsWith('.txt')){
        const target=path.join(directory,entry.name.slice(0,-4),'__next._full.txt');
        if(!await exists(target))continue;
        const [left,right]=await Promise.all([readFile(file),readFile(target)]);
        if(!left.equals(right))throw Error(`RSC export mismatch: ${rel}`);
        duplicates.push({source:file,bytes:left.length,parent:relative});
      }
    }
  }
  await visit(root);
  const extra=[...new Set(duplicates.map(item=>item.parent).filter(parent=>!['en/prompts','zh-CN/prompts'].includes(parent)))].sort()
    .map(parent=>`/${parent}/:slug.txt /${parent}/:slug/__next._full.txt 200`);
  const redirectPath=path.join(root,'_redirects');
  let existing='';try{existing=await readFile(redirectPath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const previous=existing.split('\n').filter(line=>line.endsWith(' 200'));
  const rules=[...new Set([...previous,...PROMPT_RSC_REWRITES,...extra])];
  if(rules.length>100)throw Error('Pages dynamic redirect limit exceeded');
  const added=rules.filter(rule=>!existing.split('\n').includes(rule));
  if(added.length)await writeFile(redirectPath,existing+(existing&&!existing.endsWith('\n')?'\n':'')+added.join('\n')+'\n');
  // Validate every pair and write compatibility rules before removing files.
  for(const item of [...duplicates,...treeSegments])await unlink(item.source);
  return {removed:duplicates.length,treeRemoved:treeSegments.length,savedBytes:[...duplicates,...treeSegments].reduce((sum,item)=>sum+item.bytes,0),rewrites:rules};
}
