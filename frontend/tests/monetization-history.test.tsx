// @vitest-environment jsdom
import {afterEach,it,expect} from 'vitest';
import {render,waitFor,cleanup,fireEvent} from '@testing-library/react';
import {MonetizationResults} from '../src/components/MonetizationResults';
import type {MonetizationEntry} from '../src/lib/catalog/monetization';
afterEach(cleanup);
const entries:MonetizationEntry[]=Array.from({length:60},(_,i)=>({id:`case-${i}`,key:`case-${i}`,title:`Case ${i}`,summary:'A real case in this scene',href:`/en/prompts/case-${i}`,cover:'',kind:'image',models:[],sourceUrl:'https://example.com/source',prompt:'A complete editable image prompt.',language:'en',attribution:'Source author',reconstruction:false,siteAuthored:false,fit:'adaptable',notes:'Adapt the subject.'}));
it('restores expanded results when revisiting a scene from a later detail',async()=>{
 history.replaceState({monetizationLimit:48},'', '/en/prompts/monetization/creator-content/wechat-covers');
 const root=render(<MonetizationResults entries={entries} locale="en"/>);
 await waitFor(()=>expect(root.container.querySelectorAll('[data-monetization-case]')).toHaveLength(48));
 fireEvent.click(root.getByRole('button',{name:/Show more/}));expect(history.state.monetizationLimit).toBe(72);
 history.replaceState({monetizationLimit:48},'', '/en/prompts/monetization/creator-content/wechat-covers');fireEvent.popState(window);
 await waitFor(()=>expect(root.container.querySelectorAll('[data-monetization-case]')).toHaveLength(48));
});
