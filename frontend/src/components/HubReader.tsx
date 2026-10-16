"use client";
import { generationHref } from '@/lib/cta/generation-url';
import { interfaceLocale, uiText, text, sourceLanguage, promptLanguage } from '@/lib/i18n/text';
import type { Locale } from '@/lib/catalog/types';
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type { Catalog, Prompt } from "@/lib/catalog/types";
import { generationLabel } from "@/components/generation-label";
import { promptWords } from "@/lib/cta/sign-in-gate";
import { SignInGate } from "@/components/SignInGate";
import { PromptMedia } from "@/components/PromptMedia";
import { mountCurrent } from "@/components/current-motion";
import { EmptyResults, Filters, PromptWords, SearchForm, usePromptExplorer } from "@/components/Filters";

const INITIAL_VISIBLE_PROMPTS = 54;

function MagneticField({ rows , uiLocale = 'en', bilingual = false}: { rows: Prompt[] ; uiLocale?: Locale; bilingual?:boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_PROMPTS);
  const visibleRows = rows.slice(0, visibleCount);
  // Layout effect: remounting for "show more" must not paint a frame of the bare paragraph.
  useLayoutEffect(() => ref.current ? mountCurrent(ref.current) : undefined, [visibleCount]);
  return <div className="runbox" ref={ref}><p className="run"><canvas className="current-streamlines" aria-hidden="true" />{visibleRows.map(prompt => {
    const compactText = prompt.prompt.replace(/\s+/g, " ").trim();
    const excerpt = compactText.length > 900 ? `${compactText.slice(0, 900).replace(/\s\S*$/, "")}…` : compactText;
    return <Fragment key={prompt.id}><span className="item" data-entry="" data-kind={prompt.kind} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)}><button className="t" type="button" data-expand="" aria-expanded="false" aria-controls={`peek-${prompt.id}`}><span className="u" lang={sourceLanguage(prompt.title)}>{prompt.title}</span></button><span className="exp" id={`peek-${prompt.id}`} aria-label={prompt.title} inert>
      <span className="fig"><PromptMedia uiLocale={uiLocale} prompt={prompt} width={440} height={440} /></span><span><span className="txt" lang={prompt.language}><PromptWords text={excerpt} /></span><span className="meta">{bilingual && <span>{promptLanguage(uiLocale, prompt)}</span>}<a href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{prompt.handle || uiText(uiLocale, "unattributed")}</a><span>{prompt.models[0]?.label ?? uiText(uiLocale, "no model named")}</span>{prompt.kind === "video" && prompt.media[0]?.label ? <span>{prompt.media[0].label}{text(uiLocale, " video", " 视频")}</span> : prompt.media.length > 1 ? <span>{text(uiLocale, `${prompt.media.length} frames`, `${prompt.media.length} 帧`)}</span> : null}{prompt.likes !== null && <span><b>{prompt.likes.toLocaleString("en-US")}</b>{text(uiLocale, " likes", " 次点赞")}</span>}<span>{text(uiLocale, `${prompt.prompt.length.toLocaleString("en-US")} chars`, `${prompt.prompt.length.toLocaleString("zh-CN")} 个字符`)}</span></span><span className="acts"><a className="btn pri" href={generationHref(prompt.prompt)} target="_blank" rel="noopener noreferrer">{generationLabel(prompt.kind, uiLocale)}</a></span></span>
    </span></span>{" "}</Fragment>;
  })}</p><div className="title-window"><p className="meta" aria-live="polite">{text(uiLocale, `Showing ${visibleRows.length} of ${rows.length} matches`, `已展示 ${visibleRows.length} / ${rows.length} 条`)}</p>{visibleCount < rows.length && <button className="btn" type="button" onClick={() => setVisibleCount(count => count + 18)}>{text(uiLocale, "Show more prompts", "查看更多提示词")}</button>}{visibleCount > INITIAL_VISIBLE_PROMPTS && <button className="btn" type="button" onClick={() => setVisibleCount(INITIAL_VISIBLE_PROMPTS)}>{text(uiLocale, "Show fewer", "收起")}</button>}</div><noscript><ul>{rows.map(prompt => <li key={prompt.id}><a href={prompt.href}>{prompt.title} — {generationLabel(prompt.kind, uiLocale)}</a></li>)}</ul></noscript></div>;
}
export function HubReader({ catalog }: { catalog: Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  const explorer = usePromptExplorer(catalog);
  return <><section className="wrap lede"><p className="eyebrow" style={{ marginBottom: 14 }}>{uiText(uiLocale, "The library")}</p><h2 className="tier-ref">{text(uiLocale, "Everything, in the order it gets copied", "全部提示词，一览无余")}</h2><p className="formnote">{text(uiLocale, "Titles drift along a quiet current. Hover or focus a title to hold it still, then select it to explore the prompt.", "提示词标题随洋流缓缓漂动。停留或聚焦一条标题，让它停住；选择后原地查看内容。")}</p><SearchForm uiLocale={uiLocale} explorer={explorer} variant="hub" /><Filters uiLocale={uiLocale} prompts={catalog.prompts} explorer={explorer} variant="hub" limit={4} axes={[["model", "Model"], ["useCase", "Task"], ["style", "Style"], ["technique", "Technique"]]} /></section><section className="wrap" id="results"><h2 className="vh">{uiText(uiLocale, "All prompts")}</h2><p className="meta count" aria-live="polite"><b>{explorer.rows.length}</b>{text(uiLocale, ` of ${catalog.prompts.length} prompts matched`, ` / ${catalog.prompts.length} 条提示词`)}{explorer.active && <button className="btn" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}</p>{explorer.rows.length ? <MagneticField bilingual={catalog.mode === 'git-beta'} uiLocale={uiLocale} key={explorer.search} rows={explorer.rows} /> : <EmptyResults uiLocale={uiLocale} explorer={explorer} />}</section><SignInGate uiLocale={uiLocale} /></>;
}
