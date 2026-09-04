import { createFixtureCatalog } from '@/lib/catalog/fixture';
export function materials(){
 const c=createFixtureCatalog('zh-CN');
 const publicRefs=<T extends {href:string}>(values:T[])=>values.map(r=>({...r,href:`http://127.0.0.1:3000${r.href}`}));
 const taskRefs=<T extends {slug:string;href:string}>(values:T[])=>values.map(r=>({...r,href:`/tasks/${r.slug}`}));
 return {...c,models:publicRefs(c.models),styles:publicRefs(c.styles),techniques:publicRefs(c.techniques),subjects:publicRefs(c.subjects),creators:publicRefs(c.creators),collections:publicRefs(c.collections),useCases:taskRefs(c.useCases),prompts:c.prompts.map(p=>({...p,href:`http://127.0.0.1:3000${p.href}`,useCases:taskRefs(p.useCases),models:publicRefs(p.models),styles:publicRefs(p.styles)}))};
}
