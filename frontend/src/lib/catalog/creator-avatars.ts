import avatarInput from '@/data/creator-avatars.json';

type Avatar = { src: string; sourceUrl: string; profileUrl: string; checkedAt: string; sha256: string };
const avatars: Record<string, Avatar> = avatarInput;

export function gitBetaCreatorAvatar(handle: string, fallback: string | null = null): string | null {
  return avatars[handle.trim().replace(/^@/, '').toLowerCase()]?.src ?? fallback;
}
