import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function verifyCreatorAvatarAssets(root, avatars) {
  for (const [handle, avatar] of Object.entries(avatars)) {
    if (!/^[a-z0-9_]+$/.test(handle) || !new RegExp(`^/creator-avatars/${handle}\\.(jpg|png|webp|gif)$`).test(avatar.src)) throw new Error('Invalid creator avatar path');
    if (!/^https:\/\/pbs\.twimg\.com\/profile_images\//.test(avatar.sourceUrl) || avatar.profileUrl.toLowerCase() !== `https://x.com/${handle}`) throw new Error('Invalid creator avatar source');
    const bytes = await readFile(path.join(root, avatar.src.slice(1)));
    if (createHash('sha256').update(bytes).digest('hex') !== avatar.sha256) throw new Error('Creator avatar checksum mismatch');
  }
}

export async function verifyGitBetaAssets(root, previews) {
  for (const preview of Object.values(previews)) {
    if (!/^\/website-previews\/[0-9]+\.(?:jpg|jpeg|png|webp)$/.test(preview.src)) throw new Error('Invalid Website preview path');
    const bytes = await readFile(path.join(root, preview.src.slice(1)));
    if (createHash('sha256').update(bytes).digest('hex') !== preview.sha256) throw new Error('Website preview checksum mismatch');
  }
}

export function gitBetaReceipt(graph, reviews, baseline) {
  const sources = new Map(graph.nodes.map(node => [node.id, node]));
  const websiteIds = new Set(graph.edges.filter(edge => edge.type === 'used_for' && sources.get(edge.to)?.slug === 'website').map(edge => edge.from));
  const prompts = graph.nodes.filter(node => node.type === 'prompt');
  const images = prompts.filter(node => !websiteIds.has(node.id));
  const websites = graph.nodes.filter(node => websiteIds.has(node.id) && !node.promptOnly && ['prompt','website-case'].includes(node.type));
  const imageIds = new Set(images.map(node => node.id));
  const imageUrls = [...new Set(graph.edges.filter(edge => edge.type === 'has_example' && imageIds.has(edge.from)).map(edge => sources.get(edge.to)?.url))];
  if (imageUrls.some(url => typeof url !== 'string')) throw new Error('Git beta image endpoint missing');
  return {
    authorization: '2026-10-14-owner-direct-git-beta', cmsPublication: false,
    sourceRecords: reviews.length, importedImageRecords: reviews.filter(row => row.namespace === 'gpt-image-2').length,
    importedImagePrompts: images.length, importedImageExamples: imageUrls.length, importedWebsites: websites.length,
    imagePrompts: baseline.filter(row => row.kind === 'image').length + images.length,
    promptCount: baseline.length + prompts.length,
    supplementalWebsitePrompts: prompts.filter(node => node.promptOnly).length,
    publishedPrompts: [...baseline.map(row => ({id:row.id,href:`/zh-CN/prompts/${row.slug}`})), ...prompts.map(node => ({id:node.id,href:`/zh-CN/prompts/case-${node.id.slice(4)}`}))],
    publishedWebsites: websites.map(node => ({id:node.id,href:`/zh-CN/prompts/website/${node.id}`})),
    imageUrls,
  };
}
