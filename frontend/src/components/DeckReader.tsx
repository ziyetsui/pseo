"use client";
import { generationHref } from '@/lib/cta/generation-url';
import { interfaceLocale, uiText, text, sourceLanguage, originalLanguage } from '@/lib/i18n/text';
import { useState } from "react";
import type { CSSProperties } from "react";
import type { Catalog, Prompt } from "@/lib/catalog/types";
import { isPromptCreator } from "@/lib/catalog/creator-match";
import { generationLabel } from "@/components/generation-label";
import { promptWords } from "@/lib/cta/sign-in-gate";
import { SignInGate } from "@/components/SignInGate";
import { PromptMedia } from "@/components/PromptMedia";
import { EmptyResults, Filters, PromptWords, SearchForm, usePromptExplorer } from "@/components/Filters";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Carousel({ prompts, catalog, contentType }: { prompts: Prompt[]; catalog: Catalog; contentType: "image" | "video" }) {
  const uiLocale = interfaceLocale(catalog);
  const [position, setPosition] = useState(0);
  const step = (direction: number) => setPosition(index => Math.min(prompts.length - 1, Math.max(0, index + direction)));
  return <div className="deckwrap" onKeyDown={event => {
    if (event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1);
  }}><div className="deck" tabIndex={0} role="group" aria-label={text(uiLocale, `${contentType === "image" ? "Image" : "Video"} prompt deck. Press the left and right arrow keys to step through it.`, "提示词卡片组。按左右方向键逐一浏览。")}>
    {prompts.map((prompt, index) => {
      const offset = index - position, depth = offset < 0 ? -3 : Math.min(offset, 4);
      const avatar = catalog.creators.find(creator => isPromptCreator(prompt, creator))?.avatarUrl;
      return <article className="dc" key={prompt.id} inert={offset !== 0} data-vis={offset >= 0 && offset <= 3 ? "" : undefined} data-top={offset === 0 ? "" : undefined} data-lg-current={offset === 0 ? "" : undefined} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)} style={{ "--o": depth, "--dz": offset >= 0 ? 30 - Math.min(offset, 4) : 0 } as CSSProperties}>
        <div className="media"><PromptMedia uiLocale={uiLocale} prompt={prompt} width={480} height={520} priority={index === 0} />{prompt.media.length > 1 && <span className="mb">{prompt.media.every(media => media.kind === "image") ? text(uiLocale, "PHOTO", "图片") : prompt.media.every(media => media.kind === "video") ? text(uiLocale, "VIDEO", "视频") : text(uiLocale, "MEDIA", "媒体")} · ×{prompt.media.length}</span>}</div><div className="side"><h3 lang={sourceLanguage(prompt.title)}><a href={prompt.href}>{prompt.title}</a></h3><div className="meta"><span>{avatar && <img className="av" src={avatar} alt="" width={20} height={20} loading="lazy" referrerPolicy="no-referrer" />}{prompt.handle || uiText(uiLocale, "unattributed")}</span>{prompt.likes !== null && <span><b>{compact.format(prompt.likes)}</b>{text(uiLocale, " likes", " 次点赞")}</span>}{prompt.saves !== null && <span><b>{compact.format(prompt.saves)}</b>{text(uiLocale, " saves", " 次收藏")}</span>}{prompt.highValue && <span className="hv">{uiText(uiLocale, "Popular")}</span>}<a href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{text(uiLocale, "View on ", "查看来源：")}{prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform || "X"} ↗</a></div><div className="tags">{[...prompt.models, ...prompt.styles, ...prompt.subjects, ...prompt.useCases].slice(0, 5).map(ref => <a className="tag" href={ref.href} key={`${ref.id}-${ref.href}`}>{ref.label}</a>)}</div>{catalog.mode === 'git-beta' && <p className="eyebrow">{originalLanguage(uiLocale, prompt.language, prompt.originalPrompt !== undefined)}</p>}<pre className="prompt" lang={prompt.language} tabIndex={0} aria-label={uiText(uiLocale, "Complete prompt text")}><PromptWords text={prompt.prompt} markClassName="ph" /></pre><div className="dcacts"><a className="btn primary" href={generationHref(prompt.prompt)} target="_blank" rel="noopener noreferrer">{generationLabel(prompt.kind, uiLocale)}</a>{prompt.models[0] && <a className="btn ghost" href={prompt.models[0].href}>{text(uiLocale, `All ${prompt.models[0].label} prompts →`, `${prompt.models[0].label} 的全部提示词 →`)}</a>}</div></div>
      </article>;
    })}</div><div className="dknav"><button className="btn" type="button" disabled={position === 0} onClick={() => step(-1)}>{uiText(uiLocale, "← Previous")}</button><button className="btn" type="button" disabled={position >= prompts.length - 1} onClick={() => step(1)}>{uiText(uiLocale, "Next →")}</button><p className="dkpos" aria-live="polite">{text(uiLocale, `${position + 1} of ${prompts.length}`, `${position + 1} / ${prompts.length}`)}</p><p className="dkhint">{uiText(uiLocale, "The stack behind the card is the rest of the set.")}</p></div></div>;
}
export function DeckReader({ catalog, contentType }: { catalog: Catalog; contentType: "image" | "video" }) {
  const uiLocale = interfaceLocale(catalog);
  const explorer = usePromptExplorer(catalog), title = contentType === "image" ? "Image" : "Video";
  const count = text(uiLocale, `${explorer.rows.length} of ${catalog.prompts.length} ${contentType} prompts${explorer.active ? " match" : ""}`, `${explorer.rows.length} / ${catalog.prompts.length} 条${contentType === "image" ? "图片" : "视频"}提示词`);
  return <><header className="hero"><p className="eyebrow">{text(uiLocale, `${title} gallery`, contentType === "image" ? "图片作品集" : "视频作品集")}</p><h1 className="tier-index">{text(uiLocale, `${title} prompts`, contentType === "image" ? "图片提示词" : "视频提示词")}</h1><p className="lede">{text(uiLocale, "One card at a time, big enough to read the prompt off it. The rest of the set is stacked behind — step through with the buttons or the arrow keys.", "每次查看一张卡片，留足空间阅读提示词。其余卡片叠放在后方，可用按钮或方向键逐一浏览。")}</p><SearchForm uiLocale={uiLocale} explorer={explorer} contentType={contentType} /><p className="count" style={{ marginTop: 12 }} aria-live="polite">{count}</p></header><section className="sec"><h2>{uiText(uiLocale, "Narrow the deck")}</h2><Filters uiLocale={uiLocale} prompts={catalog.prompts} explorer={explorer} axes={[["useCase", "Use case"], ["style", "Style"], ["subject", "Subject"]]} />{explorer.active && <button className="btn clear-filters" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}</section><section className="sec"><div className="sec-head"><h2>{uiText(uiLocale, "Editor's pick")}</h2><span className="count end">{count}</span></div>{explorer.rows.length ? <Carousel key={explorer.search} prompts={explorer.rows} catalog={catalog} contentType={contentType} /> : <EmptyResults uiLocale={uiLocale} explorer={explorer} title={text(uiLocale, `No ${contentType} prompts match those filters.`, "没有符合筛选条件的提示词。")} />}</section><SignInGate uiLocale={uiLocale} /></>;
}
