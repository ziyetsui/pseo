"use client";
import { generationHref } from '@/lib/cta/generation-url';
import { CompactIndex } from './CompactIndex';
import { interfaceLocale, uiText, text, sourceLanguage, originalLanguage } from '@/lib/i18n/text';
import { isStructuredPrompt } from "@/lib/catalog/task-findings";
import { useRef, useSyncExternalStore } from "react";
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
  const uiLocale = interfaceLocale(catalog);
  const explorer = usePromptExplorer(catalog);
  const groups = [{ label: uiText(uiLocale, "Prose prompts"), rows: explorer.rows.filter(prompt => !isJson(prompt)) }, { label: uiText(uiLocale, "Structured JSON prompts"), rows: explorer.rows.filter(isJson) }].filter(group => group.rows.length);
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
  const label = generationLabel(loadedKind ?? modelKind, uiLocale);
  return <>{signature && <ModelSignatureHero catalog={catalog} model={model} members={members}>
    <div className="msh-composer">
      <label className="vh" htmlFor="gen4">{uiText(uiLocale, "Your prompt")}</label>
      <HighlightedPromptInput inputRef={generatorInput} value={scratch} placeholder={text(uiLocale, modelKind === "video" ? "Describe the video you want…" : modelKind === "image" ? "Describe the image you want…" : "Describe what you want to create…", modelKind === "video" ? "描述你想生成的视频…" : modelKind === "image" ? "描述你想生成的图片…" : "描述你想创作的内容…")} onChange={setScratch} />
      <div className="msh-composer-footer"><span className="msh-count" aria-live="polite">{scratch ? text(uiLocale, `${scratch.length.toLocaleString("en-US")} characters`, `${scratch.length.toLocaleString("zh-CN")} 个字符`) : text(uiLocale, `${total} prompts below`, `下方有 ${total} 条提示词`)}</span><span className="msh-sp" /><a className="msh-generate" data-generation-cta="" href={generationHref(scratch)} target="_blank" rel="noopener noreferrer">{label}</a></div>
    </div>
  </ModelSignatureHero>}<section className={signature ? "hero signature-index" : "hero"}>{!signature && <><p className="eyebrow" style={{ marginBottom: 14 }}>{members ? uiText(uiLocale, "Model family") : uiText(uiLocale, "Model")}</p><h1><span lang={catalog.locale}>{model.label}</span>{text(uiLocale, " prompts", "提示词")}</h1><p className="lede count">{text(uiLocale, `All ${total}, printed whole. The shortest is ${shortest} characters and the longest is ${longest}; nothing here is cut to fit a card.`, `共 ${total} 条，全部完整展示。最短 ${shortest} 个字符，最长 ${longest} 个字符；正文不会为适应卡片而截断。`)}</p>{members && <nav className="tagline model-versions" aria-label={uiText(uiLocale, "Model versions")}>{members.map(member => <a className="pill" href={member.href} key={member.id}>{member.label}</a>)}</nav>}</>}<CompactIndex uiLocale={uiLocale} className="toc" id="toc" label={uiText(uiLocale, "Index of prompts")}>{ordered.length ? ordered.map(prompt => <li key={prompt.id}><a href={`#e-${prompt.id}`}><span className="i">{indices.get(prompt.id)}</span><span className="t" lang={sourceLanguage(prompt.title)}>{prompt.title}</span><span className="l">{prompt.prompt.length.toLocaleString("en-US")}</span></a></li>) : <li><a href="#main"><span className="i">—</span><span className="t">{uiText(uiLocale, "Nothing matches the filters below")}</span><span className="l">0</span></a></li>}</CompactIndex></section><section className="sec"><div className="sec-head"><h2>{uiText(uiLocale, "All prompts")}</h2><span className="end" aria-live="polite">{ordered.length === total ? text(uiLocale, `${total} in full`, `完整展示 ${total} 条`) : text(uiLocale, `${ordered.length} of ${total}`, `${ordered.length} / ${total} 条`)}</span></div><div style={{ marginBottom: 26 }}><Filters uiLocale={uiLocale} prompts={catalog.prompts} explorer={explorer} variant="model" axes={[["useCase", "Use case"], ["style", "Style"], ["variables", "Variables"], ["subject", "Subject"]]} />{explorer.active && <button className="btn clear-filters" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}</div><div className="anth">{ordered.length ? groups.map(group => <section className="grp" key={group.label}><h3>{group.label} · {group.rows.length}</h3>{group.rows.map(prompt => {
    const avatar = catalog.creators.find(creator => isPromptCreator(prompt, creator))?.avatarUrl;
    return <article className="entry" id={`e-${prompt.id}`} key={prompt.id} data-lg-row="" data-lg-chars={prompt.prompt.length} data-lg-words={promptWords(prompt.prompt)}><div className="idx">{indices.get(prompt.id)}</div><div><h4 lang={sourceLanguage(prompt.title)}><a href={prompt.href}>{prompt.title}</a></h4><p className="who"><span className="av">{avatar && <img src={avatar} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" />}</span><span>{prompt.handle || uiText(uiLocale, "unattributed")}</span><span>·</span><span>{text(uiLocale, `${prompt.prompt.length.toLocaleString("en-US")} characters`, `${prompt.prompt.length.toLocaleString("zh-CN")} 个字符`)}</span>{prompt.likes !== null && <><span>·</span><span>{text(uiLocale, `${prompt.likes.toLocaleString("en-US")} likes`, `${prompt.likes.toLocaleString("zh-CN")} 次点赞`)}</span></>}{prompt.highValue && <span className="pill ok">{uiText(uiLocale, "Popular")}</span>}</p><figure className="plate"><PromptMedia uiLocale={uiLocale} prompt={prompt} width={380} height={475} /></figure><div className="tagline">{[...prompt.useCases, ...prompt.styles, ...prompt.subjects].map(ref => <a className="pill" href={ref.href} key={`${ref.id}-${ref.href}`}>{ref.label}</a>)}{!prompt.useCases.length && !prompt.styles.length && !prompt.subjects.length && <span className="pill">{uiText(uiLocale, "untagged")}</span>}{prompt.variables.length > 0 && <span className="pill cand">{prompt.variables.length} {text(uiLocale, "[BRACKET]", "个占位符")}</span>}</div>{catalog.mode === 'git-beta' && <p className="eyebrow">{originalLanguage(uiLocale, prompt.language, prompt.originalPrompt !== undefined)}</p>}<div className="body"><p className="mono" lang={prompt.language}><PromptWords text={prompt.prompt} markClassName="varmark" /></p></div><div className="acts"><a className="btn primary" href={generationHref(prompt.prompt)} target="_blank" rel="noopener noreferrer">{generationLabel(prompt.kind, uiLocale)}</a><a className="btn ghost" href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{text(uiLocale, "View on ", "查看来源：")}{prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform || "X"} ↗</a><a className="btn ghost" href="#toc">{uiText(uiLocale, "Back to the index ↑")}</a></div></div></article>;
  })}</section>) : <EmptyResults uiLocale={uiLocale} explorer={explorer} title={text(uiLocale, `No ${model.label} prompt matches those filters.`, `没有符合筛选条件的 ${model.label} 提示词。`)} />}</div></section>{!signature && <section className="sec"><div className="sec-head"><h2>{uiText(uiLocale, "Write your own")}</h2></div><p className="subline">{text(uiLocale, "The box comes last on purpose. It is a scratchpad for after you have read something worth changing, not a promise that this page can run it.", "读到想要调整的提示词后，可在这个草稿框中编辑。生成操作需前往模型平台完成。")}</p><div className="genbox" style={{ maxWidth: 680 }}><label className="vh" htmlFor="gen4">{uiText(uiLocale, "Your prompt")}</label><textarea id="gen4" rows={5} value={scratch} placeholder={uiText(uiLocale, "Write or paste your prompt here.")} onChange={event => setScratch(event.target.value)} /><div className="genrow"><span className="genmodel">{model.label}</span><span className="sp" />{<button className="btn primary" type="button" disabled title={text(uiLocale, "No generation link is available for this draft. Copy it into your model to run it.", "此草稿暂无生成链接，请复制到模型中运行。")}>{label}</button>}</div><p className="genhint" aria-live="polite">{scratch ? text(uiLocale, `${scratch.length.toLocaleString("en-US")} characters in the box`, `草稿中有 ${scratch.length.toLocaleString("zh-CN")} 个字符`) : text(uiLocale, "Empty. Generation happens in bo; this page hands you the words.", "草稿为空。前往 bo 生成；在此获取提示词。")}</p></div></section>}<SignInGate uiLocale={uiLocale} /></>;
}
