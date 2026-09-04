import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { RETIRED_CONTENT_AGENT_MESSAGE } from './runner.ts'

export function retiredCliResult(): Record<string, string> {
  return {
    status: 'retired',
    code: 'CMS_PROPOSAL_ADAPTER_REQUIRED',
    message: RETIRED_CONTENT_AGENT_MESSAGE,
  }
}

async function main(): Promise<void> {
  process.stdout.write(`${JSON.stringify(retiredCliResult(), null, 2)}\n`)
  process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
