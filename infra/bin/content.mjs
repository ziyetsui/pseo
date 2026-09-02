#!/usr/bin/env node

import path from 'node:path'

import {
  buildStaticContent,
  ContentValidationError,
  repositoryRoot,
  validateContent,
} from '../lib/content-pipeline.mjs'

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

const command = process.argv[2]
const common = {
  contentRoot: path.resolve(option('--content', path.join(repositoryRoot, 'content'))),
  schemaRoot: path.resolve(option('--schemas', path.join(repositoryRoot, 'schemas'))),
}

try {
  if (command === 'validate') {
    const result = await validateContent(common)
    process.stdout.write(
      `VALID content documents=${result.documents.length} taxonomies=${result.taxonomies.length} surfaces=${result.surfaces.length} revision=${result.contentRevision}\n`,
    )
  } else if (command === 'build') {
    const result = await buildStaticContent({
      ...common,
      outputRoot: path.resolve(option('--output', path.join(repositoryRoot, 'infra/generated/static'))),
    })
    process.stdout.write(
      `BUILT static-content published-locales=${result.publishedLocales.length} files=${result.files.length + 1} revision=${result.contentRevision} output=${result.outputRoot}\n`,
    )
  } else {
    throw new Error('command must be validate or build')
  }
} catch (error) {
  if (error instanceof ContentValidationError) {
    for (const item of error.diagnostics) {
      process.stderr.write(`INVALID ${item.file} ${item.code} ${item.message}\n`)
    }
  } else {
    process.stderr.write(`FAILED ${error.message}\n`)
  }
  process.exitCode = 1
}
