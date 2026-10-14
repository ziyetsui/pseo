import { interfaceLocale, uiText, text, promptCount, caseCount } from '@/lib/i18n/text';
import { websiteEntries, websitePrompts, websiteRef } from '@/lib/catalog/website';
import type { Axis, Catalog, Prompt, Ref } from "@/lib/catalog/types";
import { isStructuredPrompt } from "@/lib/catalog/task-findings";
import { isPromptCreator } from "@/lib/catalog/creator-match";
import { PromptMedia } from "@/components/PromptMedia";
import { styleHref, taskHref } from "@/lib/catalog/query";
import { modelFamilies, promptsForFamily } from "@/lib/catalog/model-families";

const axisRefs = (prompt: Prompt, axis: Axis) => ({ model: prompt.models, useCase: prompt.useCases, technique: prompt.techniques, style: prompt.styles, subject: prompt.subjects })[axis];
function entries(prompts: Prompt[], axis: Axis): Ref[] {
  const values = new Map<string, Ref>();
  for (const prompt of prompts) for (const ref of axisRefs(prompt, axis)) values.set(ref.slug, { ...ref, count: (values.get(ref.slug)?.count ?? 0) + 1 });
  return [...values.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
export function Creators({ catalog, prompts = catalog.prompts, model = false }: { catalog: Catalog; prompts?: Prompt[]; model?: boolean }) {
  const uiLocale = interfaceLocale(catalog);
  const creators = catalog.creators.map(creator => ({ ...creator, count: prompts.filter(prompt => isPromptCreator(prompt, creator)).length })).filter(creator => creator.count > 0).sort((a, b) => b.count - a.count).slice(0, model ? undefined : 8);
  if (!creators.length) return <section className="sec" id="creators"><div className={model ? undefined : "wrap"}><div className={model ? "sec-head" : "sec-h"}><h2>{uiText(uiLocale, "Creators")}</h2></div><p className="dek">{text(uiLocale, "No published creators to browse yet.", "暂无已发布的创作者。")}</p></div></section>;
  const content = <><div className={model ? "sec-head" : "sec-h"}><h2>{uiText(uiLocale, "Creators")}</h2>{model && <span className="end">{text(uiLocale, `${creators.length} ${creators.length === 1 ? "creator" : "creators"}`, `${creators.length} 位创作者`)} · {promptCount(uiLocale, prompts.length)}</span>}</div><div className={model ? "creators" : "people"}>{creators.map(creator => <a className={model ? "creator" : "person"} key={creator.id} href={creator.url || creator.href} target={creator.url ? "_blank" : undefined} rel={creator.url ? "nofollow noopener noreferrer" : undefined}>
    <span className="av">{creator.avatarUrl && <img src={creator.avatarUrl} alt="" width={34} height={34} loading="lazy" referrerPolicy="no-referrer" />}</span>
    <b>{creator.handle || creator.label}</b><span>{promptCount(uiLocale, creator.count)}{model ? text(uiLocale, " for this model", " · 此模型") : ""}</span>
  </a>)}</div></>;
  return <section className="sec" id="creators">{model ? content : <div className="wrap">{content}</div>}</section>;
}
function HubBand({ catalog, axis, id, heading, horizontal = false }: { catalog: Catalog; axis: Axis; id: string; heading: string; horizontal?: boolean }) {
  const uiLocale = interfaceLocale(catalog);
  const used = new Set<string>(), representatives = new Map<string, Prompt>();
  const options = axis === "model"
    ? modelFamilies(catalog).filter(family => family.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).map(ref => ({ ref, candidates: promptsForFamily(catalog.prompts, ref).filter(prompt => prompt.img) }))
    : entries(catalog.prompts, axis).map(ref => ({ ref, candidates: catalog.prompts.filter(prompt => prompt.img && axisRefs(prompt, axis).some(item => item.slug === ref.slug)) }));
  // The reference gives scarce image sets first choice so every real category can retain a unique print.
  for (const item of [...options].sort((a, b) => a.candidates.length - b.candidates.length)) {
    const prompt = item.candidates.find(prompt => prompt.img && !used.has(prompt.img));
    if (prompt?.img) { used.add(prompt.img); representatives.set(item.ref.slug, prompt); }
  }
  const items = options.map(({ ref, candidates }) => ({ ref, prompt: representatives.get(ref.slug) ?? (axis === "model" || horizontal && candidates.length > 0 ? candidates[0] : catalog.mode === "public-api" ? catalog.prompts.find(prompt => axisRefs(prompt, axis).some(item => item.slug === ref.slug)) : undefined) })).filter(item => horizontal || item.prompt);
  if (!items.length) return <section className="sec" id={id}><div className="wrap"><div className="sec-h"><h2>{uiText(uiLocale, heading)}</h2></div><p className="dek">{text(uiLocale, `No published ${axis === "useCase" ? "tasks" : axis === "model" ? "models" : "styles"} to browse yet.`, "暂无已发布的分类。") }</p></div></section>;
  return <section className={`sec${horizontal ? " browse-row" : ""}`} id={id}><div className="wrap"><div className="sec-h"><h2>{uiText(uiLocale, heading)}</h2></div><div className="tiles">{items.map(({ ref, prompt }) => <a className="tile" href={axis === "useCase" ? taskHref(catalog.locale, ref.slug) : axis === "style" ? styleHref(catalog.locale, ref.slug) : ref.href} key={ref.id}>
    {<span className="th">{prompt ? <PromptMedia uiLocale={uiLocale} prompt={prompt} width={320} height={200} /> : <span className="media-fallback">{uiText(uiLocale, "No preview available.")}</span>}</span>}<span className="tb"><h3 lang={catalog.locale}>{ref.label}</h3><p>{promptCount(uiLocale, ref.count)}</p></span>
  </a>)}</div></div></section>;
}
export function HubBrowse({ catalog, horizontalNavigation = false }: { catalog: Catalog; horizontalNavigation?: boolean }) {
  const uiLocale = interfaceLocale(catalog);
  return <><section className={`sec${horizontalNavigation ? " browse-row" : ""}`} id="category"><div className="wrap"><div className="sec-h"><h2>{uiText(uiLocale, "Browse by category")}</h2></div><div className="cat">{(["image", "video", "website"] as const).map(kind => {
    const cases = kind === "website" ? websiteEntries(catalog) : [], cover = kind === "website" ? catalog.websites?.[0]?.cover : null;
    const rows = kind === "website" ? websitePrompts(catalog) : catalog.prompts.filter(prompt => prompt.kind === kind), representative = rows.find(prompt => prompt.img) ?? rows[0];
    const count = kind === "website" ? cases.length : rows.length, unit = kind === "website" && catalog.mode === "git-beta" ? "case" : "prompt";
    return <a className="tile" href={kind === "website" ? websiteRef(catalog).href : `/${catalog.locale}/prompts/${kind}`} key={kind}>{<span className="th">{cover ? <img src={cover} alt={cases[0]?.title ?? uiText(uiLocale, "Website case")} width={560} height={350} loading="lazy" /> : representative ? <PromptMedia uiLocale={uiLocale} prompt={representative} width={560} height={350} /> : <span className="media-fallback">{text(uiLocale, `No published ${kind} results yet.`, "暂无已发布的结果。")}</span>}</span>}<span className="tb"><h3>{uiText(uiLocale, kind === "image" ? "Images" : kind === "video" ? "Videos" : "Website")}</h3><p>{unit === "case" ? caseCount(uiLocale, count) : promptCount(uiLocale, count)}</p></span></a>;
  })}</div></div></section><HubBand catalog={catalog} axis="useCase" id="tasks" heading="Browse by task" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="model" id="models" heading="Browse by model" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="style" id="styles" heading="Browse by style" horizontal={horizontalNavigation} /><Creators catalog={catalog} /><section className="cta"><div className="wrap"><h2>{uiText(uiLocale, "Take a prompt and start")}</h2><p>{uiText(uiLocale, "Free to copy, every one credited to the person who wrote it.")}</p><div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}><a className="btn pri" href={`/${catalog.locale}/prompts/image`} style={{ minHeight: 44, padding: "0 20px" }}>{uiText(uiLocale, "Generate image")}</a><a className="btn" href={`/${catalog.locale}/prompts/video`} style={{ minHeight: 44, padding: "0 20px" }}>{uiText(uiLocale, "Generate video")}</a></div></div></section></>;
}
export function DeckBrowse({ catalog, prompts }: { catalog: Catalog; prompts: Prompt[] }) {
  const uiLocale = interfaceLocale(catalog);
  return <><section className="sec" id="models"><h2>{uiText(uiLocale, "Browse by model")}</h2><ul className="entry">{modelFamilies(catalog, prompts).filter(family => family.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).map(model => {
    const rows = promptsForFamily(prompts, model);
    const lengths = rows.map(prompt => prompt.prompt.length).sort((a, b) => a - b), middle = Math.floor(lengths.length / 2);
    const median = lengths.length % 2 ? lengths[middle] ?? 0 : Math.round(((lengths[middle - 1] ?? 0) + (lengths[middle] ?? 0)) / 2);
    const style = entries(rows, "style")[0], structured = rows.filter(isStructuredPrompt).length;
    return <li key={model.id}><a className="nm" href={model.href}>{model.label} <span>{text(uiLocale, `${rows.length} here`, `${rows.length} 条`)}</span></a><a className="go" href={model.href}>{text(uiLocale, `All ${model.label} prompts →`, `${model.label} 的全部提示词 →`)}</a><span className="ch">{text(uiLocale, `median ${median.toLocaleString("en-US")} characters · ${structured} of ${rows.length} use structured text${style ? ` · mostly ${style.label.toLowerCase()}` : ""}`, `字符数中位数 ${median.toLocaleString("zh-CN")} · ${rows.length} 条中 ${structured} 条使用结构化文本${style ? ` · 主要风格：${style.label}` : ""}`)}</span></li>;
  })}</ul></section><section className="sec"><h2>{uiText(uiLocale, "Browse by tag")}</h2><div className="linkcols">{([["useCase", "Use case"], ["style", "Style"], ["subject", "Subject"]] as const).map(([axis, label]) => <div key={axis}><h3>{uiText(uiLocale, label)}</h3><ul>{entries(prompts, axis).map(ref => <li key={ref.id}><a href={ref.href || `/${catalog.locale}/prompts?${axis}=${encodeURIComponent(ref.slug)}`}>{text(uiLocale, `${ref.label} prompts`, `${ref.label}提示词`)} <b className="count">{ref.count}</b></a></li>)}</ul></div>)}</div></section></>;
}
