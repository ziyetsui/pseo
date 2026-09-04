import type { Axis, Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { PromptMedia } from '@/components/PromptMedia';

/* Verbatim copy of frontend/src/components/Browse.tsx — entries(), axisRefs() and HubBand().
   The band under exploration has to be judged against the real thing beside it, and against the
   real thing as variant 1, so the baseline is relocated production code, not a re-drawing of it.
   Production imports nothing from here. */
const axisRefs = (prompt: Prompt, axis: Axis) => ({ model: prompt.models, useCase: prompt.useCases, technique: prompt.techniques, style: prompt.styles, subject: prompt.subjects })[axis];
function entries(prompts: Prompt[], axis: Axis): Ref[] {
  const values = new Map<string, Ref>();
  for (const prompt of prompts) for (const ref of axisRefs(prompt, axis)) values.set(ref.slug, { ...ref, count: (values.get(ref.slug)?.count ?? 0) + 1 });
  return [...values.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
export function HubBand({ catalog, axis, id, heading }: { catalog: Catalog; axis: Axis; id: string; heading: string }) {
  const used = new Set<string>(), representatives = new Map<string, Prompt>();
  const options = entries(catalog.prompts, axis).map(ref => ({ ref, candidates: catalog.prompts.filter(prompt => prompt.img && axisRefs(prompt, axis).some(item => item.slug === ref.slug)) }));
  // The reference gives scarce image sets first choice so every real category can retain a unique print.
  for (const item of [...options].sort((a, b) => a.candidates.length - b.candidates.length)) {
    const prompt = item.candidates.find(prompt => prompt.img && !used.has(prompt.img));
    if (prompt?.img) { used.add(prompt.img); representatives.set(item.ref.slug, prompt); }
  }
  const items = options.map(({ ref }) => ({ ref, prompt: representatives.get(ref.slug) ?? (catalog.mode === "public-api" ? catalog.prompts.find(prompt => axisRefs(prompt, axis).some(item => item.slug === ref.slug)) : undefined) })).filter(item => item.prompt);
  if (!items.length) return <section className="sec" id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><p className="dek">No published {axis === "useCase" ? "tasks" : axis === "model" ? "models" : "styles"} to browse yet.</p></div></section>;
  return <section className="sec" id={id}><div className="wrap"><div className="sec-h"><h2>{heading}</h2></div><div className="tiles">{items.map(({ ref, prompt }) => <a className="tile" href={ref.href} key={ref.id}>
    <span className="th">{prompt && <PromptMedia prompt={prompt} width={320} height={200} />}</span><span className="tb"><h3 lang={catalog.locale}>{ref.label}</h3><p>{ref.count} prompts</p></span>
  </a>)}</div></div></section>;
}
export function CategoryBand({ catalog }: { catalog: Catalog }) {
  return <section className="sec" id="category"><div className="wrap"><div className="sec-h"><h2>Browse by category</h2></div><div className="cat">{(["image", "video"] as const).map(kind => {
    const rows = catalog.prompts.filter(prompt => prompt.kind === kind), representative = rows.find(prompt => prompt.img) ?? rows[0];
    return <a className="tile" href={`http://127.0.0.1:3000/${catalog.locale}/prompts/${kind}`} key={kind}><span className="th">{representative ? <PromptMedia prompt={representative} width={560} height={350} /> : <span className="media-fallback">No published {kind} results yet.</span>}</span><span className="tb"><h3>{kind === "image" ? "Images" : "Videos"}</h3><p>{rows.length} prompts</p></span></a>;
  })}</div></div></section>;
}
