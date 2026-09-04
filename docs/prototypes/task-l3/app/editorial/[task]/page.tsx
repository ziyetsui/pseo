import {notFound} from 'next/navigation';
import {materials} from '../../../materials';
import {EditorialHarness} from '../../../editorial/harness';
export default async function Page({params,searchParams}:{params:Promise<{task:string}>;searchParams:Promise<{v?:string}>}){const {task}=await params,{v}=await searchParams,catalog=materials(),ref=catalog.useCases.find(r=>r.slug===task);if(!ref)notFound();const n=Number(v)||1;return <EditorialHarness catalog={catalog} task={ref} initial={Number.isInteger(n)&&n>=1&&n<=4?n-1:0}/>}
