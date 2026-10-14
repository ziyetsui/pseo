import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-website-views-v2', baseRevision, graph, previews })).digest('hex')}`;
}
