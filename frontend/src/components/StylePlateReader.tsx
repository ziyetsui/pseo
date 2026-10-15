'use client';
import { interfaceLocale, uiText, text, promptCount, sourceLanguage, originalLanguage } from '@/lib/i18n/text';

import type { Axis, Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { PromptWords, usePromptExplorer, facetOptions } from './Filters';
import { PromptMedia } from './PromptMedia';
import { generationLabel } from './generation-label';
import { promptWords } from '@/lib/cta/sign-in-gate';
import { SignInGate } from '@/components/SignInGate';

const axes: Axis[] = ['model', 'useCase', 'technique', 'subject'];
const pad = (n:number) => String(n).padStart(2,'0');
function plateFrames(prompt: Prompt) {
  const video = prompt.media.find(m => m.kind === 'video');
  if (video) return [{...prompt, media:[video]}];
  const images = prompt.media.filter(m => m.kind === 'image').slice(0,3);
  if (images.length) return images.map(m => ({...prompt,img:m.src,media:[m]}));
  return prompt.img ? [prompt] : [];
}
export function StylePlateReader({ catalog, style }: { catalog: Catalog; style: Ref }) {
  const uiLocale = interfaceLocale(catalog);
  const explorer = usePromptExplorer(catalog), rows = explorer.rows;
  return <><div className="ctrl"><div className="wrap"><div className="bar">
    <form className="search" role="search" onSubmit={e=>e.preventDefault()}><label className="vh" htmlFor="style-search">{text(uiLocale, `Search ${style.label} prompts`, `搜索${style.label}提示词`)}</label><input id="style-search" type="search" maxLength={200} value={explorer.q} placeholder={uiText(uiLocale, "Search this style\u2026")} onChange={e=>explorer.setQuery(e.target.value)} /></form>
    <div className="scroller" role="group" aria-label={uiText(uiLocale, "Filter within this style")}>{axes.flatMap(axis=>facetOptions(catalog.prompts,axis,true).filter((ref,i)=>i<3||explorer.selected(axis,ref.slug)).map(ref=><button className="chip" type="button" key={`${axis}-${ref.id}`} aria-pressed={explorer.selected(axis,ref.slug)} onClick={()=>explorer.toggle(axis,ref.slug)}>{ref.label} <small>{ref.count}</small></button>))}</div>
    {explorer.active && <button className="chip clear" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}
  </div><span className="vh" role="status">{text(uiLocale, `${rows.length} of ${catalog.prompts.length} ${style.label} ${catalog.prompts.length === 1 ? 'prompt' : 'prompts'}`, `${rows.length} / ${catalog.prompts.length} 条${style.label}提示词`)}</span></div></div>
  <div className="style-results" data-style={style.slug}>
    {!rows.length ? <section className="wrap empty-wrap"><div className="empty" role="status">{catalog.prompts.length ? <><b>{text(uiLocale, `No ${style.label} prompt matches those filters.`, `没有符合筛选条件的${style.label}提示词。`)}</b><p>{text(uiLocale, `Clear the filters to return to ${catalog.prompts.length === 1 ? 'the' : 'all'} ${promptCount('en', catalog.prompts.length)} in this style.`, `清除筛选，查看此风格中的全部 ${catalog.prompts.length} 条提示词。`)}</p><button className="btn pri" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button></> : <><b>{text(uiLocale, `No ${style.label} prompts in the library yet.`, `提示词库中暂无${style.label}提示词。`)}</b><p>{uiText(uiLocale, "Explore another style or browse the library.")}</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>{uiText(uiLocale, "Browse all prompts")}</a></>}</div></section> : <>
      <section className="wrap lopwrap" id="style-index"><h2>{uiText(uiLocale, "List of plates")}</h2><nav className="lop" aria-label={uiText(uiLocale, "List of plates")}>{rows.map((p,i)=><a key={p.id} href={`#plate-${p.id}`}><span className="fno">{pad(i+1)}</span><span className="t" lang={sourceLanguage(p.title)}>{p.title}</span></a>)}</nav></section>
      <section className="wrap plates"><h2 className="vh">{uiText(uiLocale, "Plates")}</h2>{rows.map((p,i)=>{
        const frames=plateFrames(p), count=p.media.length || (p.img ? 1 : 0);
        return <figure className={`plate${i%2?' verso':''}`} id={`plate-${p.id}`} key={p.id} data-prompt-id={p.id} data-lg-row="" data-lg-chars={p.prompt.length} data-lg-words={promptWords(p.prompt)}><div className="well">{frames.length ? <div className={`frames${frames.length>1?' multi':''}`}>{frames.map((frame,k)=><span className="mount" key={frame.media[0]?.id ?? k}><PromptMedia uiLocale={uiLocale} prompt={frame} width={1200} height={900} /></span>)}</div> : <p className="textplate" lang={p.language}><PromptWords text={p.prompt} /></p>}</div>
          <figcaption className="cap"><p className="fig">{text(uiLocale, "Plate", "图版")} {pad(i+1)}{frames.length>1?` a–${'abc'.charAt(frames.length-1)}`:''}</p><h3 lang={sourceLanguage(p.title)}><a href={p.href}>{p.title}</a></h3><dl>
            <dt>{uiText(uiLocale, "Medium")}</dt><dd>{p.models.map(m=>m.label).join(', ') || uiText(uiLocale, "no model named")}</dd>
            <dt>{uiText(uiLocale, "Credit")}</dt><dd><a href={p.source.url} target="_blank" rel="nofollow noopener noreferrer">{p.handle || uiText(uiLocale, "Source post")} ↗</a></dd>
            <dt>{uiText(uiLocale, "Extent")}</dt><dd>{count ? text(uiLocale, `${count} media ${count===1?'item':'items'}`, `${count} 个媒体`) : uiText(uiLocale, "Text only")}{p.likes!==null?text(uiLocale, ` · ${p.likes.toLocaleString('en-US')} likes`, ` · ${p.likes.toLocaleString('zh-CN')} 次点赞`):''}</dd>
            <dt>{uiText(uiLocale, "Subject")}</dt><dd>{p.subjects[0]?.label || p.useCases[0]?.label || uiText(uiLocale, "unclassified")}</dd>
          </dl>{catalog.mode === 'git-beta' && <p className="eyebrow">{originalLanguage(uiLocale, p.language, p.originalPrompt !== undefined)}</p>}<p className="wall" lang={p.language}><PromptWords text={p.prompt} /></p><div className="rr"><a className="btn pri" href={p.href}>{generationLabel(p.kind, uiLocale)}</a><a className="btn" href={p.href}>{uiText(uiLocale, "Full record →")}</a></div><a className="plate-index-link" href="#style-index">{uiText(uiLocale, "Back to the index ↑")}</a></figcaption>
        </figure>;
      })}</section>
    </>}
  </div><SignInGate uiLocale={uiLocale} /></>;
}
