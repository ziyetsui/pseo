#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildIntake } from './lib/case-import.mjs';

const [websiteFile, galleryFile, outputDirectory, upstreamCommit, observedAt, websiteMediaFile] = process.argv.slice(2);
if (!websiteFile || !galleryFile || !outputDirectory || !upstreamCommit || !observedAt) {
  throw new Error('Usage: node scripts/import-cases.mjs WEBSITES.json GALLERY.json OUTPUT_DIR UPSTREAM_COMMIT OBSERVED_AT');
}
const output = resolve(outputDirectory);
const repositoryRoot = resolve(import.meta.dirname, '..');
if (output === join(repositoryRoot, 'content') || output.startsWith(`${join(repositoryRoot, 'content')}/`) || output.startsWith(`${join(repositoryRoot, 'frontend')}/`)) throw new Error('Intake output must not target generated content or the frontend');
const [websiteBytes, galleryBytes] = await Promise.all([readFile(websiteFile), readFile(galleryFile)]);
const websiteMedia = websiteMediaFile ? JSON.parse(await readFile(websiteMediaFile, 'utf8')) : [];
const result = buildIntake({ websiteMedia, websites: JSON.parse(websiteBytes), gallery: JSON.parse(galleryBytes), upstreamCommit, observedAt });
result.manifest.sources = [
  { dataset: 'reviewed-websites', sha256: createHash('sha256').update(websiteBytes).digest('hex') },
  { dataset: 'awesome-gpt-image-2', commit: upstreamCommit, sha256: createHash('sha256').update(galleryBytes).digest('hex') },
];
await mkdir(output, { recursive: true });
for (const [name, value] of Object.entries({ graph: { schemaVersion: result.schemaVersion, nodes: result.nodes, edges: result.edges }, proposals: result.proposals, reviews: result.reviews, manifest: { ...result.manifest, observedAt, nodes: result.nodes.length, edges: result.edges.length, proposals: result.proposals.length, missingPrompts: result.reviews.filter(r => r.reasons.includes('missing_prompt')).length, contractBlocked: result.reviews.filter(r => r.reasons.includes('proposal_contract_blocked')).length } })) {
  await writeFile(join(output, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify({ ...result.manifest, nodes: result.nodes.length, edges: result.edges.length, proposals: result.proposals.length })}\n`);
