import { PromptMedia } from "@/components/PromptMedia";
import { styleHref, taskHref } from "@/lib/catalog/query";
import type { Catalog, Prompt, Ref } from "@/lib/catalog/types";

const axes = [
  { field: "useCases", label: "Task" },
  { field: "styles", label: "Style" },
  { field: "subjects", label: "Subject" },
] as const;

export function ModelRelatedTopics({ catalog, prompts }: { catalog: Catalog; prompts: Prompt[] }) {
  const rows = [...new Map(prompts.map(prompt => [prompt.id, prompt])).values()];
  const allRows = [...new Map(catalog.prompts.map(prompt => [prompt.id, prompt])).values()];
  const topics = axes.flatMap(({ field, label }) => {
    const refs = new Map<string, Ref>();
    for (const prompt of rows) for (const ref of prompt[field]) refs.set(ref.id, ref);
    return [...refs.values()].flatMap(ref => {
      const related = rows.filter(prompt => prompt[field].some(item => item.id === ref.id));
      const previews = related.filter(prompt => prompt.img);
      const href = field === "useCases" ? taskHref(catalog.locale, ref.slug)
        : field === "styles" ? styleHref(catalog.locale, ref.slug) : ref.href;
      if (!previews.length || !href) return [];
      return [{
        ref, label, href, previews, key: `${field}:${ref.id}`, relatedCount: related.length,
        count: allRows.filter(prompt => prompt[field].some(item => item.id === ref.id)).length,
      }];
    });
  }).sort((a, b) => b.relatedCount - a.relatedCount || a.ref.label.localeCompare(b.ref.label, "en") || a.key.localeCompare(b.key, "en")).slice(0, 6);

  if (!topics.length) return null;
  const usedPreviews = new Set<string>();
  return <section className="sec model-related-topics" id="related-topics" aria-labelledby="model-related-topics-title">
    <div className="sec-head"><h2 id="model-related-topics-title">Related topics</h2></div>
    <ul className="model-topic-row">{topics.map(topic => {
      const preview = topic.previews.find(prompt => !usedPreviews.has(prompt.img!)) ?? topic.previews[0]!;
      usedPreviews.add(preview.img!);
      // A navigation card uses the real cover, without nesting video controls inside its link.
      const thumbnail = { ...preview, media: preview.media.filter(media => media.kind === "image") };
      return <li key={topic.key}><a className="model-topic-card" href={topic.href}>
        <span className="model-topic-cover"><PromptMedia prompt={thumbnail} width={320} height={200} /></span>
        <span className="model-topic-body"><span className="model-topic-axis">{topic.label}</span>
          <h3 lang={catalog.locale}>{topic.ref.label}</h3>
          <span className="model-topic-count">{topic.count} {topic.count === 1 ? "prompt" : "prompts"}</span>
        </span>
      </a></li>;
    })}</ul>
  </section>;
}
