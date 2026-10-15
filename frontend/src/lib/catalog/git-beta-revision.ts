import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown, displayCopy: unknown = {}, creatorAvatars: unknown = {}, promptBodies: unknown = {}, websiteTemplates: unknown = {}): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-website-templates-v9', baseRevision, graph, previews, displayCopy, creatorAvatars, promptBodies, websiteTemplates })).digest('hex')}`;
}
