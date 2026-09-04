import type { Catalog, Prompt, Ref } from './types';

export interface ModelFamily extends Ref {
  memberSlugs: string[];
  memberIds: string[];
}

// These are presentation groups, not new CMS model identities or API filters.
const definitions = [
  { slug: 'nano-banana', label: 'Nano Banana', members: ['nano-banana', 'nano-banana-pro', 'nano-banana-2'] },
  { slug: 'gpt-image', label: 'GPT Image', members: ['gpt-image', 'gpt-image-2'] },
];

export function promptsForFamily(prompts: Prompt[], family: ModelFamily): Prompt[] {
  const slugs = new Set(family.memberSlugs);
  const ids = new Set(family.memberIds);
  const seen = new Set<string>();
  return prompts.filter(prompt => {
    if (seen.has(prompt.id) || !prompt.models.some(model => slugs.has(model.slug) || ids.has(model.id))) return false;
    seen.add(prompt.id);
    return true;
  });
}

export function modelFamilies(catalog: Catalog, prompts: Prompt[] = catalog.prompts): ModelFamily[] {
  const emitted = new Set<string>();
  const families: ModelFamily[] = [];
  for (const model of catalog.models) {
    const definition = definitions.find(group => group.members.includes(model.slug));
    const members = definition ? catalog.models.filter(candidate => definition.members.includes(candidate.slug)) : [model];
    const grouped = definition && members.length > 1;
    const id = grouped ? `model-family:${definition.slug}` : model.id;
    if (emitted.has(id)) continue;
    emitted.add(id);
    const family: ModelFamily = {
      ...(grouped ? {
        id,
        slug: definition.slug,
        label: definition.label,
        href: `/${encodeURIComponent(catalog.locale)}/prompts/model-families/${encodeURIComponent(definition.slug)}`,
        count: 0,
      } : model),
      memberSlugs: members.map(member => member.slug),
      memberIds: members.map(member => member.id),
    };
    family.count = promptsForFamily(prompts, family).length;
    families.push(family);
  }
  return families;
}

export function modelFamilyForPath(catalog: Catalog, path: string): ModelFamily | null {
  return modelFamilies(catalog).find(family => family.memberSlugs.length > 1 && family.href === path) ?? null;
}
