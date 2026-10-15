type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid creator avatar record');
  return value as RecordValue;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Missing creator avatar field');
  return value;
}
export function creatorHandle(value: string): string {
  return value.trim().replace(/^@/u, '').toLowerCase();
}

/** Verified Git-beta profile metadata; never substitutes for CMS/public-api data. */
export function creatorAvatarIndex(input: unknown): Map<string, string> {
  const manifest = object(input);
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported creator avatar schema');
  const index = new Map<string, string>();
  for (const [key, value] of Object.entries(object(manifest.profiles))) {
    const record = object(value), handle = text(record.handle), src = text(record.src), hash = text(record.sha256);
    if (!/^[a-z0-9_]{1,15}$/u.test(key) || creatorHandle(handle) !== key) throw new Error('Creator avatar identity mismatch');
    const profile = new URL(text(record.profileUrl));
    const profileHandle = profile.pathname.replace(/^\//u, '').replace(/\/$/u, '');
    if (profile.protocol !== 'https:' || profile.hostname !== 'x.com' || profile.username || profile.password || profile.search || profile.hash || !/^[a-zA-Z0-9_]{1,15}$/u.test(profileHandle)) throw new Error('Invalid X profile URL');
    if (profileHandle.toLowerCase() !== key) {
      const source = new URL(text(record.sourceTweetUrl));
      if (record.evidenceKind !== 'tweet-author' || !['x.com', 'twitter.com'].includes(source.hostname) || source.protocol !== 'https:' || !new RegExp(`^/${key}/status/[0-9]+$`, 'iu').test(source.pathname) || source.username || source.password) throw new Error('Renamed X profile requires original-post evidence');
    }
    if (record.userId !== null && !/^[0-9]+$/u.test(text(record.userId))) throw new Error('Invalid X user identity');
    const image = new URL(text(record.imageUrl));
    if (image.protocol !== 'https:' || !['pbs.twimg.com', 'abs.twimg.com'].includes(image.hostname) || image.username || image.password || !/^\/(?:profile_images|sticky\/default_profile_images)\//u.test(image.pathname)) throw new Error('Invalid X avatar image URL');
    if (!/^[a-f0-9]{64}$/u.test(hash) || !new RegExp(`^/creator-avatars/${key}-${hash.slice(0, 12)}\\.(jpg|png|webp|gif)$`, 'u').test(src)) throw new Error('Invalid local creator avatar asset');
    if (!['x-profile', 'archived-author', 'tweet-author', 'existing-x-avatar'].includes(text(record.evidenceKind))) throw new Error('Missing X avatar evidence');
    index.set(key, src);
  }
  return index;
}
