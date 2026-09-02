import { register } from 'node:module'

import {
  buildWireframeSeedFixture,
  seedWireframeFixture,
  type SeedPayloadLocalApi,
} from '../src/seed/wireframe.ts'

type RecordValue = Record<string, unknown>

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag)
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function fixtureCounts(): Record<string, number> {
  const fixture = buildWireframeSeedFixture()
  return {
    artifacts: fixture.artifacts.length,
    localeVariants: fixture.artifacts.length,
    sourceEvidence: fixture.sources.length,
    taxonomies: fixture.taxonomies.length,
  }
}

function registerCmsPathAliases(): void {
  const sourceRoot = new URL('../src/', import.meta.url).href
  const loader = `
    import { existsSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    const sourceRoot = ${JSON.stringify(sourceRoot)}
    function withTypeScriptExtension(target) {
      const file = new URL(target.href + '.ts')
      const index = new URL(target.href.replace(/\\/$/, '') + '/index.ts')
      return existsSync(fileURLToPath(file)) ? file : index
    }
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const target = new URL(specifier.slice(2), sourceRoot)
        return nextResolve(withTypeScriptExtension(target).href, context)
      }
      if (specifier.startsWith('.') && context.parentURL?.startsWith(sourceRoot)) {
        const target = new URL(specifier, context.parentURL)
        const candidate = withTypeScriptExtension(target)
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
      }
      return nextResolve(specifier, context)
    }
  `
  register(`data:text/javascript,${encodeURIComponent(loader)}`, import.meta.url)
}

async function main(): Promise<void> {
  const countOnly = hasFlag('--count')
  const dryRun = hasFlag('--dry-run')
  if (countOnly) {
    print({ mode: 'count', ...fixtureCounts() })
    return
  }

  registerCmsPathAliases()
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../src/payload.config.ts')])
  const localApi: SeedPayloadLocalApi = {
    async create(args) {
      return await payload.create(args as never) as RecordValue
    },
    async find(args) {
      const result = await payload.find(args as never)
      return { docs: result.docs as RecordValue[] }
    },
  }
  print({ mode: dryRun ? 'dry-run' : 'seed', ...(await seedWireframeFixture(localApi, { dryRun })) })
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure'
  process.stderr.write(`wireframe seed failed: ${message}\n`)
  process.exitCode = 1
})
