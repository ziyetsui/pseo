#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkGenerated, validateRepository, writeGenerated } from '../lib/catalog.mjs'

const command = process.argv[2]
const rootFlag = process.argv.indexOf('--root')
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(rootFlag === -1 ? path.join(scriptDirectory, '..') : process.argv[rootFlag + 1])

try {
  if (command === 'generate') {
    const result = await writeGenerated({ root })
    process.stdout.write(`GENERATED prompts=${result.catalog.total} locales=${result.catalog.locales.length} revision=${result.contentRevision}\n`)
  } else if (command === 'check') {
    const result = await checkGenerated({ root })
    process.stdout.write(`CURRENT prompts=${result.catalog.total} revision=${result.contentRevision}\n`)
  } else if (command === 'validate') {
    const result = await validateRepository({ root })
    process.stdout.write(`VALID prompts=${result.prompts.length} taxonomies=${result.taxonomies.length}\n`)
  } else {
    throw new Error('Usage: node scripts/catalog.mjs <generate|check|validate> [--root PATH]')
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
}
