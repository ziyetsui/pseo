import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe,it,expect } from 'vitest';
import { libraryIndex,footerNavigation } from '@/site/navigation';
import { LibraryIndex } from '@/components/LibraryIndex';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteEntries } from '@/lib/catalog/website';
import { websiteViews } from '@/lib/catalog/website-views';
import { catalogPaths } from '@/site/routes';
const catalog=createGitBetaCatalog('zh-CN');
describe('shared Footer IA and complete Library index',()=>{
  it('includes all real views, Website cases and Prompt routes without duplicate route identities',()=>{
    const index=libraryIndex(catalog),paths=new Set(catalogPaths(catalog));
    for(const row of [...catalog.prompts,...websiteEntries(catalog),...websiteViews(catalog)])expect(index.routes).toContain(row.href);
    expect(new Set(index.routes).size).toBe(index.routes.length);
    expect(index.routes.every(href=>paths.has(href)&&!href.includes('?'))).toBe(true);
    expect(index.collections.find(group=>group.id==='website-details')?.entries).toHaveLength(225);
    expect(index.groups).toEqual(footerNavigation(catalog));
  });
  it('renders the exact machine-readable route index and escapes source titles safely',()=>{
    const source={...catalog,prompts:catalog.prompts.map((row,index)=>index===0?{...row,title:'</script><script>alert(1)</script>'}:row)};
    const document=parse(renderToStaticMarkup(<LibraryIndex catalog={source} />));
    const scripts=document.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.text)).toEqual(libraryIndex(source));
    expect(scripts[0]!.text).not.toContain('</script>');
  });
  it('uses exact graph case counts and never labels case-only projects as prompts',()=>{
    const groups=footerNavigation(catalog);
    const claude=groups.find(group=>group.id==='website-model')?.entries.find(entry=>entry.href.endsWith('/claude'));
    expect(claude?.count).toBe(28);expect(claude?.label).toBe('Claude · 28 cases');
    expect(groups.find(group=>group.id==='website-tool')?.entries).toHaveLength(21);
    expect(groups.find(group=>group.id==='website-use-case')?.entries).toHaveLength(6);
  });
});
