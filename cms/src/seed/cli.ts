import {
  buildWireframeSeedFixture,
  seedWireframeFixture,
  type SeedPayloadLocalApi,
} from './wireframe.ts'

export interface WireframeSeedCliDependencies {
  readonly argv: readonly string[]
  readonly cwd: string
  readonly getPayload: (args: { readonly config: unknown }) => Promise<SeedPayloadLocalApi>
  readonly loadConfig: () => Promise<unknown>
  readonly loadEnv: (cwd: string) => void
  readonly write: (value: string) => void
}

function hasFlag(argv: readonly string[], flag: string): boolean {
  return argv.includes(flag)
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

function print(write: (value: string) => void, value: unknown): void {
  write(`${JSON.stringify(value, null, 2)}\n`)
}

/** Runs the standalone seed command without exposing env values in output. */
export async function runWireframeSeedCli(dependencies: WireframeSeedCliDependencies): Promise<void> {
  const countOnly = hasFlag(dependencies.argv, '--count')
  const dryRun = hasFlag(dependencies.argv, '--dry-run')
  if (countOnly) {
    print(dependencies.write, { mode: 'count', ...fixtureCounts() })
    return
  }

  // Config reads its environment at module evaluation time, so loading must
  // precede loading config. Neither config nor environment is printed.
  dependencies.loadEnv(dependencies.cwd)
  const config = await dependencies.loadConfig()
  const payload = await dependencies.getPayload({ config })
  print(dependencies.write, {
    mode: dryRun ? 'dry-run' : 'seed',
    ...(await seedWireframeFixture(payload, { dryRun })),
  })
}
