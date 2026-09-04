import { notFound } from 'next/navigation';
import { materials } from '../../../materials';
import { Harness } from '../../../harness';
export default async function Page({params,searchParams}:{params:Promise<{task:string}>;searchParams:Promise<{v?:string;model?:string}>}) {
 const {task} = await params, {v,model} = await searchParams, catalog=materials();
 const ref=catalog.useCases.find(r=>r.slug===task); if(!ref) notFound();
 const selected=Number(v)||1;
 const named=model&&catalog.models.some(r=>r.slug===model)?model:undefined;
 return <Harness catalog={catalog} task={ref} initial={selected>=1 && selected<=4 ? selected-1:0} initialModel={named}/>;
}
