import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown, displayCopy: unknown = {}, creatorAvatars: unknown = {}, promptBodies: unknown = {}): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-chinese-prompt-bodies-v8', baseRevision, graph, previews, displayCopy, creatorAvatars, promptBodies })).digest('hex')}`;
}
