import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown, displayCopy: unknown = {}): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-localized-case-copy-v5', baseRevision, graph, previews, displayCopy })).digest('hex')}`;
}
