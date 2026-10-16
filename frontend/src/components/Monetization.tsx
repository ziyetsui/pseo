import type {Catalog} from '@/lib/catalog/types';
import {monetizationGroups,monetizationScenarios,monetizationEntries,monetizationForContent,monetizationFit,type MonetizationRef} from '@/lib/catalog/monetization';
import {SiteHeader,SiteFooter} from './Chrome';
import {BrowseRail} from './BrowseRail';
import {MonetizationResults} from './MonetizationResults';
import '@/styles/monetization.css';
const title=(c:Catalog)=>c.locale==='zh-CN'?'按变现浏览':'Browse by monetization';
function Card({item,zh}:{item:MonetizationRef;zh:boolean}){return <a className="tile" href={item.href} data-monetization-group={item.id}><span className="th">{item.cover?<img src={item.cover} alt={item.label} width={640} height={400} loading="lazy"/>:<span className="media-fallback">{zh?'暂无预览':'No preview supplied'}</span>}</span><span className="tb"><h3>{item.label}</h3><p>{item.count} {zh?'个案例':'cases'}</p></span></a>;}
export function MonetizationBand({catalog:c}:{catalog:Catalog}){
 const groups=monetizationGroups(c);if(!groups.length)return null;const zh=c.locale==='zh-CN';
 return <section className="sec browse-band monetization" id="monetization"><div className="wrap"><BrowseRail heading={<h2>{title(c)}</h2>} label={title(c)}>{groups.map(g=><Card item={g} zh={zh} key={g.id}/>)}</BrowseRail><p className="monet-all"><a href={`/${c.locale}/prompts/monetization`}>{zh?'查看全部变现场景 →':'Explore all monetization scenes →'}</a></p></div></section>;
}
export function MonetizationPage({catalog:c,group,scenario}:{catalog:Catalog;group?:MonetizationRef;scenario?:MonetizationRef}){
 const zh=c.locale==='zh-CN',root=`/${c.locale}/prompts/monetization`,parent=scenario?monetizationGroups(c).find(g=>g.id===scenario.groupId):null;
 const heading=scenario?.label??group?.label??title(c),current=scenario?.href??group?.href??root;
 const cards=group?monetizationScenarios(c,group.slug):monetizationGroups(c);
 return <div className="prototype-deck website-aligned monetization"><div className="v4 taste"><SiteHeader bilingual currentHref={current} level="deck" locale={c.locale}/><main id="main"><div className="wrap">
  <nav className="monet-breadcrumb" aria-label={zh?'面包屑导航':'Breadcrumb'}><a href={`/${c.locale}/prompts`}>{zh?'提示词库':'Prompt library'}</a><span> / </span>{current===root?<span>{heading}</span>:<a href={root}>{zh?'变现场景':'Monetization scenes'}</a>}{parent&&<><span> / </span><a href={parent.href}>{parent.label}</a></>}{current!==root&&<><span> / </span><span>{heading}</span></>}</nav>
  <header className="hero"><p className="eyebrow">{zh?'从创作到交付':'From creation to delivery'}</p><h1>{heading}</h1><p className="lede">{scenario?.description??group?.description??(zh?'按实际交付用途，发现可复用的图片、视频和网站案例。':'Find reusable image, video and website cases by practical deliverable.')}</p><p>{zh?'“直接适用”表示创作目标相符；“需要改编”会说明调整方向。这里展示用途参考，不代表收益证明。':'Direct fit means the creative goal matches. Adaptable cases include changes to make. These are use-case references, not evidence of earnings.'}</p></header>
  {scenario?<MonetizationResults entries={monetizationEntries(c,scenario.id)} locale={c.locale}/>:<><div className="monet-grid monet-categories">{cards.map(item=><div key={item.id}><Card item={item} zh={zh}/><p className="monet-description">{item.description}</p></div>)}</div>{!group&&<section className="sec"><h2>{zh?'全部细分场景':'All specific scenes'}</h2><div className="monet-directory">{cards.map(g=><section key={g.id}><h3><a href={g.href}>{g.label}</a></h3><ul>{monetizationScenarios(c,g.slug).map(s=><li key={s.id}><a href={s.href}>{s.label}</a> · {s.count}</li>)}</ul></section>)}</div></section>}</>}
 </div></main><SiteFooter catalog={c} level="deck"/></div></div>;
}
export function MonetizationRelated({catalog:c,contentId}:{catalog:Catalog;contentId:string}){
 const scenes=monetizationForContent(c,contentId);if(!scenes.length)return null;const zh=c.locale==='zh-CN';
 return <section className="monet-related" aria-label={zh?'相关变现场景':'Related monetization scenes'}><h3>{zh?'可用于哪些变现场景':'Monetization use cases'}</h3><ul>{scenes.map(s=>{const e=monetizationFit(c,s.id,contentId)!;return <li key={s.id}><a href={s.href}>{s.label}</a><span> · {e.fit==='direct'?(zh?'直接适用':'Direct fit'):(zh?'需要改编':'Adaptation needed')}</span>{e.notes&&<p>{e.notes}</p>}</li>;})}</ul></section>;
}
