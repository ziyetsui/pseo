import { createHash } from 'node:crypto'

import type { PublicationFile } from '../domain/index.ts'

type JsonRecord = Readonly<Record<string, unknown>>

const PROMPT_ID = /^prm_[a-z0-9_]{8,64}$/u
const TAXONOMY_ID = /^(?:cty|mdl)_[a-z0-9_]{3,64}$/u
const LOCALE = /^(?:en|zh-CN)$/u
const TAXONOMY_AXIS = /^(?:content-type|model)$/u

export interface CanonicalPromptDocument {
  readonly bodyMarkdown: string
  readonly frontmatter: JsonRecord
}

export interface CanonicalTaxonomyDocument {
  readonly axis: string
  readonly id: string
  readonly locale: string
  readonly value: JsonRecord
}

export interface CanonicalPromptBundleInput {
  readonly prompts: readonly CanonicalPromptDocument[]
  readonly taxonomies: readonly CanonicalTaxonomyDocument[]
}

function binaryCompare(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(source)
        .sort(binaryCompare)
        .map((key) => [key, canonical(source[key])]),
    )
  }
  return value
}

export function stableCanonicalJson(value: unknown): string {
  return `${JSON.stringify(canonical(value), null, 2)}\n`
}

/**
 * Mirrors the canonical content pipeline's source-revision algorithm. The
 * mutable translation projection and the revision field itself cannot affect
 * the source content identity.
 */
export function canonicalRecordRevision(frontmatter: JsonRecord, bodyMarkdown = ''): `sha256:${string}` {
  const { translation: _translation, ...withoutTranslation } = frontmatter
  const publication = typeof withoutTranslation.publication === 'object' &&
    withoutTranslation.publication !== null &&
    !Array.isArray(withoutTranslation.publication)
    ? withoutTranslation.publication as Record<string, unknown>
    : null
  const withoutOwnRevision = publication === null
    ? withoutTranslation
    : {
        ...withoutTranslation,
        publication: Object.fromEntries(
          Object.entries(publication).filter(([key]) => key !== 'sourceRevision'),
        ),
      }
  const hash = createHash('sha256')
  hash.update(JSON.stringify(canonical(withoutOwnRevision)), 'utf8')
  hash.update('\0', 'utf8')
  hash.update(bodyMarkdown, 'utf8')
  return `sha256:${hash.digest('hex')}`
}

function promptPath(document: CanonicalPromptDocument): string {
  const id = document.frontmatter.id
  const locale = document.frontmatter.locale
  if (typeof id !== 'string' || !PROMPT_ID.test(id)) {
    throw new Error('invalid canonical Prompt id')
  }
  if (typeof locale !== 'string' || !LOCALE.test(locale)) {
    throw new Error('invalid canonical Prompt locale')
  }
  return `content/prompts/${id}/${locale}.md`
}

function taxonomyPath(document: CanonicalTaxonomyDocument): string {
  if (!TAXONOMY_AXIS.test(document.axis)) throw new Error('invalid canonical taxonomy axis')
  if (!TAXONOMY_ID.test(document.id)) throw new Error('invalid canonical taxonomy id')
  if (!LOCALE.test(document.locale)) throw new Error('invalid canonical taxonomy locale')
  if (
    document.value.axis !== document.axis ||
    document.value.id !== document.id ||
    document.value.locale !== document.locale
  ) {
    throw new Error('canonical taxonomy identity does not match its path')
  }
  return `content/taxonomies/${document.axis}/${document.id}/${document.locale}.json`
}

function oneTrailingLf(value: string): string {
  if (value.includes('\r')) throw new Error('canonical publication content must use LF line endings')
  return `${value.replace(/\n+$/u, '')}\n`
}

/**
 * Serializes an already validated Payload projection. It never writes files,
 * Git state, or governance clearances. The caller receives an allowlisted,
 * sorted, duplicate-free bundle suitable for the Git publisher boundary.
 */
export function buildCanonicalPromptBundle(input: CanonicalPromptBundleInput): readonly PublicationFile[] {
  const files: PublicationFile[] = []
  for (const document of input.prompts) {
    const path = promptPath(document)
    const body = oneTrailingLf(document.bodyMarkdown.trim())
    const content = `---\n${stableCanonicalJson(document.frontmatter)}---\n\n${body}`
    files.push({ path, content: oneTrailingLf(content) })
  }
  for (const document of input.taxonomies) {
    files.push({ path: taxonomyPath(document), content: stableCanonicalJson(document.value) })
  }

  files.sort((left, right) => binaryCompare(left.path, right.path))
  const seen = new Set<string>()
  for (const file of files) {
    if (seen.has(file.path)) throw new Error(`duplicate canonical publication path: ${file.path}`)
    seen.add(file.path)
    if (!file.content.endsWith('\n') || file.content.endsWith('\n\n') || file.content.includes('\r')) {
      throw new Error(`canonical publication file is not normalized: ${file.path}`)
    }
  }
  return files
}

export function canonicalBundleRevision(
  files: readonly PublicationFile[],
  rightsReview: JsonRecord,
): `sha256:${string}` {
  return canonicalRecordRevision({
    files: files.map((file) => ({ path: file.path, content: file.content })),
    rightsReview,
  })
}
