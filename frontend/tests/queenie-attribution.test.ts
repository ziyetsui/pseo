import {describe, expect, it} from 'vitest';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import original from '@/data/queenie-images.json';
import {gitBetaRevision} from '@/lib/catalog/git-beta-revision';

const id = 'queenie-1-mac-mini-1-agent-0-employees-this-is-how-you-build-the-fir-zxzsys';
describe('original X image source attribution', () => {
  it.each(['en','zh-CN'] as const)('credits the original West Lord post on the %s interface', locale => {
    const catalog = createGitBetaCatalog(locale);
    const prompt = catalog.prompts.find(row => row.id === id)!;
    expect(prompt.handle).toBe('@MyWestLord');
    expect(prompt.source.url).toBe('https://x.com/MyWestLord/status/2063321372789465409');
    expect(prompt.source.platform).toBe('X');
  });
  it('replaces every imported YouMind source without changing content identity or media', () => {
    const catalog = createGitBetaCatalog('en');
    const rows = original.records.filter(row => new URL(row.sourceUrl).hostname === 'youmind.com');
    expect(rows).toHaveLength(814);
    for (const row of rows) {
      const prompt = catalog.prompts.find(prompt => prompt.id === row.id)!;
      const match = /^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\/\d+$/.exec(prompt.source.url);
      expect(match, row.id).not.toBeNull();
      expect(prompt.handle).toBe(`@${match![1]}`);
      expect(prompt.title).toBe(row.copy.en.title);
      expect(prompt.prompt).toBe(row.copy.en.prompt);
      expect(prompt.media.map(media => media.src)).toEqual(row.media.map(media => media.src));
      expect(prompt.reconstruction).toBe(true);
    }
    for (const row of original.records.filter(row => new URL(row.sourceUrl).hostname !== 'youmind.com')) {
      const prompt = catalog.prompts.find(prompt => prompt.id === row.id)!;
      expect(prompt.source.url).toBe(row.sourceUrl);
      expect(prompt.handle).toBe(row.author);
    }
  });
});

import {readQueenieDataset} from '@/lib/catalog/queenie';
import {applyOriginalXAttributions} from '@/lib/catalog/source-attribution';
const captured = original.records.find(row => row.id === id)!;
const sample = () => readQueenieDataset({...original, records:[captured]});
const mapping = () => ({version:1, observedAt:'2026-10-16T00:00:00Z', records:[{
  id, fromSourceUrl:captured.sourceUrl, sourceUpdatedAt:captured.sourceUpdatedAt,
  author:'@MyWestLord', sourceUrl:'https://x.com/MyWestLord/status/2063321372789465409', evidenceSha256:'a'.repeat(64),
}]});
describe('source correction safety', () => {
  it('changes the build revision when original attribution changes', () => {
    expect(gitBetaRevision('base',{},{},{},{},{},{},{},{},mapping())).not.toBe(gitBetaRevision('base',{},{},{},{},{},{},{},{},{}));
  });
  it('binds corrections to captured identity and preserves the original snapshot', () => {
    const before=sample(), after=applyOriginalXAttributions(before,mapping());
    expect(before.records[0]!.sourceUrl).toBe('https://youmind.com/zh-CN/landing/x-viral-articles/build-billion-dollar-solo-ai-company');
    expect(after.records[0]!.sourceUrl).toBe('https://x.com/MyWestLord/status/2063321372789465409');
    expect(after.records[0]!.copy).toEqual(before.records[0]!.copy);
  });
  it('rejects missing, duplicate, stale and mismatched-author source corrections', () => {
    const missing=mapping();missing.records=[];expect(()=>applyOriginalXAttributions(sample(),missing)).toThrow(/Missing/);
    const duplicate=mapping();duplicate.records.push(duplicate.records[0]!);expect(()=>applyOriginalXAttributions(sample(),duplicate)).toThrow(/duplicate/);
    const stale=mapping();stale.records[0]!.fromSourceUrl='https://youmind.com/another';expect(()=>applyOriginalXAttributions(sample(),stale)).toThrow(/Stale/);
    const author=mapping();author.records[0]!.author='@AnotherAuthor';expect(()=>applyOriginalXAttributions(sample(),author)).toThrow(/agree/);
    const unsafe=mapping();unsafe.records[0]!.sourceUrl='https://x.com.evil.example/MyWestLord/status/2063321372789465409';expect(()=>applyOriginalXAttributions(sample(),unsafe)).toThrow(/agree/);
  });
});
