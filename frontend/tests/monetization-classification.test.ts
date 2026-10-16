import {it,expect} from 'vitest';
import {classifyRecord,positiveText} from '../scripts/prepare-monetization.mjs';
it('does not classify from negative prompt terms or background props',()=>{
 expect(positiveText('Create a mountain landscape. Negative prompt: womenswear product advertisement')).not.toContain('womenswear');
 const row={id:'plain',title:'Portrait',prompt:'A person in a cafe. Avoid logos, product advertising, shopping posts.',useCases:[],styles:[],subjects:[]};
 expect(classifyRecord(row).map((x:{slug:string})=>x.slug)).not.toContain('restaurant-marketing');
 expect(classifyRecord(row).map((x:{slug:string})=>x.slug)).not.toContain('xiaohongshu-shopping');
});
it('needs both narrative relationship and comic format for relationship comics',()=>{
 expect(classifyRecord({id:'wrong-title',title:'Relationship comic',prompt:'A single cinematic portrait of an elderly swordsman.',useCases:[],styles:[],subjects:[]}).map((x:{slug:string})=>x.slug)).not.toContain('relationship-comics');
});
it('recognizes specific garment commerce without tagging every portrait',()=>{
 const row={id:'dress',title:'Dress product',prompt:'Create an ecommerce catalog showing a summer womenswear dress with a full-body model and product price.',useCases:[],styles:[],subjects:[]};
 expect(classifyRecord(row).map((x:{slug:string})=>x.slug)).toContain('womenswear-selling');
});
it('does not treat location as cat or preserved hairstyle as a salon deliverable',()=>{
 const row={id:'human',title:'Human portrait',prompt:'Create a portrait at a city location. Preserve the hairstyle and eye color. Technical camera characteristics: smartphone lens.',useCases:[],styles:[],subjects:[]};
 const slugs=classifyRecord(row).map((x:{slug:string})=>x.slug);
 expect(slugs).not.toContain('pet-portraits');expect(slugs).not.toContain('beauty-services');expect(slugs).not.toContain('product-detail-images');
});
it('excludes real background-cosmetics, livestream UI and non-sales comic blog cases',async()=>{
 const {createGitBetaCatalog}=await import('../src/lib/catalog/git-beta');const c=createGitBetaCatalog('en');
 for(const [id,slugs]of [
  ['prm_414ab3308f9c71150e5e4b56f4b666e3',['beauty-recommendations']],
  ['prm_2169d5c2e768245b22e20421f52fe9a1',['ecommerce-advertising','avatar-portraits']],
  ['prm_3cab81ced0cd0b54a5f5fcaf31098f3c',['sales-landing-pages']],
 ] as const){const row=c.prompts.find(p=>p.id===id)!;for(const slug of slugs)expect(classifyRecord(row).map(e=>e.slug)).not.toContain(slug);}
});
it('ignores JSON negative_prompt properties as well as prose negatives',()=>{
 expect(positiveText('{"prompt":"a mountain landscape","negative_prompt":"womenswear product advertisement"}')).not.toContain('womenswear');
});
