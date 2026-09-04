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
  const creators = catalog.creators.map(creator => ({ ...creator, count: prompts.filter(prompt => isPromptCreator(prompt, creator)).length })).filter(creator => creator.count > 0).sort((a, b) => b.count - a.count).slice(0, model ? undefined : 8);
  if (!creators.length) return <section className="sec" id="creators"><div className={model ? undefined : "wrap"}><div className={model ? "sec-head" : "sec-h"}><h2>Creators</h2></div><p className="dek">No published creators to browse yet.</p></div></section>;
  const content = <><div className={model ? "sec-head" : "sec-h"}><h2>Creators</h2>{model && <span className="end">{creators.length} {creators.length === 1 ? "creator" : "creators"} · {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}</span>}</div><div className={model ? "creators" : "people"}>{creators.map(creator => <a className={model ? "creator" : "person"} key={creator.id} href={creator.url || creator.href} target={creator.url ? "_blank" : undefined} rel={creator.url ? "nofollow noopener noreferrer" : undefined}>
    <span className="av">{creator.avatarUrl && <img src={creator.avatarUrl} alt="" width={34} height={34} loading="lazy" referrerPolicy="no-referrer" />}</span>
    <b>{creator.handle || creator.label}</b><span>{creator.count} {creator.count === 1 ? "prompt" : "prompts"}{model ? " for this model" : ""}</span>
  </a>)}</div></>;
  return <section className="sec" id="creators">{model ? content : <div className="wrap">{content}</div>}</section>;
}
function HubBand({ catalog, axis, id, heading, horizontal = false }: { catalog: Catalog; axis: Axis; id: string; heading: string; horizontal?: boolean }) {
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
  if (!items.length) return <section className="sec" id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><p className="dek">No published {axis === "useCase" ? "tasks" : axis === "model" ? "models" : "styles"} to browse yet.</p></div></section>;
  return <section className={`sec${horizontal ? " browse-row" : ""}`} id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><div className="tiles">{items.map(({ ref, prompt }) => <a className="tile" href={axis === "useCase" ? taskHref(catalog.locale, ref.slug) : axis === "style" ? styleHref(catalog.locale, ref.slug) : ref.href} key={ref.id}>
    {<span className="th">{prompt ? <PromptMedia prompt={prompt} width={320} height={200} /> : <span className="media-fallback">No preview available.</span>}</span>}<span className="tb"><h3 lang={catalog.locale}>{ref.label}</h3><p>{ref.count} {ref.count === 1 ? "prompt" : "prompts"}</p></span>
  </a>)}</div></div></section>;
}
export function HubBrowse({ catalog, horizontalNavigation = false }: { catalog: Catalog; horizontalNavigation?: boolean }) {
  return <><section className={`sec${horizontalNavigation ? " browse-row" : ""}`} id="category"><div className="wrap"><div className="sec-h"><h2>Browse by category</h2></div><div className="cat">{(["image", "video"] as const).map(kind => {
    const rows = catalog.prompts.filter(prompt => prompt.kind === kind), representative = rows.find(prompt => prompt.img) ?? rows[0];
    return <a className="tile" href={`/${catalog.locale}/prompts/${kind}`} key={kind}>{<span className="th">{representative ? <PromptMedia prompt={representative} width={560} height={350} /> : <span className="media-fallback">No published {kind} results yet.</span>}</span>}<span className="tb"><h3>{kind === "image" ? "Images" : "Videos"}</h3><p>{rows.length} {rows.length === 1 ? "prompt" : "prompts"}</p></span></a>;
  })}</div></div></section><HubBand catalog={catalog} axis="useCase" id="tasks" heading="Browse by task" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="model" id="models" heading="Browse by model" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="style" id="styles" heading="Browse by style" horizontal={horizontalNavigation} /><Creators catalog={catalog} /><section className="cta"><div className="wrap"><h2>Take a prompt and start</h2><p>Free to copy, every one credited to the person who wrote it.</p><div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}><a className="btn pri" href={`/${catalog.locale}/prompts/image`} style={{ minHeight: 44, padding: "0 20px" }}>Generate image</a><a className="btn" href={`/${catalog.locale}/prompts/video`} style={{ minHeight: 44, padding: "0 20px" }}>Generate video</a></div></div></section></>;
}
export function DeckBrowse({ catalog, prompts }: { catalog: Catalog; prompts: Prompt[] }) {
  return <><section className="sec" id="models"><h2>Browse by model</h2><ul className="entry">{modelFamilies(catalog, prompts).filter(family => family.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).map(model => {
    const rows = promptsForFamily(prompts, model);
    const lengths = rows.map(prompt => prompt.prompt.length).sort((a, b) => a - b), middle = Math.floor(lengths.length / 2);
    const median = lengths.length % 2 ? lengths[middle] ?? 0 : Math.round(((lengths[middle - 1] ?? 0) + (lengths[middle] ?? 0)) / 2);
    const style = entries(rows, "style")[0], structured = rows.filter(isStructuredPrompt).length;
    return <li key={model.id}><a className="nm" href={model.href}>{model.label} <span>{rows.length} here</span></a><a className="go" href={model.href}>All {model.label} prompts →</a><span className="ch">median {median.toLocaleString("en-US")} characters · {structured} of {rows.length} use structured text{style ? ` · mostly ${style.label.toLowerCase()}` : ""}</span></li>;
  })}</ul></section><section className="sec"><h2>Browse by tag</h2><div className="linkcols">{([["useCase", "Use case"], ["style", "Style"], ["subject", "Subject"]] as const).map(([axis, label]) => <div key={axis}><h3>{label}</h3><ul>{entries(prompts, axis).map(ref => <li key={ref.id}><a href={ref.href || `/${catalog.locale}/prompts?${axis}=${encodeURIComponent(ref.slug)}`}>{ref.label} prompts <b className="count">{ref.count}</b></a></li>)}</ul></div>)}</div></section></>;
}
