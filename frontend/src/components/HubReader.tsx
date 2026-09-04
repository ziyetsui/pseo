"use client";
import { Fragment, useEffect, useRef } from "react";
import type { Catalog, Prompt } from "@/lib/catalog/types";
import { generationLabel } from "@/components/generation-label";
import { promptWords } from "@/lib/cta/sign-in-gate";
import { SignInGate } from "@/components/SignInGate";
import { PromptMedia } from "@/components/PromptMedia";
import { mountMagnetic } from "@/components/magnetic-motion";
import { EmptyResults, Filters, PromptWords, SearchForm, usePromptExplorer } from "@/components/Filters";

function MagneticField({ rows }: { rows: Prompt[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current ? mountMagnetic(ref.current) : undefined, []);
  return <div className="runbox" ref={ref}><p className="run">{rows.map(prompt => {
    const text = prompt.prompt.replace(/\s+/g, " ").trim();
    const excerpt = text.length > 900 ? `${text.slice(0, 900).replace(/\s\S*$/, "")}…` : text;
    return <Fragment key={prompt.id}><span className="item" data-entry="" data-kind={prompt.kind} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)}><button className="t" type="button" data-expand="" aria-expanded="false" aria-controls={`peek-${prompt.id}`}><span className="u" lang={prompt.locale}>{prompt.title}</span></button><span className="exp" id={`peek-${prompt.id}`} aria-label={prompt.title} inert>
      <span className="fig"><PromptMedia prompt={prompt} width={440} height={440} /></span><span><span className="txt" lang={prompt.language}><PromptWords text={excerpt} /></span><span className="meta"><a href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{prompt.handle || "unattributed"}</a><span>{prompt.models[0]?.label ?? "no model named"}</span>{prompt.kind === "video" && prompt.media[0]?.label ? <span>{prompt.media[0].label} video</span> : prompt.media.length > 1 ? <span>{prompt.media.length} frames</span> : null}{prompt.likes !== null && <span><b>{prompt.likes.toLocaleString("en-US")}</b> likes</span>}<span>{prompt.prompt.length.toLocaleString("en-US")} chars</span></span><span className="acts"><a className="btn pri" href={prompt.href}>{generationLabel(prompt.kind)}</a></span></span>
    </span></span>{" "}</Fragment>;
  })}</p><noscript><ul>{rows.map(prompt => <li key={prompt.id}><a href={prompt.href}>{prompt.title} — {generationLabel(prompt.kind)}</a></li>)}</ul></noscript></div>;
}
export function HubReader({ catalog }: { catalog: Catalog }) {
  const explorer = usePromptExplorer(catalog);
  return <><section className="wrap lede"><p className="eyebrow" style={{ marginBottom: 14 }}>The library</p><h2 className="tier-ref">Everything, in the order it gets copied</h2><p className="formnote">No rows, no cards, no plates. The whole library as one paragraph of titles; the one you pick opens in place and splits the text around it.</p><SearchForm explorer={explorer} variant="hub" /><Filters prompts={catalog.prompts} explorer={explorer} variant="hub" limit={4} axes={[["model", "Model"], ["useCase", "Task"], ["style", "Style"], ["technique", "Technique"]]} /></section><section className="wrap" id="results"><h2 className="vh">All prompts</h2><p className="meta count" aria-live="polite"><b>{explorer.rows.length}</b> of {catalog.prompts.length} prompts shown{explorer.active && <button className="btn" type="button" onClick={explorer.clear}>Clear filters</button>}</p>{explorer.rows.length ? <MagneticField key={explorer.search} rows={explorer.rows} /> : <EmptyResults explorer={explorer} />}</section><SignInGate /></>;
}
