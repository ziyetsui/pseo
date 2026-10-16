import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {createGitBetaCatalog} from '../src/lib/catalog/git-beta';
import {websiteEntries} from '../src/lib/catalog/website';
it('freezes all current bilingual content before adding a navigation projection',()=>{
 const en=createGitBetaCatalog('en'),zh=createGitBetaCatalog('zh-CN');
 expect(en.prompts.length).toBe(2038);expect(websiteEntries(en).length).toBe(224);
 writeFileSync('/tmp/ancher-monetization-catalog.json',JSON.stringify({revision:en.revision,prompts:en.prompts,websites:websiteEntries(en),zhPrompts:zh.prompts,zhWebsites:websiteEntries(zh)}));
});
