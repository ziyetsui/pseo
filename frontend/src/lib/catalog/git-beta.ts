import graphInput from '../../../../docs/intake/2026-10-14/graph.json';
import previewInput from '../../data/website-previews.json';
import { createFixtureCatalog } from './fixture';
import { gitBetaRevision } from './git-beta-revision';
import { filterHref, modelHref } from './query';
import type { Axis, Catalog, Creator, Locale, Media, Prompt, Ref, WebsiteCase } from './types';

type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Git beta object required');
  return value as RecordValue;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Git beta nonempty string required');
  return value;
}
function optionalText(value: unknown): string | null { return value === undefined || value === null ? null : text(value); }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Git beta array required'); return value; }
function safeUrl(value: unknown): string {
  const url = new URL(text(value));
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Git beta unsafe source URL');
  return url.href;
}

/** Owner-authorized Git beta only. This does not mutate CMS state or the generated mirror. */
export function createGitBetaCatalog(locale: Locale): Catalog {
  if (locale !== 'zh-CN') throw new Error('Git beta has no reviewed en page variants');
  const base = createFixtureCatalog(locale), graph = object(graphInput), previews = object(previewInput);
  const revision = gitBetaRevision(base.revision, graphInput, previewInput);
  const nodes = new Map<string, RecordValue>();
  for (const value of array(graph.nodes)) {
    const node = object(value), id = text(node.id);
    if (nodes.has(id)) throw new Error('Duplicate Git beta node');
    nodes.set(id, node);
  }
  const links = new Map<string, Map<string, string[]>>(), uniqueEdges = new Set<string>();
  for (const value of array(graph.edges)) {
    const edge = object(value), from = text(edge.from), to = text(edge.to), type = text(edge.type);
    if (!nodes.has(from) || !nodes.has(to)) throw new Error('Dangling Git beta edge');
    const key = `${from}:${type}:${to}`;
    if (uniqueEdges.has(key)) throw new Error('Duplicate Git beta edge');
    uniqueEdges.add(key);
    const byType = links.get(from) ?? new Map<string, string[]>();
    byType.set(type, [...(byType.get(type) ?? []), to]); links.set(from, byType);
  }
  const linked = (id: string, type: string) => (links.get(id)?.get(type) ?? []).map(key => {
    const node = nodes.get(key); if (!node) throw new Error('Missing Git beta node'); return node;
  });
  const axes = { model: 'models', useCase: 'useCases', style: 'styles', subject: 'subjects', technique: 'techniques' } as const;
  const registries: Record<Axis, Map<string, Ref>> = { model: new Map(), useCase: new Map(), style: new Map(), subject: new Map(), technique: new Map() };
  for (const axis of Object.keys(axes) as Axis[]) for (const ref of base[axes[axis]]) registries[axis].set(ref.slug, { ...ref });
  const reference = (node: RecordValue, axis: Axis): Ref => {
    const slug = text(node.slug), existing = registries[axis].get(slug);
    if (existing) return existing;
    const ref = { id: text(node.id), slug, label: text(node.label), href: axis === 'model' ? modelHref(locale, slug) : filterHref(locale, axis, slug), count: 0 };
    registries[axis].set(slug, ref); return ref;
  };
  const refs = (id: string, type: string, axis: Axis) => linked(id, type).map(node => reference(node, axis));
  const creators = new Map<string, Creator>(base.creators.map(creator => [creator.id, { ...creator }]));
  for (const node of nodes.values()) if (node.type === 'creator') {
    const id = text(node.id), handle = text(node.handle);
    creators.set(id, { id, slug: id, label: `@${handle}`, handle: `@${handle}`, href: filterHref(locale, 'creator', id), url: safeUrl(node.url), avatarUrl: null, count: 0 });
  }
  const prompts: Prompt[] = [...base.prompts];
  for (const node of nodes.values()) if (node.type === 'prompt') {
    const id = text(node.id), source = linked(id, 'sourced_from')[0];
    if (!source) throw new Error('Prompt source required');
    const title = text(node.title), body = text(node.prompt), creator = linked(id, 'created_by')[0];
    const slug = `case-${id.slice(4)}`, href = `/${locale}/prompts/${slug}`;
    const image = linked(id, 'has_example').map((item): Media => ({ id: text(item.id), kind: item.kind === 'video' ? 'video' : 'image', src: safeUrl(item.url), alt: optionalText(item.alt) ?? title, width: null, height: null, poster: null, label: null }));
    const attribution = creator ? `@${text(creator.handle)}` : optionalText(source.attributionLabel) ?? '';
    const docs = linked(id, 'documented_at').map(item => ({ type: 'Collection documentation', url: safeUrl(item.url), confidence: null }));
    prompts.push({
      id, slug, href, locale, title, summary: optionalText(node.summary) ?? title, prompt: body,
      language: (body.match(/[\u3400-\u9fff]/gu)?.length ?? 0) > (body.match(/[a-z]/giu)?.length ?? 0) ? 'zh-CN' : 'en',
      kind: linked(id, 'used_for').some(item => item.slug === 'website') ? 'other' : 'image',
      models: refs(id, 'designed_for', 'model'), useCases: refs(id, 'used_for', 'useCase'), styles: refs(id, 'has_style', 'style'), subjects: refs(id, 'has_subject', 'subject'), techniques: [],
      handle: attribution, creatorRef: creator ? { id: text(creator.id), slug: text(creator.id), label: attribution } : null,
      img: image.find(item => item.kind === 'image')?.src ?? null, media: image,
      likes: null, saves: null, views: null, highValue: false, score: null, publishedAt: optionalText(source.publishedAt),
      variables: [...new Set(body.match(/\[[A-Z][A-Z0-9_]{1,48}\]/gu) ?? [])].map(token => ({ token, label: token.slice(1,-1).replaceAll('_', ' '), defaultValue: '', options: [], note: null, required: false })),
      steps: [], requiredInputs: [], optionalInputs: [], parameters: [],
      source: { url: safeUrl(source.url), platform: text(source.platform), observedAt: optionalText(source.observedAt) }, evidence: docs,
      actions: { canCopy: true, tryUrl: null }, localeVariants: [{ locale, slug, href }],
      seo: { title, description: (optionalText(node.summary) ?? title).slice(0, 240), canonicalUrl: null, robots: 'noindex,nofollow', hreflang: {} }, revision, appearsOn: ['l1','l2','l3','l4'], featuredOn: [],
    });
  }
  const websites: WebsiteCase[] = [];
  for (const node of nodes.values()) {
    const id = text(node.id);
    if (!['prompt', 'website-case'].includes(text(node.type)) || !linked(id, 'used_for').some(item => item.slug === 'website')) continue;
    const source = linked(id, 'sourced_from')[0]; if (!source) throw new Error('Website source required');
    const preview = object(previews[text(source.sourceId)]), cover = text(preview.src);
    if (!/^\/website-previews\/[0-9]+\.(?:jpg|jpeg|png|webp)$/u.test(cover)) throw new Error('Invalid Website preview asset');
    const slug = id, creator = linked(id, 'created_by')[0];
    const target = (type: string) => { const ref = linked(id,type)[0]; return ref ? safeUrl(ref.url) : null; };
    websites.push({ id, slug, href: `/${locale}/prompts/website/${slug}`, title: text(node.title), summary: optionalText(node.summary) ?? '', cover,
      attribution: creator ? `@${text(creator.handle)}` : optionalText(source.attributionLabel) ?? 'Source', source: { url: safeUrl(source.url), platform: text(source.platform) },
      models: refs(id,'designed_for','model'), useCases: refs(id,'used_for','useCase'), tools: linked(id,'built_with').map(item => text(item.label)),
      demoUrl: target('has_demo'), codeUrl: target('has_code'), promptHref: prompts.find(prompt => prompt.id === id)?.href ?? null,
      relatedSources: linked(id,'related_to').map(item => safeUrl(item.url)),
    });
  }
  for (const axis of Object.keys(axes) as Axis[]) for (const ref of registries[axis].values()) ref.count = prompts.filter(prompt => prompt[axes[axis]].some(term => term.id === ref.id)).length;
  for (const creator of creators.values()) creator.count = prompts.filter(prompt => prompt.creatorRef?.id === creator.id).length;
  return { ...base, mode: 'git-beta', revision, observedAt: '2026-10-14T04:00:00.000Z', prompts, websites,
    models: [...registries.model.values()], useCases: [...registries.useCase.values()], styles: [...registries.style.values()], subjects: [...registries.subject.values()], techniques: [...registries.technique.values()], creators: [...creators.values()] };
}
