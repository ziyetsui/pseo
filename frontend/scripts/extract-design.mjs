import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const postcss = nextRequire('postcss');
const source = await readFile(new URL('../../specs/images/flow-proto-full.html', import.meta.url), 'utf8');
const start = source.indexOf('const PAGES=') + 'const PAGES='.length;
const end = source.indexOf(';\nconst frames=', start);
if (start < 12 || end < 0) throw new Error('Prototype PAGES boundary changed');
const pages = JSON.parse(source.slice(start, end));
const scopes = { l1: 'hub', l2: 'deck', l3: 'anthology', l4: 'recipe' };
const output = ['/* Generated from the user-approved prototype. Run node scripts/extract-design.mjs. */'];
for (const [key, name] of Object.entries(scopes)) {
  const css = [...pages[key].matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  const root = postcss.parse(css);
  const scope = `:where(.prototype-${name})`;
  root.walkComments(comment => comment.remove());
  // Bundle the unchanged reference font under its OFL license to avoid a remote critical request.
  root.walkDecls('src', declaration => {
    declaration.value = declaration.value.replaceAll('https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/files/inter-latin-wght-normal.woff2', '/fonts/inter-latin-wght-normal.woff2');
  });
  root.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(selector => {
      let value = selector.replace(/:root/g, scope).replace(/(^|[\s>+~])(?:html|body)(?=[:.\s>+~#\[]|$)/g, `$1${scope}`);
      if (!value.includes(scope)) value = `${scope} ${value}`;
      return value;
    });
  });
  output.push(`\n/* ${key}: ${name} */\n${root.toString()}`);
}
await writeFile(new URL('../src/styles/prototype.css', import.meta.url), output.join('\n'));
await mkdir(new URL('../evidence/', import.meta.url), { recursive: true });
await writeFile(new URL('../evidence/reference-manifest.json', import.meta.url), JSON.stringify({
  source: 'specs/images/flow-proto-full.html', sha256: createHash('sha256').update(source).digest('hex'),
  pages: { l1: 'Legacy Quotations CSS (non-L1 fallback); current L1: magnetic-reference.json', l2: 'Images Deck / variants[2]', l2v: 'Videos Deck / variants[2]', l3: 'Anthology / variants[2]', l4: 'Recipe / variants[1]' },
  theme: 'Default dark; L1 uses magnetic-reference.json Linear dark tokens', css: 'selectors scoped per page; comments omitted; unchanged Inter font served locally under OFL',
}, null, 2) + '\n');
