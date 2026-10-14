import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-bilingual-library-v4', baseRevision, graph, previews })).digest('hex')}`;
}
