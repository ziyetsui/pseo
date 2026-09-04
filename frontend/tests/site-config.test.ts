import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicDataConfig, siteOrigin } from '../src/lib/catalog/config';
import robots from '../src/app/robots';

const revision = `sha256:${'a'.repeat(64)}`;
const publicEnvironment = {
  FRONTEND_DATA_MODE: 'public-api',
  FRONTEND_API_URL: 'http://127.0.0.1:8000',
  FRONTEND_EXPECTED_REVISION: revision,
};

afterEach(() => vi.unstubAllEnvs());

describe('public canonical site configuration', () => {
  it.each([undefined, '', 'http://library.example', 'https://library.example/path', 'https://library.example/path/..', 'https://library.example?x=1', 'https://library.example?', 'https://library.example#top', 'https://library.example#', 'https://user:password@library.example', 'https://@library.example', ' https://library.example', 'https://library.example\\path', 'https://localhost', 'https://127.0.0.1', 'https://[::1]'])('rejects a missing or invalid canonical origin: %s', value => {
    expect(() => publicDataConfig({ ...publicEnvironment, FRONTEND_SITE_URL: value })).toThrow('FRONTEND_SITE_URL');
  });

  it('normalizes an HTTPS origin without changing the public API config shape', () => {
    const environment = { ...publicEnvironment, FRONTEND_SITE_URL: 'https://Library.Example/' };
    expect(siteOrigin(environment)).toBe('https://library.example');
    expect(publicDataConfig(environment)).toEqual({ url: publicEnvironment.FRONTEND_API_URL, expectedRevision: revision });
  });

  it('fails public robots generation when the site origin is missing', () => {
    vi.stubEnv('FRONTEND_DATA_MODE', 'public-api');
    vi.stubEnv('FRONTEND_SITE_URL', undefined);
    expect(() => robots()).toThrow('FRONTEND_SITE_URL');
  });

  it('allows public crawling and uses the validated sitemap origin', () => {
    vi.stubEnv('FRONTEND_DATA_MODE', 'public-api');
    vi.stubEnv('FRONTEND_SITE_URL', 'https://library.example/');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: 'https://library.example/sitemap.xml' });
  });

  it('keeps visual fixtures blocked without requiring a public origin', () => {
    vi.stubEnv('FRONTEND_DATA_MODE', 'visual-fixture');
    vi.stubEnv('FRONTEND_SITE_URL', undefined);
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});
