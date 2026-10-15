import {websiteMembership,websitePurposeDefinitions,websitePurposeReference} from './website-taxonomy';
import type { Catalog, WebsiteCase, WebsiteView, WebsiteViewAxis } from './types';
import { websiteEntries, websiteRef } from './website';

const relations: Record<string, Exclude<WebsiteViewAxis, 'all'>> = { used_for: 'use-case', designed_for: 'model', built_with: 'tool' };

/** A view is an edge traversal over stable objects, not another content node. */
export function websiteViews(catalog: Catalog): WebsiteView[] {
  if (catalog.mode !== 'git-beta') return [];
  const entries = websiteEntries(catalog), ids = new Set(entries.map(entry => entry.id)), root = `${websiteRef(catalog).href}/views`;
  const all: WebsiteView = { id: 'website-view:all', slug: 'all', label: catalog.locale==='zh-CN'?'全部网站案例':'All website cases', href: `${root}/all`, count: ids.size, axis: 'all', targetId: null, relation: null, caseIds: [...ids] };
  if(Object.keys(websiteMembership).length!==ids.size||Object.entries(websiteMembership).some(([id,slug])=>!ids.has(id)||!websitePurposeDefinitions.some(definition=>definition.slug===slug)))throw new Error('Website categories do not cover the collection');
  const purposes:WebsiteView[]=websitePurposeDefinitions.map(definition=>{const members=entries.filter(entry=>websiteMembership[entry.id]===definition.slug);const ref=websitePurposeReference(catalog.locale,members[0]!.id);return {...ref,axis:'use-case',targetId:ref.id,relation:'used_for',count:members.length,caseIds:members.map(entry=>entry.id)};});
  const graph = catalog.websiteGraph;
  if (!graph) throw new Error('Website views require a graph');
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  if (nodes.size !== graph.nodes.length) throw new Error('Duplicate Website graph node');
  const views = new Map<string, WebsiteView>();
  for (const edge of graph.edges) {
    const source = nodes.get(edge.from), target = nodes.get(edge.to);
    if (!source || !target) throw new Error('Dangling Website view edge');
    const axis = relations[edge.type];
    if (!axis || !ids.has(edge.from)) continue;
    if (target.type !== axis) throw new Error('Website view relation has wrong target type');
    if (axis === 'use-case') continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target.slug)) throw new Error('Invalid Website view slug');
    const key = `${axis}:${target.id}`;
    const view = views.get(key) ?? { id: `website-view:${key}`, slug: target.slug, label: target.label, href: `${root}/${axis}/${target.slug}`, count: 0, axis, targetId: target.id, relation: edge.type, caseIds: [] };
    if (!view.caseIds.includes(edge.from)) { view.caseIds.push(edge.from); view.count++; }
    views.set(key, view);
  }
  const result = [...views.values()].sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));
  if (new Set(result.map(view => view.href)).size !== result.length) throw new Error('Conflicting Website view route');
  return [all, ...purposes, ...result];
}

export function websiteViewForPath(catalog: Catalog, path: string): WebsiteView | null {
  return websiteViews(catalog).find(view => view.href === path) ?? null;
}
export function websiteViewEntries(catalog: Catalog, view: WebsiteView): WebsiteCase[] {
  const ids = new Set(view.caseIds);
  return websiteEntries(catalog).filter(entry => ids.has(entry.id)).map(entry=>({...entry,useCases:[websitePurposeReference(catalog.locale,entry.id)]}));
}
export function websiteViewsForCase(catalog: Catalog, id: string): WebsiteView[] {
  return websiteViews(catalog).filter(view => view.axis !== 'all' && view.caseIds.includes(id));
}
