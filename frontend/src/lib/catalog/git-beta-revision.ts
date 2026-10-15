import { createHash } from 'node:crypto';
export function gitBetaRevision(baseRevision: string, graph: unknown, previews: unknown, displayCopy: unknown = {}, creatorAvatars: unknown = {}, promptBodies: unknown = {}, websiteTemplates: unknown = {}, websiteCategories: unknown = {}, queenieImages: unknown = {}): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ policy: 'owner-authorized-git-beta-queenie-images-v11', baseRevision, graph, previews, displayCopy, creatorAvatars, promptBodies, websiteTemplates, websiteCategories, queenieImages })).digest('hex')}`;
}
