import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { gitBetaRevision } from '@/lib/catalog/git-beta-revision';
import { Creators } from '@/components/Browse';
import avatarInput from '@/data/creator-avatars.json';
import { creatorAvatarIndex } from '@/lib/catalog/creator-avatars';

describe('real X creator avatars', () => {
  it('renders local X profile images for the eight initially visible creators', () => {
    const catalog = createGitBetaCatalog('en');
    const section = parse(renderToStaticMarkup(<Creators catalog={catalog} />));
    const cards = section.querySelectorAll('.creator-preview a.person');
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      expect(card.querySelector('img')?.getAttribute('src')).toMatch(/^\/creator-avatars\/[a-z0-9_]+-[a-f0-9]{12}\.(jpg|png|webp|gif)$/u);
    }
  });

  it('uses the same account images in both languages without changing creator identity or counts', () => {
    const en = createGitBetaCatalog('en'), zh = createGitBetaCatalog('zh-CN');
    expect(en.creators.map(c => [c.id, c.handle, c.count, c.avatarUrl])).toEqual(zh.creators.map(c => [c.id, c.handle, c.count, c.avatarUrl]));
    expect(en.creators.filter(c => c.count > 0)).toHaveLength(347);
    expect(en.creators.every(c => c.avatarUrl === null || c.avatarUrl.startsWith('/creator-avatars/'))).toBe(true);
  });

  it('accounts for every active creator with a verified image or an explicit unavailable record', () => {
    const catalog = createGitBetaCatalog('en');
    const available = creatorAvatarIndex(avatarInput);
    const unavailable = new Set(Object.keys(avatarInput.unavailable));
    for (const creator of catalog.creators.filter(c => c.count > 0)) {
      const handle = creator.handle.replace(/^@/u, '').toLowerCase();
      expect(available.has(handle) || unavailable.has(handle), handle).toBe(true);
      expect(available.has(handle) && unavailable.has(handle), handle).toBe(false);
    }
  });

  it('changes the snapshot revision when verified avatar metadata changes', () => {
    expect(gitBetaRevision('base', {}, {}, {}, { profile: 'first' })).not.toBe(gitBetaRevision('base', {}, {}, {}, { profile: 'second' }));
  });

  it('rejects images assigned to an unrelated X profile or an unsafe asset path', () => {
    const profile = avatarInput.profiles.mrlarus;
    for (const mutation of [{ profileUrl: 'https://x.com/unrelated_user' }, { src: '/creator-avatars/../../private.png' }, { imageUrl: 'https://example.com/face.png' }]) {
      expect(() => creatorAvatarIndex({ schemaVersion: 1, profiles: { mrlarus: { ...profile, ...mutation } } })).toThrow();
    }
  });

  it('fails deployment validation if a downloaded avatar is changed', async () => {
    const { mkdtemp, mkdir, readFile, writeFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const { verifyCreatorAvatarAssets } = await import('../scripts/creator-avatar-assets.mjs');
    const profile = avatarInput.profiles.mrlarus;
    const manifest = { schemaVersion: 1, profiles: { mrlarus: profile } };
    const root = await mkdtemp(path.join(tmpdir(), 'creator-avatar-test-'));
    try {
      await mkdir(path.join(root, 'creator-avatars'));
      const target = path.join(root, profile.src.slice(1));
      await writeFile(target, await readFile(path.join(process.cwd(), 'public', profile.src.slice(1))));
      await expect(verifyCreatorAvatarAssets(root, manifest)).resolves.toBe(1);
      await writeFile(target, 'corrupted image');
      await expect(verifyCreatorAvatarAssets(root, manifest)).rejects.toThrow('checksum mismatch');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
