import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown, displayCopy: unknown = {}, creatorAvatars: unknown = {}): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-creator-avatars-v6', baseRevision, graph, previews, displayCopy, creatorAvatars })).digest('hex')}`;
}
