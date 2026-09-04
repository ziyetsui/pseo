import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import type {
  ContentIntent,
  RunRequest,
  RunnerDependencies,
} from '../src/contracts.ts'
import {
  RETIRED_CONTENT_AGENT_MESSAGE,
  runContentAgent,
} from '@pseo/content-agent'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function request(intent: ContentIntent): RunRequest {
  return {
    repoRoot: '/repository-that-must-not-be-read',
    baseRef: 'HEAD',
    intent,
    brief: 'private content that must not be processed',
    target: { kind: 'prompt', id: 'prm_retired', locale: 'zh-CN' },
    relationPaths: [],
    timeoutMs: 60_000,
  }
}

test('every former intent fails closed before dependencies, SDK, Git, or artifacts are accessed', async () => {
  let dependencyAccesses = 0
  const dependencies = new Proxy({} as RunnerDependencies, {
    get() {
      dependencyAccesses += 1
      throw new Error('retired runner touched a dependency')
    },
  })

  for (const intent of ['create', 'edit', 'route', 'validate', 'pr-ready'] as const) {
    const result = await runContentAgent(request(intent), dependencies)
    assert.equal(result.status, 'failed')
    assert.equal(result.failure.code, 'retired_workflow')
    assert.equal(result.failure.message, RETIRED_CONTENT_AGENT_MESSAGE)
    assert.deepEqual(result.changedFiles, [])
    assert.equal(result.auditPath, undefined)
    assert.equal('patchPath' in result, false)
  }
  assert.equal(dependencyAccesses, 0)
})

test('the package CLI ignores former authoring arguments and returns a structured retired status', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      resolve(packageRoot, 'src', 'cli.ts'),
      '--request',
      '/request-that-must-not-be-read.json',
    ],
    { cwd: packageRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 1)
  assert.equal(result.stderr, '')
  const output = JSON.parse(result.stdout) as Record<string, unknown>
  assert.deepEqual(output, {
    status: 'retired',
    code: 'CMS_PROPOSAL_ADAPTER_REQUIRED',
    message: RETIRED_CONTENT_AGENT_MESSAGE,
  })
  assert.doesNotMatch(result.stdout, /private content|request-that-must-not-be-read/u)
})
