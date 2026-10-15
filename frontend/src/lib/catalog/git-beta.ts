import displayCopy from '../../data/localized-case-copy.json';
import avatarInput from '../../data/creator-avatars.json';
import { gitBetaCreatorAvatar } from './creator-avatars';
import graphInput from '../../../../docs/intake/2026-10-14-website-supplement/combined-graph.json';
import previewInput from '../../data/website-previews.json';
import { createFixtureCatalog } from './fixture';
import {localizedGitCatalog} from './localized';
import { gitBetaRevision } from './git-beta-revision';
import { websiteEntries } from './website';
import { placeholderTokens } from './placeholders';
import { filterHref, modelHref } from './query';
import type { Axis, Catalog, Creator, Locale, Media, Prompt, Ref, WebsiteCase, WebsiteGraph } from './types';

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
  if (locale !== 'zh-CN' && locale !== 'en') throw new Error('Unsupported library locale');
  const base = createFixtureCatalog('zh-CN'), graph = object(graphInput), previews = object(previewInput);
  const sourceLocale = 'zh-CN';
  const revision = gitBetaRevision(base.revision, graphInput, previewInput, displayCopy, avatarInput);
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
    const ref = { id: text(node.id), slug, label: text(node.label), href: axis === 'model' ? modelHref(sourceLocale, slug) : filterHref(sourceLocale, axis, slug), count: 0 };
    registries[axis].set(slug, ref); return ref;
  };
  const refs = (id: string, type: string, axis: Axis) => linked(id, type).map(node => reference(node, axis));
  const creators = new Map<string, Creator>(base.creators.map(creator => [creator.id, { ...creator, avatarUrl: gitBetaCreatorAvatar(creator.handle, creator.avatarUrl) }]));
  for (const node of nodes.values()) if (node.type === 'creator') {
    const id = text(node.id), handle = text(node.handle);
    creators.set(id, { id, slug: id, label: `@${handle}`, handle: `@${handle}`, href: filterHref(sourceLocale, 'creator', id), url: safeUrl(node.url), avatarUrl: gitBetaCreatorAvatar(handle), count: 0 });
  }
  const prompts: Prompt[] = [...base.prompts];
  for (const node of nodes.values()) if (node.type === 'prompt') {
    const id = text(node.id), source = linked(id, 'sourced_from')[0];
    if (!source) throw new Error('Prompt source required');
    const title = text(node.title), body = text(node.prompt), creator = linked(id, 'created_by')[0];
    const slug = `case-${id.slice(4)}`, href = `/${sourceLocale}/prompts/${slug}`;
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
      variables: placeholderTokens(body).map(token => ({ token, label: token.slice(1,-1).replaceAll('_', ' '), defaultValue: '', options: [], note: null, required: false })),
      steps: [], requiredInputs: [], optionalInputs: [], parameters: [],
      source: { url: safeUrl(source.url), platform: text(source.platform), observedAt: optionalText(source.observedAt) }, evidence: docs,
      actions: { canCopy: true, tryUrl: null }, localeVariants: [{ locale, slug, href }],
      seo: { title, description: (optionalText(node.summary) ?? title).slice(0, 240), canonicalUrl: null, robots: 'noindex,nofollow', hreflang: {} }, revision, appearsOn: ['l1','l2','l3','l4'], featuredOn: [],
    });
  }
  const websites: WebsiteCase[] = [];
  for (const node of nodes.values()) {
    const id = text(node.id);
    if (node.promptOnly === true) continue;
    if (!['prompt', 'website-case'].includes(text(node.type)) || !linked(id, 'used_for').some(item => item.slug === 'website')) continue;
    const source = linked(id, 'sourced_from')[0]; if (!source) throw new Error('Website source required');
    const preview = object(previews[text(source.sourceId)]), cover = text(preview.src);
    if (!/^\/website-previews\/[0-9]+\.(?:jpg|jpeg|png|webp)$/u.test(cover)) throw new Error('Invalid Website preview asset');
    const slug = id, creator = linked(id, 'created_by')[0];
    const target = (type: string) => { const ref = linked(id,type)[0]; return ref ? safeUrl(ref.url) : null; };
    websites.push({ id, slug, href: `/${sourceLocale}/prompts/website/${slug}`, title: text(node.title), summary: optionalText(node.summary) ?? '', cover,
      attribution: creator ? `@${text(creator.handle)}` : optionalText(source.attributionLabel) ?? 'Source', source: { url: safeUrl(source.url), platform: text(source.platform) },
      models: refs(id,'designed_for','model'), useCases: refs(id,'used_for','useCase'), tools: linked(id,'built_with').map(item => text(item.label)),
      demoUrl: target('has_demo'), codeUrl: target('has_code'), promptHref: (prompts.find(prompt => prompt.id === id) ?? prompts.find(prompt => linked(prompt.id,'sourced_from').some(ref => ref.id === source.id)))?.href ?? null,
      relatedSources: linked(id,'related_to').map(item => safeUrl(item.url)),
    });
  }
  for (const axis of Object.keys(axes) as Axis[]) for (const ref of registries[axis].values()) ref.count = prompts.filter(prompt => prompt[axes[axis]].some(term => term.id === ref.id)).length;
  for (const creator of creators.values()) creator.count = prompts.filter(prompt => prompt.creatorRef?.id === creator.id).length;
  const caseEntries = websiteEntries({ ...base, prompts, websites }), caseIds = new Set(caseEntries.map(entry => entry.id));
  const websiteGraph: WebsiteGraph = { nodes: [], edges: [] };
  const websiteNodeIds = new Set(caseIds);
  for (const from of caseIds) for (const type of ['used_for', 'designed_for', 'built_with']) for (const target of linked(from,type)) {
    const to = text(target.id); websiteNodeIds.add(to); websiteGraph.edges.push({ from, to, type });
  }
  for (const id of websiteNodeIds) {
    const node = nodes.get(id);
    if (node) websiteGraph.nodes.push({ id, type: text(node.type), slug: optionalText(node.slug) ?? id, label: text(node.label ?? node.title) });
  }
  // The existing Website prompt contributes its real relationships alongside the intake objects.
  for (const entry of caseEntries.filter(entry => !nodes.has(entry.id))) {
    websiteGraph.nodes.push({ id: entry.id, type: 'prompt', slug: entry.slug, label: entry.title });
    for (const [type, refs, kind] of [['used_for', entry.useCases, 'use-case'], ['designed_for', entry.models, 'model']] as const) for (const ref of refs) {
      const existing = websiteGraph.nodes.find(node => node.type === kind && node.slug === ref.slug);
      const to = existing?.id ?? ref.id;
      if (!existing) websiteGraph.nodes.push({ id: to, type: kind, slug: ref.slug, label: ref.label });
      websiteGraph.edges.push({ from: entry.id, to, type });
    }
  }
  return localizedGitCatalog({ ...base, mode: 'git-beta', revision, observedAt: [...nodes.values()].filter(node => node.type === 'source' && typeof node.observedAt === 'string').map(node => text(node.observedAt)).sort().at(-1) ?? base.observedAt, prompts, websites, websiteGraph,
    models: [...registries.model.values()], useCases: [...registries.useCase.values()], styles: [...registries.style.values()], subjects: [...registries.subject.values()], techniques: [...registries.technique.values()], creators: [...creators.values()] },locale);
}
