"use client";
import { isStructuredPrompt } from "@/lib/catalog/task-findings";
import { useRef, useSyncExternalStore, type MouseEvent } from "react";
import { ModelSignatureHero } from "@/components/ModelSignatureHero";
import { HighlightedPromptInput } from "@/components/HighlightedPromptInput";
import type { Catalog, Prompt, Ref } from "@/lib/catalog/types";
import { generationLabel } from "@/components/generation-label";
import { promptWords } from "@/lib/cta/sign-in-gate";
import { SignInGate } from "@/components/SignInGate";
import { PromptMedia } from "@/components/PromptMedia";
import { EmptyResults, Filters, PromptWords, usePromptExplorer } from "@/components/Filters";
import { isPromptCreator } from "@/lib/catalog/creator-match";

const scratchEvent = "prompt-library:scratchpad";
const subscribe = (listener: () => void) => {
  window.addEventListener(scratchEvent, listener);
  return () => window.removeEventListener(scratchEvent, listener);
};
const server = () => "";
const serverKind = () => undefined;
const isJson = isStructuredPrompt;

export function AnthologyReader({ catalog, model, members, signature = false }: { catalog: Catalog; model: Ref; members?: Ref[]; signature?: boolean }) {
  const explorer = usePromptExplorer(catalog);
  const groups = [{ label: "Prose prompts", rows: explorer.rows.filter(prompt => !isJson(prompt)) }, { label: "Structured JSON prompts", rows: explorer.rows.filter(isJson) }].filter(group => group.rows.length);
  const ordered = groups.flatMap(group => group.rows);
  const indices = new Map(ordered.map((prompt, index) => [prompt.id, String(index + 1).padStart(2, "0")]));
  const lengths = catalog.prompts.map(prompt => prompt.prompt.length), total = catalog.prompts.length;
  const shortest = total ? Math.min(...lengths).toLocaleString("en-US") : "0", longest = total ? Math.max(...lengths).toLocaleString("en-US") : "0";
  const storageKey = `prompt-library:scratchpad:${catalog.locale}:${members ? "family:" : ""}${model.slug}`;
  const transient = useRef("");
  const generatorInput = useRef<HTMLTextAreaElement>(null);
  const transientKind = useRef<Prompt["kind"] | undefined>(undefined);
  const loadedKind = useSyncExternalStore(subscribe, () => {
    try {
      const value = window.sessionStorage.getItem(`${storageKey}:kind`);
      return value === "image" || value === "video" || value === "text" || value === "other" ? value : transientKind.current;
    } catch { return transientKind.current; }
  }, serverKind);
  const scratch = useSyncExternalStore(subscribe, () => { try { return window.sessionStorage.getItem(storageKey) ?? transient.current; } catch { return transient.current; } }, server);
  const setScratch = (value: string) => {
    transient.current = value;
    try { window.sessionStorage.setItem(storageKey, value); } catch { /* Editing remains available if browser storage is unavailable. */ }
    window.dispatchEvent(new Event(scratchEvent));
  };
  const modelKind = catalog.prompts.length && catalog.prompts.every(prompt => prompt.kind === catalog.prompts[0]?.kind) ? catalog.prompts[0]?.kind : undefined;
  const label = generationLabel(loadedKind ?? modelKind);
  const loadIntoGenerator = (event: MouseEvent<HTMLAnchorElement>, prompt: Prompt) => {
    if (!signature || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    transientKind.current = prompt.kind;
    try { window.sessionStorage.setItem(`${storageKey}:kind`, prompt.kind); } catch { /* Keep the type with the in-memory draft when storage is unavailable. */ }
    setScratch(prompt.prompt);
    requestAnimationFrame(() => {
      const input = generatorInput.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(0, 0);
      input.scrollTop = 0;
      // The composer can be 14,000px above the entry that was clicked; smoothing that
      // is a second of blur, not an explanation of where the text went.
      input.scrollIntoView({ block: "center", behavior: "instant" });
    });
  };
  return <>{signature && <ModelSignatureHero catalog={catalog} model={model} members={members}>
    <div className="msh-composer">
      <label className="vh" htmlFor="gen4">Your prompt</label>
      <HighlightedPromptInput inputRef={generatorInput} value={scratch} placeholder={modelKind === "video" ? "Describe the video you want…" : modelKind === "image" ? "Describe the image you want…" : "Describe what you want to create…"} onChange={setScratch} />
      <div className="msh-composer-footer"><span className="msh-count" aria-live="polite">{scratch ? `${scratch.length.toLocaleString("en-US")} characters` : `${total} prompts below`}</span><span className="msh-sp" /><a className="msh-generate" data-generation-cta="" href="https://bo.ancher.ai/home" target="_blank" rel="noopener noreferrer">{label}</a></div>
    </div>
  </ModelSignatureHero>}<section className={signature ? "hero signature-index" : "hero"}>{!signature && <><p className="eyebrow" style={{ marginBottom: 14 }}>{members ? "Model family" : "Model"}</p><h1><span lang={catalog.locale}>{model.label}</span> prompts</h1><p className="lede count">All {total}, printed whole. The shortest is {shortest} characters and the longest is {longest}; nothing here is cut to fit a card.</p>{members && <nav className="tagline model-versions" aria-label="Model versions">{members.map(member => <a className="pill" href={member.href} key={member.id}>{member.label}</a>)}</nav>}</>}<nav className="toc" id="toc" aria-label="Index of prompts"><ol>{ordered.length ? ordered.map(prompt => <li key={prompt.id}><a href={`#e-${prompt.id}`}><span className="i">{indices.get(prompt.id)}</span><span className="t" lang={prompt.locale}>{prompt.title}</span><span className="l">{prompt.prompt.length.toLocaleString("en-US")}</span></a></li>) : <li><a href="#main"><span className="i">—</span><span className="t">Nothing matches the filters below</span><span className="l">0</span></a></li>}</ol></nav></section><section className="sec"><div className="sec-head"><h2>All prompts</h2><span className="end" aria-live="polite">{ordered.length === total ? `${total} in full` : `${ordered.length} of ${total}`}</span></div><div style={{ marginBottom: 26 }}><Filters prompts={catalog.prompts} explorer={explorer} variant="model" axes={[["useCase", "Use case"], ["style", "Style"], ["variables", "Variables"], ["subject", "Subject"]]} />{explorer.active && <button className="btn clear-filters" type="button" onClick={explorer.clear}>Clear filters</button>}</div><div className="anth">{ordered.length ? groups.map(group => <section className="grp" key={group.label}><h3>{group.label} · {group.rows.length}</h3>{group.rows.map(prompt => {
    const avatar = catalog.creators.find(creator => isPromptCreator(prompt, creator))?.avatarUrl;
    return <article className="entry" id={`e-${prompt.id}`} key={prompt.id} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)}><div className="idx">{indices.get(prompt.id)}</div><div><h4 lang={prompt.locale}><a href={prompt.href}>{prompt.title}</a></h4><p className="who"><span className="av">{avatar && <img src={avatar} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" />}</span><span>{prompt.handle || "unattributed"}</span><span>·</span><span>{prompt.prompt.length.toLocaleString("en-US")} characters</span>{prompt.likes !== null && <><span>·</span><span>{prompt.likes.toLocaleString("en-US")} likes</span></>}{prompt.highValue && <span className="pill ok">Popular</span>}</p><figure className="plate"><PromptMedia prompt={prompt} width={380} height={475} /></figure><div className="tagline">{[...prompt.useCases, ...prompt.styles, ...prompt.subjects].map(ref => <a className="pill" href={ref.href} key={`${ref.id}-${ref.href}`}>{ref.label}</a>)}{!prompt.useCases.length && !prompt.styles.length && !prompt.subjects.length && <span className="pill">untagged</span>}{prompt.variables.length > 0 && <span className="pill cand">{prompt.variables.length} [BRACKET]</span>}</div><div className="body"><p className="mono" lang={prompt.language}><PromptWords text={prompt.prompt} markClassName="varmark" /></p></div><div className="acts"><a className="btn primary" href={prompt.href} onClick={event => loadIntoGenerator(event, prompt)}>{generationLabel(prompt.kind)}</a><a className="btn ghost" href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">View on {prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform || "X"} ↗</a><a className="btn ghost" href="#toc">Back to the index ↑</a></div></div></article>;
  })}</section>) : <EmptyResults explorer={explorer} title={`No ${model.label} prompt matches those filters.`} />}</div></section>{!signature && <section className="sec"><div className="sec-head"><h2>Write your own</h2></div><p className="subline">The box comes last on purpose. It is a scratchpad for after you have read something worth changing, not a promise that this page can run it.</p><div className="genbox" style={{ maxWidth: 680 }}><label className="vh" htmlFor="gen4">Your prompt</label><textarea id="gen4" rows={5} value={scratch} placeholder="Write or paste your prompt here." onChange={event => setScratch(event.target.value)} /><div className="genrow"><span className="genmodel">{model.label}</span><span className="sp" />{<button className="btn primary" type="button" disabled title="No generation link is available for this draft. Copy it into your model to run it.">{label}</button>}</div><p className="genhint" aria-live="polite">{scratch ? `${scratch.length.toLocaleString("en-US")} characters in the box` : "Empty. Generation happens in bo; this page hands you the words."}</p></div></section>}<SignInGate /></>;
}
