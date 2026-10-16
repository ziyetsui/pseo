'use client';
import {PromptWords} from './Filters';
import {generationHref} from '@/lib/cta/generation-url';
import {useEffect,useState} from 'react';
import type {MonetizationEntry} from '@/lib/catalog/monetization';
import type {Locale} from '@/lib/catalog/types';
export function MonetizationResults({entries,locale}:{entries:MonetizationEntry[];locale:Locale}){
 const zh=locale==='zh-CN',t=(en:string,cn:string)=>zh?cn:en;
 const [filters,setFilters]=useState({type:'',model:'',fit:''});const [limit,setLimit]=useState(24);
 useEffect(()=>{const read=()=>{const q=new URLSearchParams(location.search);setFilters({type:q.get('type')??'',model:q.get('model')??'',fit:q.get('fit')??''});setLimit(Math.max(24,Math.min(entries.length,Number(history.state?.monetizationLimit)||24)));};read();addEventListener('popstate',read);return()=>removeEventListener('popstate',read);},[entries.length]);
 const change=(key:string,value:string)=>{const next={...filters,[key]:value};const url=new URL(location.href);for(const [k,v]of Object.entries(next))if(v)url.searchParams.set(k,v);else url.searchParams.delete(k);history.pushState({...history.state,monetizationLimit:24},'',url);setFilters(next);setLimit(24);};
 const clear=()=>{const url=new URL(location.href);for(const k of ['type','model','fit'])url.searchParams.delete(k);history.pushState({...history.state,monetizationLimit:24},'',url);setFilters({type:'',model:'',fit:''});setLimit(24);};
 const filtered=entries.filter(e=>(!filters.type||e.kind===filters.type)&&(!filters.model||e.models.some(m=>m.slug===filters.model))&&(!filters.fit||e.fit===filters.fit));
 const models=[...new Map(entries.flatMap(e=>e.models).map(m=>[m.slug,m])).values()];
 const fitLabel=(fit:string)=>fit==='direct'?t('Direct fit','直接适用'):t('Adaptation needed','需要改编');
 return <>
  <form className="monet-filters" onSubmit={e=>e.preventDefault()} aria-label={t('Filter monetization cases','筛选变现场景案例')}>
   <label>{t('Content type','内容类型')}<select value={filters.type} onChange={e=>change('type',e.target.value)}><option value="">{t('All types','全部类型')}</option>{([['image','Images','图片'],['video','Videos','视频'],['website','Websites','网站'],['text','Text','文本'],['other','Other','其他']] as const).filter(([value])=>entries.some(e=>e.kind===value)).map(([value,en,cn])=><option key={value} value={value}>{t(en,cn)}</option>)}</select></label>
   <label>{t('Model','模型')}<select value={filters.model} onChange={e=>change('model',e.target.value)}><option value="">{t('All models','全部模型')}</option>{models.map(m=><option value={m.slug} key={m.slug}>{m.label}</option>)}</select></label>
   <label>{t('Suitability','适用方式')}<select value={filters.fit} onChange={e=>change('fit',e.target.value)}><option value="">{t('All cases','全部案例')}</option><option value="direct">{fitLabel('direct')}</option><option value="adaptable">{fitLabel('adaptable')}</option></select></label>
   <button type="button" className="btn" onClick={clear}>{t('Clear filters','清除筛选')}</button>
  </form>
  <p className="monet-count" aria-live="polite">{t(`${filtered.length} cases · ${filtered.filter(e=>e.fit==='direct').length} direct · ${filtered.filter(e=>e.fit==='adaptable').length} adaptable`,`${filtered.length} 个案例 · ${filtered.filter(e=>e.fit==='direct').length} 个直接适用 · ${filtered.filter(e=>e.fit==='adaptable').length} 个需要改编`)}</p>
  {!filtered.length&&<p className="lede">{t('No cases match these filters. Clear them to see the scene again.','没有符合这些条件的案例。清除筛选可查看此场景的全部案例。')}</p>}
  <div className="monet-grid">{filtered.slice(0,limit).map(e=><article className="monet-case" key={e.key} data-monetization-case={e.key}>
   <a href={e.href} className="monet-image">{e.cover?<img src={e.cover} alt={e.title} width={640} height={400} loading="lazy"/>:<span>{t('No preview supplied','暂无预览')}</span>}</a>
   <div className="monet-body"><p className="eyebrow">{fitLabel(e.fit)}</p><h2><a href={e.href}>{e.title}</a></h2><p>{e.summary.slice(0,240)}</p>{e.notes&&<p className="monet-note">{e.notes}</p>}<p className="monet-credit">{e.attribution||t('Source author not named','来源未注明作者')}{e.reconstruction&&<> · {t('Reference image · site-authored reconstruction','参考图 · 站点拆解提示词')}</>}{e.siteAuthored&&<> · {t('Site-authored template','站点整理模板')}</>}</p>{e.prompt&&<details className="monet-prompt-details"><summary>{t('Read the complete prompt','阅读完整提示词')}</summary><pre className="monet-prompt" lang={e.language} data-monetization-prompt=""><PromptWords text={e.prompt}/></pre></details>}<div className="acts"><a className="btn pri" href={e.href}>{t('Explore this case →','查看案例 →')}</a>{e.prompt&&<a className="btn" data-generation-cta="" href={generationHref(e.prompt)} target="_blank" rel="noopener noreferrer">{t('Use this prompt ↗','使用提示词 ↗')}</a>}{e.sourceUrl&&<a className="btn" href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{t('Original source ↗','原始来源 ↗')}</a>}</div></div>
  </article>)}</div>
  {limit<filtered.length&&<button type="button" className="btn monet-more" onClick={()=>{const next=limit+24;history.replaceState({...history.state,monetizationLimit:next},'',location.href);setLimit(next);}}>{t(`Show more · ${filtered.length-limit} remaining`,`查看更多 · 还剩 ${filtered.length-limit} 个`)}</button>}
  <details className="monet-index"><summary>{t('Complete index of matching cases','符合条件的完整案例目录')} · {filtered.length}</summary><ol>{filtered.map(e=><li key={e.key}><a href={e.href}>{e.title}</a> · {fitLabel(e.fit)}</li>)}</ol></details>
 </>;
}
