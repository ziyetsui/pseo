import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/check-static-output.mjs', import.meta.url));
function check(link: string) {
  const directory = mkdtempSync(join(tmpdir(), 'pseo-navigation-'));
  const out = join(directory, 'out');
  mkdirSync(out);
  const html = (body: string) => `<html><head><meta name="robots" content="noindex,nofollow"></head><body><main id="main"><h1>Library</h1>${body}</main></body></html>`;
  writeFileSync(join(out, 'index.html'), html(`<a href="${link}">Browse</a>`));
  writeFileSync(join(out, 'other.html'), html('<section id="结果">Results</section>'));
  writeFileSync(join(out, '404.html'), html('Not found'));
  writeFileSync(join(out, 'frontend-build.json'), JSON.stringify({ mode: 'visual-fixture', revision: 'test' }));
  writeFileSync(join(out, '_headers'), '/*\n  X-Robots-Tag: noindex');
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /');
  try { return spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

describe('exported HTML anchor validation', () => {
  it.each(['#main', '/other?style=cinematic#main', '/other#%E7%BB%93%E6%9E%9C', '/#main'])('accepts existing destination %s', href => {
    expect(check(href).status).toBe(0);
  });
  it.each(['#missing', '/other#missing'])('rejects missing anchor %s even when its route exists', href => {
    const result = check(href);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Broken internal anchor ${href}`);
  });
  it('continues to reject a placeholder link', () => {
    const result = check('#');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Placeholder navigation');
  });
});

function checkPublicNavigation(route: string) {
  const directory = mkdtempSync(join(tmpdir(), 'pseo-public-navigation-'));
  const out = join(directory, 'out');
  mkdirSync(join(out, 'zh-CN/prompts'), { recursive: true });
  mkdirSync(join(directory, 'src/data'), { recursive: true });
  const html = '<html><head><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Navigation</h1></main></body></html>';
  for (const name of ['index.html', '404.html', `zh-CN/prompts/${route}.html`]) writeFileSync(join(out, name), html);
  writeFileSync(join(out, 'frontend-build.json'), JSON.stringify({ mode: 'public-api', revision: 'test', publicPrompts: [] }));
  writeFileSync(join(directory, 'src/data/prototype.json'), JSON.stringify({ prompts: [] }));
  try { return spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

describe('public category route boundary', () => {
  it('accepts the Website navigation surface without treating it as an unapproved prompt', () => {
    expect(checkPublicNavigation('website').status).toBe(0);
  });
  it('still rejects an unapproved prompt detail route', () => {
    const result = checkPublicNavigation('unapproved-prompt');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Prompt route is not in the approved API receipt');
  });
});
