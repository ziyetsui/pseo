#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { checkIntake } from './lib/case-import.mjs';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../docs/intake/2026-10-14', import.meta.url)));
const entries = await Promise.all(['graph', 'proposals', 'reviews', 'manifest'].map(async name => [name, JSON.parse(await readFile(join(root, `${name}.json`), 'utf8'))]));
const bundle = Object.fromEntries(entries);
checkIntake(bundle);
console.log(`VALID intake websites=${bundle.manifest.websitesProcessed} images=${bundle.manifest.imagesProcessed} nodes=${bundle.graph.nodes.length} edges=${bundle.graph.edges.length} proposals=${bundle.proposals.length} public=0`);
