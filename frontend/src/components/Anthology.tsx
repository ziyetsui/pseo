import { promptsForFamily, type ModelFamily } from "@/lib/catalog/model-families";
import type { Catalog, Ref } from "@/lib/catalog/types";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { Creators } from "@/components/Browse";
import { AnthologyReader } from "@/components/AnthologyReader";
import { ModelRelatedTopics } from "@/components/ModelRelatedTopics";
import "@/styles/model-related-topics.css";

export function Anthology({ catalog, model, family }: { catalog: Catalog; model: Ref; family?: ModelFamily }) {
  const prompts = family ? promptsForFamily(catalog.prompts, family) : catalog.prompts.filter(prompt => prompt.models.some(ref => ref.slug === model.slug));
  const members = family ? catalog.models.filter(ref => family.memberSlugs.includes(ref.slug)) : undefined;
  return <div className="prototype-anthology"><div className="v4"><SiteHeader level="model" locale={catalog.locale} /><div className="page"><main id="main"><AnthologyReader key={`${catalog.locale}:${family ? "family" : "model"}:${model.slug}`} catalog={{ ...catalog, prompts }} model={model} members={members} signature /><Creators catalog={catalog} prompts={prompts} model /><ModelRelatedTopics catalog={catalog} prompts={prompts} /></main><SiteFooter catalog={catalog} level="model" /></div></div></div>;
}
