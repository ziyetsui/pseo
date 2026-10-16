import type {QueenieDataset} from './queenie';

type Attribution = {id:string; fromSourceUrl:string; sourceUpdatedAt:string; author:string; sourceUrl:string};
const intermediary = (url:string) => new URL(url).hostname === 'youmind.com';
function object(value:unknown):Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Source attribution object required');
  return value as Record<string,unknown>;
}
function text(value:unknown):string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Source attribution text required');
  return value;
}

/** A verified display correction; the captured source snapshot stays immutable. */
export function applyOriginalXAttributions(dataset:QueenieDataset, input:unknown):QueenieDataset {
  const value = object(input);
  if (value.version !== 1 || !Array.isArray(value.records) || !Number.isFinite(Date.parse(text(value.observedAt)))) throw new Error('Source attribution contract required');
  const originals = new Map(dataset.records.map(row => [row.id,row]));
  const replacements = new Map<string,Attribution>();
  for (const entry of value.records) {
    const row = object(entry), id = text(row.id), previous = originals.get(id);
    if (!previous || !intermediary(previous.sourceUrl) || replacements.has(id)) throw new Error('Unknown or duplicate source attribution');
    const fromSourceUrl = text(row.fromSourceUrl), sourceUpdatedAt = text(row.sourceUpdatedAt);
    if (fromSourceUrl !== previous.sourceUrl || sourceUpdatedAt !== previous.sourceUpdatedAt) throw new Error('Stale source attribution');
    const sourceUrl = text(row.sourceUrl), author = text(row.author);
    const match = /^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\/\d+$/.exec(sourceUrl);
    if (!match || author !== `@${match[1]}`) throw new Error('Original X author and post must agree');
    if (!/^[a-f0-9]{64}$/.test(text(row.evidenceSha256))) throw new Error('Source evidence hash required');
    replacements.set(id,{id,fromSourceUrl,sourceUpdatedAt,sourceUrl,author});
  }
  return {...dataset,records:dataset.records.map(row => {
    if (!intermediary(row.sourceUrl)) return row;
    const replacement = replacements.get(row.id);
    if (!replacement) throw new Error(`Missing original X attribution: ${row.id}`);
    return {...row,sourceUrl:replacement.sourceUrl,author:replacement.author};
  })};
}
