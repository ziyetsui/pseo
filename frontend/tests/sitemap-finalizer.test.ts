import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/finalize-export.mjs', import.meta.url));
const loc = 'https://example.com/en/prompts';
function verify({ robots = '<meta name="robots" content="index,follow">', canonical = `<link rel="canonical" href="${loc}">`, location = loc, missing = false, duplicate = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'pseo-sitemap-finalizer-'));
  mkdirSync(path.join(root, 'en'));
  if (!missing) writeFileSync(path.join(root, 'en/prompts.html'), `<html><head>${robots}${canonical}</head><body><main><h1>Library</h1></main></body></html>`);
  const entry = `<url><loc>${location}</loc></url>`;
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entry}${duplicate ? entry : ''}</urlset>`;
  const invocation = `import {pathToFileURL} from 'node:url'; const {verifySitemapHtml}=await import(pathToFileURL(process.argv[2]).href); await verifySitemapHtml(process.argv[4], process.argv[3], 'https://example.com');`;
  try { return spawnSync(process.execPath, ['--input-type=module', '-e', invocation, 'sitemap-check', script, root, xml], { encoding: 'utf8' }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

describe('sitemap/HTML export consistency gate', () => {
  it('accepts one matching canonical and default indexability', () => {
    expect(verify().status).toBe(0);
    expect(verify({ robots: '' }).status).toBe(0);
  });
  it.each([
    '<meta name="robots" content="noindex,follow">',
    '<meta name="robots" content="INDEX,FOLLOW"><meta name="Googlebot" content="NOINDEX">',
    '<meta name="robots" content="none">',
  ])('rejects a sitemap URL blocked by HTML robots: %s', robots => {
    const result = verify({ robots });
    expect(result.status).toBe(1); expect(result.stderr).toContain('noindex in its HTML');
  });
  it.each(['', '<link rel="canonical" href="https://example.com/en/other">', `<link rel="canonical" href="${loc}"><link rel="canonical" href="${loc}">`])('rejects absent, mismatched, or duplicate canonical: %s', canonical => {
    const result = verify({ canonical });
    expect(result.status).toBe(1); expect(result.stderr).toContain('does not match its HTML canonical');
  });
  it('rejects another origin, duplicate loc, and missing HTML', () => {
    expect(verify({ location: 'https://other.example/en/prompts' }).stderr).toContain('canonical site origin');
    expect(verify({ duplicate: true }).stderr).toContain('Duplicate sitemap URL');
    expect(verify({ missing: true }).status).toBe(1);
  });
});
