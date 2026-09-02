import assert from 'node:assert/strict'
import test from 'node:test'

import { CmsConfigurationError, readCmsEnvironment } from '../src/config/env.ts'

const validEnvironment: NodeJS.ProcessEnv = {
  CMS_GIT_PUBLISHER: 'mock',
  CMS_MOCK_GIT_BASE_SHA: '0000000000000000000000000000000000000000',
  DATABASE_URI: 'postgres://payload:payload@127.0.0.1:5432/pseo_cms',
  NODE_ENV: 'test',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3001/',
  PAYLOAD_SECRET: '01234567890123456789012345678901',
}

test('CMS environment normalizes the public URL and remains mock-only', () => {
  const environment = readCmsEnvironment(validEnvironment)
  assert.equal(environment.gitPublisherMode, 'mock')
  assert.equal(environment.publicServerUrl, 'http://localhost:3001')
})

test('a live Git publisher cannot be enabled through configuration', () => {
  assert.throws(
    () => readCmsEnvironment({ ...validEnvironment, CMS_GIT_PUBLISHER: 'github' }),
    CmsConfigurationError,
  )
})
