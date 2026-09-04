import type { PublicationDraftSelection } from '../domain/publication.ts'
import {
  PayloadDraftContentValidator,
  type PayloadContentValidationApi,
} from '../publication/payloadDraftContentValidator.ts'
import {
  firstPromptSeedConstants,
  seedFirstPrompt,
  type FirstPromptSeedPayloadApi,
} from './firstPrompt.ts'

export interface FirstPromptSeedCliDependencies {
  readonly argv: readonly string[]
  readonly cwd: string
  readonly getPayload: (args: { readonly config: unknown }) => Promise<FirstPromptSeedPayloadApi & PayloadContentValidationApi>
  readonly loadConfig: () => Promise<unknown>
  readonly loadEnv: (cwd: string) => void
  readonly write: (value: string) => void
}

function option(argv: readonly string[], name: string): string {
  const index = argv.indexOf(name)
  const value = index === -1 ? undefined : argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} is required`)
  return value
}

/** Runs the one-record seed without printing environment variables or credentials. */
export async function runFirstPromptSeedCli(dependencies: FirstPromptSeedCliDependencies): Promise<void> {
  const sourceUrl = option(dependencies.argv, '--source-url')
  const reviewedAt = option(dependencies.argv, '--reviewed-at')
  const dryRun = dependencies.argv.includes('--dry-run')
  const validate = dependencies.argv.includes('--validate')
  if (dryRun && validate) throw new Error('--validate cannot be combined with --dry-run')

  dependencies.loadEnv(dependencies.cwd)
  const config = await dependencies.loadConfig()
  const payload = await dependencies.getPayload({ config })
  const result = await seedFirstPrompt(payload, { dryRun, reviewedAt, sourceUrl })
  let validation: Record<string, unknown> | null = null
  if (validate) {
    const input: PublicationDraftSelection = {
      artifactId: firstPromptSeedConstants.artifactKey,
      locales: ['zh-CN'],
    }
    const compiled = await new PayloadDraftContentValidator(payload).validate(input)
    validation = {
      contentRevision: compiled.contentRevision,
      files: compiled.files.map((file) => file.path),
      sourceRevision: compiled.sourceRevision,
    }
  }
  dependencies.write(`${JSON.stringify({
    mode: dryRun ? 'dry-run' : 'seed',
    ...result,
    ...(validation ? { validation } : {}),
  }, null, 2)}\n`)
}
