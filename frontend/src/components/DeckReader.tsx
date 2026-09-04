"use client";
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
  const [position, setPosition] = useState(0);
  const step = (direction: number) => setPosition(index => Math.min(prompts.length - 1, Math.max(0, index + direction)));
  return <div className="deckwrap" onKeyDown={event => {
    if (event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1);
  }}><div className="deck" tabIndex={0} role="group" aria-label={`${contentType === "image" ? "Image" : "Video"} prompt deck. Press the left and right arrow keys to step through it.`}>
    {prompts.map((prompt, index) => {
      const offset = index - position, depth = offset < 0 ? -3 : Math.min(offset, 4);
      const avatar = catalog.creators.find(creator => isPromptCreator(prompt, creator))?.avatarUrl;
      return <article className="dc" key={prompt.id} inert={offset !== 0} data-vis={offset >= 0 && offset <= 3 ? "" : undefined} data-top={offset === 0 ? "" : undefined} data-lg-current={offset === 0 ? "" : undefined} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)} style={{ "--o": depth, "--dz": offset >= 0 ? 30 - Math.min(offset, 4) : 0 } as CSSProperties}>
        <div className="media"><PromptMedia prompt={prompt} width={480} height={520} priority={index === 0} />{prompt.media.length > 1 && <span className="mb">{prompt.media.every(media => media.kind === "image") ? "PHOTO" : prompt.media.every(media => media.kind === "video") ? "VIDEO" : "MEDIA"} · ×{prompt.media.length}</span>}</div><div className="side"><h3 lang={prompt.locale}><a href={prompt.href}>{prompt.title}</a></h3><div className="meta"><span>{avatar && <img className="av" src={avatar} alt="" width={20} height={20} loading="lazy" referrerPolicy="no-referrer" />}{prompt.handle || "unattributed"}</span>{prompt.likes !== null && <span><b>{compact.format(prompt.likes)}</b> likes</span>}{prompt.saves !== null && <span><b>{compact.format(prompt.saves)}</b> saves</span>}{prompt.highValue && <span className="hv">Popular</span>}<a href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">View on {prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform || "X"} ↗</a></div><div className="tags">{[...prompt.models, ...prompt.styles, ...prompt.subjects, ...prompt.useCases].slice(0, 5).map(ref => <a className="tag" href={ref.href} key={`${ref.id}-${ref.href}`}>{ref.label}</a>)}</div><pre className="prompt" lang={prompt.language} tabIndex={0} aria-label="Complete prompt text"><PromptWords text={prompt.prompt} markClassName="ph" /></pre><div className="dcacts"><a className="btn primary" href={prompt.href}>{generationLabel(prompt.kind)}</a>{prompt.models[0] && <a className="btn ghost" href={prompt.models[0].href}>All {prompt.models[0].label} prompts →</a>}</div></div>
      </article>;
    })}</div><div className="dknav"><button className="btn" type="button" disabled={position === 0} onClick={() => step(-1)}>← Previous</button><button className="btn" type="button" disabled={position >= prompts.length - 1} onClick={() => step(1)}>Next →</button><p className="dkpos" aria-live="polite">{position + 1} of {prompts.length}</p><p className="dkhint">The stack behind the card is the rest of the set.</p></div></div>;
}
export function DeckReader({ catalog, contentType }: { catalog: Catalog; contentType: "image" | "video" }) {
  const explorer = usePromptExplorer(catalog), title = contentType === "image" ? "Image" : "Video";
  const count = `${explorer.rows.length} of ${catalog.prompts.length} ${contentType} prompts${explorer.active ? " match" : ""}`;
  return <><header className="hero"><p className="eyebrow">{title} gallery</p><h1 className="tier-index">{title} prompts</h1><p className="lede">One card at a time, big enough to read the prompt off it. The rest of the set is stacked behind — step through with the buttons or the arrow keys.</p><SearchForm explorer={explorer} contentType={contentType} /><p className="count" style={{ marginTop: 12 }} aria-live="polite">{count}</p></header><section className="sec"><h2>Narrow the deck</h2><Filters prompts={catalog.prompts} explorer={explorer} axes={[["useCase", "Use case"], ["style", "Style"], ["subject", "Subject"]]} />{explorer.active && <button className="btn clear-filters" type="button" onClick={explorer.clear}>Clear filters</button>}</section><section className="sec"><div className="sec-head"><h2>Editor&apos;s pick</h2><span className="count end">{count}</span></div>{explorer.rows.length ? <Carousel key={explorer.search} prompts={explorer.rows} catalog={catalog} contentType={contentType} /> : <EmptyResults explorer={explorer} title={`No ${contentType} prompts match those filters.`} />}</section><SignInGate /></>;
}
