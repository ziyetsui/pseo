import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIntake, validateGraph } from '../lib/case-import.mjs';
import { normalizePromptProposal } from '../../cms/src/proposals/promptProposal.ts';

const options = { observedAt: '2026-10-14T04:00:00.000Z', upstreamCommit: 'a'.repeat(40) };
const image = { id: 1, title: '案例', prompt: 'Draw [FRUIT].\nKeep spacing.', image: '/images/case1.jpg', sourceLabel: '@artist', sourceUrl: 'https://x.com/artist/status/1234567890123456789', category: 'Charts & Infographics', styles: ['Poster'], scenes: ['Education'] };
const website = { id: '2234567890123456789', project_id: 'demo', title: 'Demo', description: 'Three.js browser demo', post_url: 'https://x.com/maker/status/2234567890123456789', author: 'maker', prompt: '未在已读取正文和同作者回复中找到', model_group: 'Claude', model_evidence: 'author_explicit', use_case: 'fun', use_case_label: 'Play & exploration', tech_stack: ['Three.js'] };
const build = (websites = [], cases = [image]) => buildIntake({ ...options, websites, gallery: { cases, categories: [...new Set(cases.map(c => c.category))] } });

test('preserves full prompt and emits only the deployed CMS draft contract', () => {
  const result = build();
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].body.prompt.text, image.prompt);
  assert.deepEqual(normalizePromptProposal(result.proposals[0].body), result.proposals[0].body);
  assert.equal(result.proposals[0].body.source.id, '1234567890123456789');
  assert.equal(result.nodes.find(n => n.type === 'prompt').rightsStatus, 'review_required');
  assert.equal(result.edges.filter(e => e.type === 'used_for').length, 1);
  assert.equal(result.nodes.find(n => n.type === 'media').url, `https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/${'a'.repeat(40)}/data/images/case1.jpg`);
});
test('missing website prompt remains a case with source and website edges, not a fabricated proposal', () => {
  const result = build([website], []);
  assert.equal(result.proposals.length, 0);
  assert.equal(result.nodes.filter(n => n.type === 'website-case').length, 1);
  assert.ok(result.reviews.some(r => r.reasons.includes('missing_prompt')));
  assert.ok(result.edges.some(e => e.type === 'used_for' && result.nodes.find(n => n.id === e.to)?.slug === 'website'));
  validateGraph(result);
});
test('deduplicates identical source/text and retains conflicting prompts as separate reviewable objects', () => {
  const result = build([], [image, { ...image, id: 2 }, { ...image, id: 3, prompt: 'Different prompt' }]);
  assert.equal(result.proposals.length, 2);
  assert.equal(result.manifest.duplicates, 1);
  assert.equal(result.manifest.conflicts, 1);
  assert.ok(result.reviews.some(r => r.reasons.includes('source_prompt_conflict')));
  validateGraph(result);
});
test('rejects unsafe source, media path traversal and invalid observations before producing artifacts', () => {
  assert.throws(() => build([], [{ ...image, sourceUrl: 'javascript:alert(1)' }]), /HTTPS/);
  assert.throws(() => build([], [{ ...image, image: '/images/../../secret.jpg' }]), /image path/);
  assert.throws(() => buildIntake({ ...options, observedAt: 'yesterday', websites: [], gallery: { cases: [] } }), /observedAt/);
});
test('graph validator catches dangling endpoints, duplicate nodes and duplicate edges', () => {
  const result = build();
  assert.throws(() => validateGraph({ ...result, nodes: result.nodes.slice(1) }), /endpoint/);
  assert.throws(() => validateGraph({ ...result, nodes: [...result.nodes, result.nodes[0]] }), /duplicate node/);
  assert.throws(() => validateGraph({ ...result, edges: [...result.edges, result.edges[0]] }), /duplicate edge/);
});
test('same pinned input produces byte-identical output and every source item is reconciled', () => {
  assert.equal(JSON.stringify(build([website])), JSON.stringify(build([website])));
  const result = build([website]);
  assert.equal(result.manifest.websitesProcessed, 1);
  assert.equal(result.manifest.imagesProcessed, 1);
  assert.equal(result.manifest.categoryMappings.length, 1);
  assert.equal(result.reviews.length, 2);
});

test('an HTTP demo is held for link review without discarding its valid source case', () => {
  const result = build([{ ...website, demo_url: 'http://example.com/demo' }], []);
  assert.equal(result.manifest.websitesProcessed, 1);
  assert.ok(result.reviews[0].reasons.includes('unsafe_demo_url'));
  assert.equal(result.edges.filter(e => e.type === 'has_demo').length, 0);
});

test('X profile sources remain generic URL evidence without inventing a status id', () => {
  const result = build([], [{ ...image, sourceUrl: 'https://x.com/artist' }]);
  assert.equal(result.proposals[0].body.source.platform, 'url');
  assert.equal(result.proposals[0].body.source.id, 'https://x.com/artist');
});

test('website preview keeps its actual media kind and source URL instead of treating a video as an image', () => {
  const result = buildIntake({ ...options, websites: [website], gallery: { cases: [] }, websiteMedia: [{ post_id: website.id, images: [{ source_url: 'https://video.twimg.com/demo.mp4', kind: 'video_frame_at_1s' }] }] });
  assert.equal(result.nodes.find(n => n.type === 'media')?.kind, 'video');
  assert.equal(result.nodes.find(n => n.type === 'media')?.url, 'https://video.twimg.com/demo.mp4');
  assert.ok(result.edges.some(e => e.type === 'has_example'));
});

test('release verifier rejects mismatched counts, altered prompt bodies and publication claims', async () => {
  const { checkIntake } = await import('../lib/case-import.mjs');
  const result = build([website]);
  const bundle = { ...result, graph: { nodes: result.nodes, edges: result.edges }, manifest: { ...result.manifest, nodes: result.nodes.length, edges: result.edges.length, proposals: result.proposals.length } };
  assert.doesNotThrow(() => checkIntake(bundle));
  assert.throws(() => checkIntake({ ...bundle, manifest: { ...bundle.manifest, nodes: 999 } }), /count/);
  const changed = structuredClone(bundle);
  changed.proposals[0].body.prompt.text = 'Altered content';
  assert.throws(() => checkIntake(changed), /prompt text/);
  assert.throws(() => checkIntake({ ...bundle, manifest: { ...bundle.manifest, public: 1 } }), /publication/);
});

test('the real checked-in intake verifies when the checkout path contains spaces', async () => {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('../check-case-intake.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.match(output, /websites=59 images=541/);
  assert.match(output, /public=0/);
});
