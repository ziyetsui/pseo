// Typography probe: same markup as components/Browse.tsx; Chinese interface copy only.
import { websiteEntries, websitePrompts, websiteRef } from '@/lib/catalog/website';
import type { Axis, Catalog, Prompt, Ref } from "@/lib/catalog/types";
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
  if (!creators.length) return <section className="sec" id="creators"><div className={model ? undefined : "wrap"}><div className={model ? "sec-head" : "sec-h"}><h2>创作者</h2></div><p className="dek">暂无可浏览的创作者。</p></div></section>;
  const content = <><div className={model ? "sec-head" : "sec-h"}><h2>创作者</h2>{model && <span className="end">{creators.length} 位创作者 · {prompts.length} 条提示词</span>}</div><div className={model ? "creators" : "people"}>{creators.map(creator => <a className={model ? "creator" : "person"} key={creator.id} href={creator.url || creator.href} target={creator.url ? "_blank" : undefined} rel={creator.url ? "nofollow noopener noreferrer" : undefined}>
    <span className="av">{creator.avatarUrl && <img src={creator.avatarUrl} alt="" width={34} height={34} loading="lazy" referrerPolicy="no-referrer" />}</span>
    <b>{creator.handle || creator.label}</b><span>{creator.count} 条提示词{model ? "适用此模型" : ""}</span>
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
  if (!items.length) return <section className="sec" id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><p className="dek">暂无可浏览的{axis === "useCase" ? "任务" : axis === "model" ? "模型" : "风格"}。</p></div></section>;
  return <section className={`sec${horizontal ? " browse-row" : ""}`} id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><div className="tiles">{items.map(({ ref, prompt }) => <a className="tile" href={axis === "useCase" ? taskHref(catalog.locale, ref.slug) : axis === "style" ? styleHref(catalog.locale, ref.slug) : ref.href} key={ref.id}>
    {<span className="th">{prompt ? <PromptMedia prompt={prompt} width={320} height={200} /> : <span className="media-fallback">暂无预览图。</span>}</span>}<span className="tb"><h3 lang={catalog.locale}>{ref.label}</h3><p>{ref.count} 条提示词</p></span>
  </a>)}</div></div></section>;
}
export function HubBrowse({ catalog, horizontalNavigation = false }: { catalog: Catalog; horizontalNavigation?: boolean }) {
  return <><section className={`sec${horizontalNavigation ? " browse-row" : ""}`} id="category"><div className="wrap"><div className="sec-h"><h2>按类型浏览</h2></div><div className="cat">{(["image", "video", "website"] as const).map(kind => {
    const cases = kind === "website" ? websiteEntries(catalog) : [], cover = kind === "website" ? catalog.websites?.[0]?.cover : null;
    const rows = kind === "website" ? websitePrompts(catalog) : catalog.prompts.filter(prompt => prompt.kind === kind), representative = rows.find(prompt => prompt.img) ?? rows[0];
    const count = kind === "website" ? cases.length : rows.length, unit = kind === "website" && catalog.mode === "git-beta" ? "个案例" : "条提示词";
    return <a className="tile" href={kind === "website" ? websiteRef(catalog).href : `/${catalog.locale}/prompts/${kind}`} key={kind}>{<span className="th">{cover ? <img src={cover} alt={cases[0]?.title ?? "Website case"} width={560} height={350} loading="lazy" /> : representative ? <PromptMedia prompt={representative} width={560} height={350} /> : <span className="media-fallback">暂无此类型的作品。</span>}</span>}<span className="tb"><h3>{kind === "image" ? "图片" : kind === "video" ? "视频" : "网站"}</h3><p>{count} {unit}</p></span></a>;
  })}</div></div></section><HubBand catalog={catalog} axis="useCase" id="tasks" heading="按任务浏览" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="model" id="models" heading="按模型浏览" horizontal={horizontalNavigation} /><HubBand catalog={catalog} axis="style" id="styles" heading="按风格浏览" horizontal={horizontalNavigation} /><Creators catalog={catalog} /><section className="cta"><div className="wrap"><h2>挑一句提示词，开始创作</h2><p>每一条提示词，都保留创作者署名和原始来源。</p><div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}><a className="btn pri" href={`/${catalog.locale}/prompts/image`} style={{ minHeight: 44, padding: "0 20px" }}>创作图片</a><a className="btn" href={`/${catalog.locale}/prompts/video`} style={{ minHeight: 44, padding: "0 20px" }}>创作视频</a></div></div></section></>;
}
