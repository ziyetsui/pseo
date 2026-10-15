import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/git-beta-receipt.mjs', import.meta.url));
describe('Git beta export assets', () => {
  it('rejects a changed local creator photo before recording a deployment receipt', () => {
    const root = mkdtempSync(join(tmpdir(), 'git-beta-avatar-'));
    mkdirSync(join(root, 'creator-avatars'));
    writeFileSync(join(root, 'creator-avatars/author.jpg'), 'changed');
    const invoke = `const {verifyCreatorAvatarAssets}=await import(process.argv[1]);await verifyCreatorAvatarAssets(process.argv[2],{author:{src:'/creator-avatars/author.jpg',sourceUrl:'https://pbs.twimg.com/profile_images/1/a.jpg',profileUrl:'https://x.com/author',sha256:'0'.repeat(64)}});`;
    try {
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', invoke, script, root], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Creator avatar checksum mismatch');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('rejects stale or missing preview assets before recording a deployment receipt', () => {
    const root = mkdtempSync(join(tmpdir(), 'git-beta-preview-'));
    mkdirSync(join(root, 'website-previews'));
    writeFileSync(join(root, 'website-previews/1.jpg'), 'changed');
    const invoke = `const {verifyGitBetaAssets}=await import(process.argv[1]); await verifyGitBetaAssets(process.argv[2],{'1':{src:'/website-previews/1.jpg',sha256:'0'.repeat(64)}});`;
    try {
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', invoke, script, root], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Website preview checksum');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
