import type {Locale} from '@/lib/catalog/types';
/** Product copy only. Never pass source prompt bodies to this function. */
export function text(locale:Locale,english:string,chinese:string):string{return locale==='zh-CN'?chinese:english;}
export function promptCount(locale:Locale,count:number):string{return text(locale,`${count} ${count===1?'prompt':'prompts'}`,`${count} 条提示词`);}
export function caseCount(locale:Locale,count:number):string{return text(locale,`${count} ${count===1?'case':'cases'}`,`${count} 个案例`);}
