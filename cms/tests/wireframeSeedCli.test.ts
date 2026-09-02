import assert from 'node:assert/strict'
import test from 'node:test'

import { runWireframeSeedCli } from '../src/seed/cli.ts'
import type { SeedPayloadLocalApi } from '../src/seed/wireframe.ts'

type Document = Record<string, unknown>

class RecordingLocalApi implements SeedPayloadLocalApi {
  readonly creates: Array<{ collection: string; data: Document; draft?: boolean }> = []
  readonly documents = new Map<string, Document[]>()
  private nextId = 1

  async create(args: { collection: string; data: Document; draft?: boolean }): Promise<Document> {
    this.creates.push(args)
    const document = { id: `${args.collection}-${this.nextId++}`, ...args.data }
    const documents = this.documents.get(args.collection) ?? []
    documents.push(document)
    this.documents.set(args.collection, documents)
    return document
  }

  async find(args: { collection: string; where?: Record<string, unknown> }): Promise<{ docs: Document[] }> {
    const documents = this.documents.get(args.collection) ?? []
    const [field, condition] = Object.entries(args.where ?? {})[0] ?? []
    const equals = typeof condition === 'object' && condition !== null
      ? (condition as Document).equals
      : undefined
    return { docs: field === undefined ? documents : documents.filter((document) => document[field] === equals) }
  }
}

test('CLI loads the CMS environment before config, obtains a Payload local API, and creates drafts', async () => {
  const calls: string[] = []
  const output: string[] = []
  const localApi = new RecordingLocalApi()
  const config = { secret: 'must-not-be-printed' }

  await runWireframeSeedCli({
    argv: [],
    cwd: '/workspace/cms',
    loadEnv: (cwd) => { calls.push(`env:${cwd}`) },
    loadConfig: async () => { calls.push('config'); return config },
    getPayload: async (args) => {
      calls.push('payload')
      assert.equal(args.config, config)
      return localApi
    },
    write: (value) => output.push(value),
  })

  assert.deepEqual(calls, ['env:/workspace/cms', 'config', 'payload'])
  assert.equal(localApi.creates.length, 171)
  assert.ok(localApi.creates.every((create) => create.draft === true))
  assert.equal(output.join('\n').includes('must-not-be-printed'), false)
})

test('CLI count mode is local and does not load env, config, or Payload', async () => {
  const output: string[] = []
  await runWireframeSeedCli({
    argv: ['--count'],
    cwd: '/workspace/cms',
    loadEnv: () => { throw new Error('unexpected environment load') },
    loadConfig: async () => { throw new Error('unexpected config load') },
    getPayload: async () => { throw new Error('unexpected Payload load') },
    write: (value) => output.push(value),
  })
  assert.match(output.join('\n'), /"mode": "count"/)
})
