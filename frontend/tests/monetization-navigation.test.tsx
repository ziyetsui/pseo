import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {createGitBetaCatalog} from '../src/lib/catalog/git-beta';
import {createFixtureCatalog} from '../src/lib/catalog/fixture';
import {MonetizationPage,MonetizationBand,MonetizationRelated} from '../src/components/Monetization';
import {monetizationGroups,monetizationScenarios,monetizationEntries,monetizationPaths} from '../src/lib/catalog/monetization';
import {footerNavigation,libraryIndex} from '../src/site/navigation';
import {catalogPaths} from '../src/site/routes';
const c=createGitBetaCatalog('zh-CN');
it('adds five shared footer columns and keeps complete scene navigation',()=>{
 const columns=footerNavigation(c);expect(columns.map(g=>g.id)).toEqual(['browse','models','tasks','styles','monetization']);
 expect(columns[4]!.entries.length).toBeLessThanOrEqual(6);
 const hrefs=libraryIndex(c).routes;for(const path of monetizationPaths(c))expect(hrefs).toContain(path);
 for(const path of monetizationPaths(c))expect(catalogPaths(c)).toContain(path);
});
it('server-renders meaningful group and scenario pages with original detail URLs',()=>{
 const g=monetizationGroups(c)[0]!,s=monetizationScenarios(c,g.slug)[0]!;
 const group=parse(renderToStaticMarkup(<MonetizationPage catalog={c} group={g}/>));expect(group.querySelector('h1')?.text).toBe(g.label);expect(group.querySelector(`a[href="${s.href}"]`)).not.toBeNull();
 const scene=parse(renderToStaticMarkup(<MonetizationPage catalog={c} scenario={s}/>));expect(scene.querySelector('h1')?.text).toBe(s.label);
 const e=monetizationEntries(c,s.id)[0]!;expect(scene.querySelector(`a[href="${e.href}"]`)).not.toBeNull();
 expect(scene.text).toMatch(/直接适用|需要改编/);
});
it('connects homepage and details while hiding an unavailable projection',()=>{
 const band=parse(renderToStaticMarkup(<MonetizationBand catalog={c}/>));expect(band.querySelector('#monetization')).not.toBeNull();expect(band.querySelectorAll('[data-monetization-group]')).toHaveLength(8);
 const e=monetizationEntries(c)[0]!;expect(renderToStaticMarkup(<MonetizationRelated catalog={c} contentId={e.id}/>)).toContain('/monetization/');
 expect(renderToStaticMarkup(<MonetizationBand catalog={createFixtureCatalog('zh-CN')}/>)).toBe('');
});
