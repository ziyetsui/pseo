import type { WebsiteCase } from './types';
export interface WebsiteFilters { q?: string; model?: string; purpose?: string }
export function filterWebsiteCases(rows: WebsiteCase[], filters: WebsiteFilters): WebsiteCase[] {
  const q = filters.q?.trim().toLowerCase();
  return rows.filter(item => (!q || [item.title, item.summary, ...(item.searchLabels ?? []), item.attribution, ...item.tools].join(' ').toLowerCase().includes(q))
    && (!filters.model || item.models.some(ref => ref.slug === filters.model))
    && (!filters.purpose || item.useCases.some(ref => ref.slug === filters.purpose)));
}
