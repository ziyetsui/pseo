import assert from 'node:assert/strict'
import test from 'node:test'

import { ContentApprovals } from '../src/collections/ContentApprovals.ts'

async function accessResult(
  access: NonNullable<typeof ContentApprovals.access>['create'] | undefined,
  user: unknown,
) {
  if (typeof access !== 'function') throw new Error('Expected collection access function')
  return access({ req: { user } } as never)
}

test('ContentApprovals is append-only through the dedicated endpoint', async () => {
  assert.equal(await accessResult(ContentApprovals.access?.create, { roles: ['admin'] }), false)
  assert.equal(await accessResult(ContentApprovals.access?.update, { roles: ['admin'] }), false)
  assert.equal(await accessResult(ContentApprovals.access?.delete, { roles: ['admin'] }), false)
})

test('only reviewer/admin can read ContentApprovals', async () => {
  assert.equal(await accessResult(ContentApprovals.access?.read, { roles: ['editor'] }), false)
  assert.equal(await accessResult(ContentApprovals.access?.read, { roles: ['reviewer'] }), true)
  assert.equal(await accessResult(ContentApprovals.access?.read, { roles: ['admin'] }), true)
})
