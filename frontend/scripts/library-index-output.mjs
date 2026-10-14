import { createHash } from 'node:crypto';
export function readLibraryIndex(document,revision) {
  const script=document?.querySelector('script#library-navigation-index');
  if(!script)throw new Error('Library index payload missing');
  const index=JSON.parse(script.text);
  if(index.schemaVersion!==1||index.locale!=='zh-CN'||index.revision!==revision||!Array.isArray(index.groups)||!Array.isArray(index.collections)||!Array.isArray(index.routes))throw new Error('Library index revision or schema mismatch');
  const entries=[...index.groups,...index.collections].flatMap(group=>{
    if(typeof group.id!=='string'||typeof group.title!=='string'||!Array.isArray(group.entries))throw new Error('Library index group invalid');
    return group.entries;
  });
  if(entries.some(entry=>typeof entry.id!=='string'||typeof entry.label!=='string'||!/^\/zh-CN\/prompts(?:\/[a-z0-9_/-]+)?$/.test(entry.href)))throw new Error('Library index target invalid');
  const expected=[...new Set(entries.map(entry=>entry.href))].sort();
  if(JSON.stringify(expected)!==JSON.stringify(index.routes))throw new Error('Library index route set mismatch');
  return index;
}
export function indexHash(bytes){return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;}
export function verifyLibraryIndex(documents,index,receipt){
  for(const href of index.routes)if(!documents.has(href))throw new Error('Library index route missing from export');
  for(const entry of [...receipt.publishedPrompts,...receipt.publishedWebsites,...receipt.publishedWebsiteViews])if(!index.routes.includes(entry.href))throw new Error('Published object missing from Library index');
  for(const view of receipt.publishedWebsiteViews)if(!index.groups.some(group=>group.entries.some(entry=>entry.href===view.href)))throw new Error('Website view missing from Library index navigation');
  for(const [href,document] of documents){
    if(!href.startsWith('/zh-CN/prompts'))continue;
    const links=new Set(document.querySelectorAll('footer a[href]').map(link=>link.getAttribute('href')));
    if(receipt.publishedWebsiteViews.length && !links.has('/zh-CN/prompts/website'))throw new Error(`Website Footer directory missing: ${href}`);
    if(document.querySelectorAll('footer .footnav a').length>7)throw new Error('Footer navigation exceeds compact limit');
    if(!links.has('/zh-CN/prompts/library-index'))throw new Error('Library index Footer link missing');
  }
}
