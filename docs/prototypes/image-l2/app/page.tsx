import {createFixtureCatalog} from '@/lib/catalog/fixture';
import {Harness} from '../harness';
export default async function Page({searchParams}:{searchParams:Promise<{v?:string}>}){
const {v}=await searchParams, value=Number(v)||1;
const catalog=createFixtureCatalog('zh-CN');
const rows=catalog.prompts.filter(p=>p.kind==='image').map(p=>({...p,href:`http://127.0.0.1:3000${p.href}`}));
return <Harness rows={rows} initial={value>=1&&value<=4?value-1:0}/>;
}
