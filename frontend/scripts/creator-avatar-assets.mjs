import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { creatorAvatarIndex } from '../src/lib/catalog/creator-avatars.ts';

export async function verifyCreatorAvatarAssets(root, manifest) {
  const index = creatorAvatarIndex(manifest);
  for (const [handle, src] of index) {
    const bytes = await readFile(path.join(root, src.slice(1)));
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.profiles[handle].sha256) throw new Error(`Creator avatar checksum mismatch: ${handle}`);
  }
  return index.size;
}
