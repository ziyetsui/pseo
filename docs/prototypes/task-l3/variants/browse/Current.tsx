import type { Catalog } from '@/lib/catalog/types';
import { HubBand } from '../../browse-neighbors';

/* Baseline: the shipped band, unchanged — the same HubBand the neighbouring model band uses. */
export default function Current({ catalog }: { catalog: Catalog }) {
  return <HubBand catalog={catalog} axis="useCase" id="tasks" heading="Browse by task" />;
}
