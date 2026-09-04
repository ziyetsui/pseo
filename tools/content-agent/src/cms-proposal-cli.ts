import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { CmsProposalClientError, submitCmsPromptProposal } from './cms-proposal-client.ts'

const MAX_STDIN_BYTES = 512 * 1024

async function readProposal(): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_STDIN_BYTES) throw new Error('Proposal JSON exceeds 512 KiB')
    chunks.push(buffer)
  }
  if (size === 0) throw new Error('Proposal JSON is required on stdin')
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main(): Promise<void> {
  try {
    const proposal = await readProposal()
    const accessClientId = process.env.PSEO_CF_ACCESS_CLIENT_ID
    const accessClientSecret = process.env.PSEO_CF_ACCESS_CLIENT_SECRET
    const result = await submitCmsPromptProposal({
      baseUrl: requiredEnvironment('PSEO_CMS_BASE_URL'),
      apiKey: requiredEnvironment('PSEO_CMS_API_KEY'),
      ...(accessClientId === undefined ? {} : { accessClientId }),
      ...(accessClientSecret === undefined ? {} : { accessClientSecret }),
    }, proposal, requiredEnvironment('PSEO_CMS_IDEMPOTENCY_KEY'))
    process.stdout.write(`${JSON.stringify({ status: 'draft_applied', data: result }, null, 2)}\n`)
  } catch (error: unknown) {
    const known = error instanceof CmsProposalClientError
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      code: known ? error.code : 'CMS_PROPOSAL_CLIENT_FAILED',
      detail: error instanceof Error ? error.message : 'CMS proposal client failed',
    })}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
