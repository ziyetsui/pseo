import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function verifyXArticleCovers(root, manifest, articles) {
  const ids = new Set(articles.map(article => article.id));
  const covered = Object.keys(manifest.assets);
  const classified = [...covered, ...manifest.missingIds];
  if (classified.length !== ids.size || new Set(classified).size !== ids.size || classified.some(id => !ids.has(id))) throw Error('Incomplete X Article cover snapshot');
  for (const [id, cover] of Object.entries(manifest.assets)) {
    if (!new RegExp(`^/x-article-covers/${id}\\.(jpg|jpeg|png|webp)$`).test(cover.src) || !/^https:\/\/pbs\.twimg\.com\/media\//.test(cover.sourceImageUrl) || !Number.isSafeInteger(cover.width) || cover.width <= 0 || !Number.isSafeInteger(cover.height) || cover.height <= 0) throw Error(`Invalid X Article cover: ${id}`);
    const bytes = await readFile(path.join(root, cover.src.slice(1)));
    if (createHash('sha256').update(bytes).digest('hex') !== cover.sha256) throw Error(`X Article cover checksum mismatch: ${id}`);
  }
  return covered.length;
}
