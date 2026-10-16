import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {HubBrowse} from '@/components/Browse';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
it.each(['zh-CN','en'] as const)('features a real website case instead of the filmed-monitor task preview in %s',locale=>{
 const catalog=createGitBetaCatalog(locale);
 const example=websiteEntries(catalog).find(entry=>entry.source.url==='https://x.com/SuzzaneKisia/status/2100085815330435375')!;
 expect(example).toBeDefined();
 const tile=parse(renderToStaticMarkup(<HubBrowse catalog={catalog}/>)).querySelector(`#tasks .tiles a[href="/${locale}/prompts/website"]`)!;
 expect(tile.getAttribute('href')).toBe(`/${locale}/prompts/website`);
 expect(tile.querySelector('img')?.getAttribute('src')).toBe(example.cover);
 expect(tile.querySelector('p')?.text).toBe(locale==='zh-CN'?'224 个案例':'224 cases');
 expect(tile.querySelector('h3')?.text).toBe(locale==='zh-CN'?'网站与开发':'Web design & development');
});
