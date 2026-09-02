#!/usr/bin/env node

import path from 'node:path'

import { repositoryRoot } from '../lib/content-pipeline.mjs'
import { preparePreview } from '../lib/preview-package.mjs'

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

try {
  const result = await preparePreview({
    frontendRoot: path.resolve(option('--frontend', path.join(repositoryRoot, 'frontend/out'))),
    outputRoot: path.resolve(option('--output', path.join(repositoryRoot, 'infra/generated/preview-site'))),
    staticContentRoot: path.resolve(option('--static-content', path.join(repositoryRoot, 'infra/generated/static'))),
  })
  process.stdout.write(
    `BUILT preview files=${result.files.length + 1} noindex=${result.noindex} revision=${result.contentRevision} output=${result.outputRoot}\n`,
  )
} catch (error) {
  process.stderr.write(`FAILED ${error.message}\n`)
  process.exitCode = 1
}
