#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { verifyMirrorDirectory } from './sync-cms-snapshot.mjs'

async function pathExists(target) {
  try {
    await lstat(target)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function gitOutput(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', root, ...args], {
      env: {
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_TERMINAL_PROMPT: '0',
        LANG: 'C',
        LC_ALL: 'C',
        PATH: process.env.PATH,
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const chunks = []
    let size = 0
    child.stdout.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) child.kill('SIGKILL')
      else chunks.push(chunk)
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code !== 0) reject(new Error('Git history inspection failed'))
      else resolve(Buffer.concat(chunks).toString('utf8'))
    })
  })
}

async function mirrorExistedInHistory(root) {
  let inside
  try {
    inside = (await gitOutput(root, ['rev-parse', '--is-inside-work-tree'])).trim()
  } catch {
    return false
  }
  if (inside !== 'true') return false
  return (await gitOutput(root, [
    'log',
    '--format=%H',
    '--diff-filter=A',
    '--',
    'mirror-manifest.json',
  ])).trim() !== ''
}

async function verifyLegacyRepository(root) {
  const canonicalValidator = path.join(root, 'scripts', 'content.mjs')
  if (await pathExists(canonicalValidator)) {
    const module = await import(pathToFileURL(canonicalValidator).href)
    if (typeof module.validateRepository !== 'function') {
      throw new Error('Legacy PromptLab validator does not export validateRepository')
    }
    const validated = await module.validateRepository(root)
    if (!Array.isArray(validated?.diagnostics) || !Array.isArray(validated?.documents) || !Array.isArray(validated?.taxonomies)) {
      throw new Error('Legacy PromptLab validator returned an invalid result')
    }
    if (validated.diagnostics.length > 0) throw new Error(validated.diagnostics.join('\n'))
    return {
      files: validated.documents.length + validated.taxonomies.length + 1,
      mode: 'legacy-bootstrap',
      prompts: validated.documents.length,
      revision: 'not-mirrored',
    }
  }

  const { checkGenerated, validateRepository } = await import('../lib/catalog.mjs')
  const validated = await validateRepository({ root })
  const generated = await checkGenerated({ root })
  return {
    files: generated.files.size,
    mode: 'legacy-template',
    prompts: validated.prompts.length,
    revision: generated.contentRevision,
  }
}

export async function verifyRepositoryState({ root }) {
  const repositoryRoot = path.resolve(root)
  if (await pathExists(path.join(repositoryRoot, 'mirror-manifest.json'))) {
    const result = await verifyMirrorDirectory({ root: repositoryRoot })
    return { ...result, mode: 'cms-mirror' }
  }
  if (await mirrorExistedInHistory(repositoryRoot)) {
    throw new Error('CMS mirror mode cannot fall back to the legacy validator after mirror-manifest.json has existed')
  }
  return verifyLegacyRepository(repositoryRoot)
}

const isMain = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  const rootFlag = process.argv.indexOf('--root')
  const root = rootFlag === -1 ? process.cwd() : process.argv[rootFlag + 1]
  if (root === undefined) {
    process.stderr.write('Usage: node scripts/verify-repository.mjs [--root PATH]\n')
    process.exitCode = 1
  } else {
    verifyRepositoryState({ root }).then((result) => {
      process.stdout.write(`REPOSITORY_OK mode=${result.mode} revision=${result.manifestSha256 ?? result.revision} files=${result.files}\n`)
    }).catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : 'Repository verification failed'}\n`)
      process.exitCode = 1
    })
  }
}
