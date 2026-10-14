import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import graph from '../../docs/intake/2026-10-14/graph.json';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteEntries } from '@/lib/catalog/website';
import { websiteViews, websiteViewForPath, websiteViewEntries, websiteViewsForCase } from '@/lib/catalog/website-views';
import { WebsiteGallery, WebsiteViewGallery, WebsiteCaseDetail } from '@/components/WebsiteCases';
import { Recipe } from '@/components/Recipe';
import { catalogPaths } from '@/site/routes';
import { siteMetadata } from '@/site/metadata';

const catalog = createGitBetaCatalog('zh-CN');
const views = websiteViews(catalog);
describe('Website graph projections', () => {
  it('projects actual used_for, designed_for and built_with edges to independent views', () => {
    const importedIds = new Set(catalog.websites?.map(entry => entry.id));
    for (const view of views.filter(view => view.axis !== 'all')) {
      const expected = new Set(graph.edges.filter(edge => edge.type === view.relation && edge.to === view.targetId && importedIds.has(edge.from)).map(edge => edge.from));
      expect(new Set(view.caseIds.filter(id => importedIds.has(id)))).toEqual(expected);
      expect(view.count).toBe(new Set(view.caseIds).size);
      expect(view.count).toBeGreaterThan(0);
      expect(catalogPaths(catalog)).toContain(view.href);
      expect(websiteViewForPath(catalog,view.href)).toEqual(view);
    }
    expect(views.find(view => view.axis === 'model' && view.slug === 'claude')?.count).toBe(28);
    expect(views.find(view => view.axis === 'model' && view.slug === 'codex')?.count).toBe(7);
    expect(views.find(view => view.axis === 'tool' && view.slug === 'three-js')?.count).toBe(36);
    expect(views.find(view => view.axis === 'use-case' && view.slug === 'website-fun')?.count).toBe(19);
    expect(new Set(views.map(view => view.href)).size).toBe(views.length);
  });
  it('keeps every case reachable and counts the existing prompt with its genuine relationships', () => {
    const all = views.find(view => view.axis === 'all')!;
    expect(websiteViewEntries(catalog,all)).toHaveLength(60);
    const importedIds = new Set(catalog.websites?.map(entry => entry.id));
    const baseline = websiteEntries(catalog).filter(entry => !importedIds.has(entry.id));
    expect(baseline).toHaveLength(1);
    for (const entry of websiteEntries(catalog)) {
      const related = websiteViewsForCase(catalog,entry.id);
      expect(related.length).toBeGreaterThan(0);
      for (const view of related) expect(websiteViewEntries(catalog,view).map(item => item.id)).toContain(entry.id);
    }
    for (const entry of baseline) expect(websiteViewsForCase(catalog,entry.id).filter(view => view.axis === 'use-case').map(view => view.slug).sort()).toEqual(entry.useCases.filter(ref => ref.slug !== 'website').map(ref => ref.slug).sort());
    for (const entry of baseline) {
      const prompt = catalog.prompts.find(prompt => prompt.id === entry.id)!;
      const detail = parse(renderToStaticMarkup(<Recipe catalog={catalog} prompt={prompt} />));
      for (const view of websiteViewsForCase(catalog, entry.id)) expect(detail.querySelectorAll('a').some(link => link.getAttribute('href') === view.href)).toBe(true);
    }
  });
  it('renders a directory, scoped case HTML and real related-view links', () => {
    const directory = parse(renderToStaticMarkup(<WebsiteGallery catalog={catalog} />));
    expect(directory.querySelectorAll('[data-website-case]')).toHaveLength(0);
    expect(directory.querySelectorAll('[data-website-view]')).toHaveLength(views.length);
    for (const axis of ['model','use-case','tool']) expect(directory.querySelectorAll(`[data-view-axis="${axis}"]`).length).toBeGreaterThan(0);
    const view = views.find(view => view.slug === 'website-fun')!;
    const scoped = parse(renderToStaticMarkup(<WebsiteViewGallery catalog={catalog} view={view} />));
    expect(scoped.querySelectorAll('form input[disabled], form select[disabled], form button[disabled]')).toHaveLength(4);
    expect(new Set(scoped.querySelectorAll('[data-website-case]').map(element => element.getAttribute('data-website-case')))).toEqual(new Set(view.caseIds));
    const entry = websiteViewEntries(catalog,view)[0]!;
    const detail = parse(renderToStaticMarkup(<WebsiteCaseDetail catalog={catalog} entry={entry} />));
    expect(detail.querySelectorAll('a').some(link => link.getAttribute('href') === view.href)).toBe(true);
    expect(detail.querySelectorAll('a').some(link => link.getAttribute('href')?.includes('/website?'))).toBe(false);
    expect(siteMetadata(catalog,view.href,'The library').title).toContain(view.label);
    expect(siteMetadata(catalog,view.href,'The library').description).toContain(String(view.count));
    expect(siteMetadata(catalog,view.href,'The library').robots).toEqual({index:false,follow:false});
    expect(websiteViewForPath(catalog,'/zh-CN/prompts/website/views/tool/not-real')).toBeNull();
  });
  it('deduplicates edge membership and refuses dangling, mistyped or conflicting graph identities', () => {
    const original = catalog.websiteGraph!;
    const duplicateEdges = { ...catalog, websiteGraph:{...original,edges:[...original.edges,...original.edges]} };
    expect(websiteViews(duplicateEdges)).toEqual(views);
    expect(() => websiteViews({...catalog, websiteGraph:{...original,nodes:[...original.nodes,original.nodes[0]!]}})).toThrow('Duplicate');
    expect(() => websiteViews({...catalog, websiteGraph:{...original,edges:[...original.edges,{from:original.nodes[0]!.id,to:'unknown',type:'used_for'}]}})).toThrow('Dangling');
    const edge = original.edges.find(edge => edge.type === 'designed_for')!;
    expect(() => websiteViews({...catalog, websiteGraph:{...original,nodes:original.nodes.map(node => node.id === edge.to ? {...node,type:'tool'} : node)}})).toThrow('wrong target');
  });
});
