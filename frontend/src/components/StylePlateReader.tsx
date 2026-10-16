'use client';
import { generationHref } from '@/lib/cta/generation-url';
import { CompactIndex } from './CompactIndex';
import { interfaceLocale, uiText, text, promptCount, sourceLanguage, promptLanguage } from '@/lib/i18n/text';

import type { Axis, Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { PromptWords, usePromptExplorer, facetOptions } from './Filters';
import { PromptMedia } from './PromptMedia';
import { generationLabel } from './generation-label';
import { promptWords } from '@/lib/cta/sign-in-gate';
import { SignInGate } from '@/components/SignInGate';

/** The fixed axis owns the page; the other four filter within it. */
const axesFor = (fixed: PlateAxis): Axis[] => fixed === 'style' ? ['model', 'useCase', 'technique', 'subject'] : fixed === 'useCase' ? ['model', 'style', 'technique', 'subject'] : ['model', 'useCase', 'style', 'subject'];
export type PlateAxis = 'style' | 'useCase' | 'monetization';
/** Monetization plates carry their fit and scene evidence in the caption. */
export type PlateFit = { fit: 'direct' | 'adaptable'; scenes: string; note: string };
const pad = (n:number) => String(n).padStart(2,'0');
function plateFrames(prompt: Prompt) {
  const video = prompt.media.find(m => m.kind === 'video');
  if (video) return [{...prompt, media:[video]}];
  const images = prompt.media.filter(m => m.kind === 'image').slice(0,3);
  if (images.length) return images.map(m => ({...prompt,img:m.src,media:[m]}));
  return prompt.img ? [prompt] : [];
}
export function StylePlateReader({ catalog, style, axis = 'style', fits }: { catalog: Catalog; style: Ref; axis?: PlateAxis; fits?: Record<string, PlateFit> }) {
  const uiLocale = interfaceLocale(catalog);
  const axes = axesFor(axis), task = axis === 'useCase', scene = axis === 'monetization';
  const kindEn = task ? 'task' : scene ? 'scene' : 'style', kindZh = task ? '任务' : scene ? '场景' : '风格';
  const explorer = usePromptExplorer(catalog), rows = explorer.rows;
  return <><div className="ctrl"><div className="wrap"><div className="bar">
    <form className="search" role="search" onSubmit={e=>e.preventDefault()}><label className="vh" htmlFor="style-search">{text(uiLocale, `Search ${style.label} prompts`, `搜索${style.label}提示词`)}</label><input id="style-search" type="search" maxLength={200} value={explorer.q} placeholder={task || scene ? text(uiLocale, `Search this ${kindEn}\u2026`, `搜索此${kindZh}\u2026`) : uiText(uiLocale, "Search this style\u2026")} onChange={e=>explorer.setQuery(e.target.value)} /></form>
    <div className="scroller" role="group" aria-label={task || scene ? text(uiLocale, `Filter within this ${kindEn}`, `在此${kindZh}内筛选`) : uiText(uiLocale, "Filter within this style")}>{axes.flatMap(axis=>facetOptions(catalog.prompts,axis,true).filter((ref,i)=>i<3||explorer.selected(axis,ref.slug)).map(ref=><button className="chip" type="button" key={`${axis}-${ref.id}`} aria-pressed={explorer.selected(axis,ref.slug)} onClick={()=>explorer.toggle(axis,ref.slug)}>{ref.label} <small>{ref.count}</small></button>))}</div>
    {explorer.active && <button className="chip clear" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}
  </div><span className="vh" role="status">{text(uiLocale, `${rows.length} of ${catalog.prompts.length} ${style.label} ${catalog.prompts.length === 1 ? 'prompt' : 'prompts'}`, `${rows.length} / ${catalog.prompts.length} 条${style.label}提示词`)}</span></div></div>
  <div className="style-results" data-style={task || scene ? undefined : style.slug} data-task={task ? style.slug : undefined} data-monetization={scene ? style.slug : undefined}>
    {!rows.length ? <section className="wrap empty-wrap"><div className="empty" role="status">{catalog.prompts.length ? <><b>{text(uiLocale, `No ${style.label} prompt matches those filters.`, `没有符合筛选条件的${style.label}提示词。`)}</b><p>{text(uiLocale, `Clear the filters to return to ${catalog.prompts.length === 1 ? 'the' : 'all'} ${promptCount('en', catalog.prompts.length)} in this ${kindEn}.`, `清除筛选，查看此${kindZh}中的全部 ${catalog.prompts.length} 条提示词。`)}</p><button className="btn pri" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button></> : <><b>{text(uiLocale, `No ${style.label} prompts in the library yet.`, `提示词库中暂无${style.label}提示词。`)}</b><p>{task || scene ? text(uiLocale, `Explore another ${kindEn} or browse the library.`, `探索其他${kindZh}，或浏览提示词库。`) : uiText(uiLocale, "Explore another style or browse the library.")}</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>{uiText(uiLocale, "Browse all prompts")}</a></>}</div></section> : <>
      <section className="wrap lopwrap" id="style-index"><h2>{uiText(uiLocale, "List of plates")}</h2><CompactIndex uiLocale={uiLocale} list="div" listClassName="lop" label={uiText(uiLocale, "List of plates")}>{rows.map((p,i)=><a key={p.id} href={`#plate-${p.id}`}><span className="fno">{pad(i+1)}</span><span className="t" lang={sourceLanguage(p.title)}>{p.title}</span></a>)}</CompactIndex></section>
      <section className="wrap plates"><h2 className="vh">{uiText(uiLocale, "Plates")}</h2>{rows.map((p,i)=>{
        const frames=plateFrames(p), count=p.media.length || (p.img ? 1 : 0), fit=fits?.[p.id];
        return <figure className={`plate${i%2?' verso':''}`} id={`plate-${p.id}`} key={p.id} data-prompt-id={p.id} data-lg-row="" data-lg-chars={p.prompt.length} data-lg-words={promptWords(p.prompt)} data-monetization-case={fit ? p.id : undefined}><div className="well">{frames.length ? <div className={`frames${frames.length>1?' multi':''}`}>{frames.map((frame,k)=><span className="mount" key={frame.media[0]?.id ?? k}><PromptMedia uiLocale={uiLocale} prompt={frame} width={1200} height={900} /></span>)}</div> : <p className="textplate" lang={p.language}><PromptWords text={p.prompt} /></p>}</div>
          <figcaption className="cap"><p className="fig">{text(uiLocale, "Plate", "图版")} {pad(i+1)}{frames.length>1?` a–${'abc'.charAt(frames.length-1)}`:''}</p><h3 lang={sourceLanguage(p.title)}><a href={p.href}>{p.title}</a></h3><dl>
            <dt>{p.reconstruction && p.models.length > 0 ? text(uiLocale,"Reproduction model","复现模型") : uiText(uiLocale, "Medium")}</dt><dd>{p.models.map(m=>m.label).join(', ') || uiText(uiLocale, "no model named")}</dd>
            <dt>{p.reconstruction ? text(uiLocale, "Reference image", "参考图作者") : uiText(uiLocale, "Credit")}</dt><dd><a href={p.source.url} target="_blank" rel="nofollow noopener noreferrer">{p.handle || uiText(uiLocale, "Source post")} ↗</a></dd>
            <dt>{uiText(uiLocale, "Extent")}</dt><dd>{count ? text(uiLocale, `${count} media ${count===1?'item':'items'}`, `${count} 个媒体`) : uiText(uiLocale, "Text only")}{p.likes!==null?text(uiLocale, ` · ${p.likes.toLocaleString('en-US')} likes`, ` · ${p.likes.toLocaleString('zh-CN')} 次点赞`):''}</dd>
            <dt>{uiText(uiLocale, "Subject")}</dt><dd>{p.subjects[0]?.label || p.useCases[0]?.label || uiText(uiLocale, "unclassified")}</dd>
            {fit && <><dt>{text(uiLocale, "Scene", "变现场景")}</dt><dd>{fit.scenes}</dd><dt>{text(uiLocale, "Suitability", "适用方式")}</dt><dd>{fit.fit === 'direct' ? text(uiLocale, "Direct fit", "直接适用") : text(uiLocale, "Adaptation needed", "需要改编")}</dd></>}
          </dl>{fit?.note && <p className="monet-note">{fit.note}</p>}{catalog.mode === 'git-beta' && <p className="eyebrow">{promptLanguage(uiLocale, p)}</p>}<p className="wall" lang={p.language} data-monetization-prompt={fit ? "" : undefined}><PromptWords text={p.prompt} /></p><div className="rr"><a className="btn pri" href={generationHref(p.prompt)} target="_blank" rel="noopener noreferrer">{generationLabel(p.kind, uiLocale)}</a><a className="btn" href={p.href}>{uiText(uiLocale, "Full record →")}</a></div><a className="plate-index-link" href="#style-index">{uiText(uiLocale, "Back to the index ↑")}</a></figcaption>
        </figure>;
      })}</section>
    </>}
  </div><SignInGate uiLocale={uiLocale} /></>;
}
