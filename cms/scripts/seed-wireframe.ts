import { createRequire, register } from 'node:module'

import { runWireframeSeedCli } from '../src/seed/cli.ts'
import type { SeedPayloadLocalApi } from '../src/seed/wireframe.ts'

type NextEnvLoader = (cwd: string, dev?: boolean) => unknown

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
  registerCmsPathAliases()
  // Resolve Next's bundled environment loader from Next's own package context.
  // This remains reliable with pnpm's isolated dependency layout.
  const requireFromScript = createRequire(import.meta.url)
  const requireFromNext = createRequire(requireFromScript.resolve('next/package.json'))
  const { loadEnvConfig } = requireFromNext('@next/env') as { readonly loadEnvConfig: NextEnvLoader }
  const { getPayload } = await import('payload')
  await runWireframeSeedCli({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    loadEnv: (cwd) => {
      loadEnvConfig(cwd, process.env.NODE_ENV !== 'production')
    },
    loadConfig: async () => (await import('../src/payload.config.ts')).default,
    getPayload: async ({ config }) => await getPayload({ config } as never) as unknown as SeedPayloadLocalApi,
    write: (value) => process.stdout.write(value),
  })
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure'
  process.stderr.write(`wireframe seed failed: ${message}\n`)
  process.exitCode = 1
})
