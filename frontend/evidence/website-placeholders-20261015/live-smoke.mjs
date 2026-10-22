import { parse } from 'node-html-parser';
import { writeFile } from 'node:fs/promises';
const cases = [
  ['case-7d46d699adedf29269d0660aa4086291', '[PROJECT_NAME]'],
  ['case-7dd3d40264159ae96b96e5610d2f6f6b', '[BRAND_NAME]'],
  ['case-d29e2da62ee84fe089a7dfa0345199de', '[WORLD_REFERENCE]'],
];
const checks = [];
for (const [slug, expected] of cases) for (const locale of ['en', 'zh-CN']) {
  const url = `https://beta.ancher.site/${locale}/prompts/${slug}`;
  const response = await fetch(url);
  const document = parse(await response.text());
  const body = document.querySelector('[data-prompt]')?.textContent;
  const variables = document.querySelectorAll('.varset p .var').map(node => node.textContent);
  const generation = document.querySelector('[data-generation-cta]')?.getAttribute('href');
  const caption = document.querySelector('.payload-bar .how')?.textContent;
  if (response.status !== 200 || !body?.includes(expected) || !variables.includes(expected)) throw new Error(`Missing template: ${url}`);
  if (!generation || new URL(generation).searchParams.get('prompts') !== body) throw new Error(`Generation differs: ${url}`);
  if (caption === 'Word for word, as published.' || !document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex')) throw new Error(`Invalid publication copy: ${url}`);
  if (slug.includes('d29e') && (variables.includes('[UI]') || !body.includes('[UI]'))) throw new Error(`Technical heading changed: ${url}`);
  checks.push({ url, status: response.status, variables, fullPromptGenerationMatches: true, noindex: true });
}
const receipt = { recordedAt: new Date().toISOString(), pr: 'https://github.com/ziyetsui/pseo/pull/39', mergeCommit: 'debdf8b5aef9ef6559efb7a3ef654d0682675ee1', tests: 234, browserChecks: 6, staticPages: 1825, localLinks: 115826, revision: 'sha256:47ead1744de1d6de9499694b74cd4ad9b91894f3d8a52f991f8717b76e91ecf6', checks };
await writeFile(new URL('release-receipt.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(checks));
