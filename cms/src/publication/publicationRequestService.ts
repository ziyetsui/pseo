import { createHash } from 'node:crypto'

import {
  INTERNAL_BETA_LOCALES,
  PublicationBaseRevisionConflictError,
  PublicationContentRevisionConflictError,
  PublicationIdempotencyConflictError,
  PublicationRequestInputError,
  type PublicationContentValidator,
  type GitPublisher,
  type InternalBetaLocale,
  type NormalizedPublicationRequestInput,
  type PublicationRequestInput,
  type PublicationRequestRecord,
  type PublicationRequestRepository,
} from '../domain/index.ts'

function assertString(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== 'string') {
    throw new PublicationRequestInputError(`${field} must be a string`)
  }
  const normalized = value.trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new PublicationRequestInputError(`${field} must contain ${minimum}-${maximum} characters`)
  }
  return normalized
}

function assertContentRevision(value: unknown, field: string): string {
  const normalized = assertString(value, field, 71, 71)
  if (!/^sha256:[a-f0-9]{64}$/u.test(normalized)) {
    throw new PublicationRequestInputError(`${field} must be a sha256:<64 lowercase hex> revision`)
  }
  return normalized
}

export function normalizePublicationRequest(
  input: PublicationRequestInput,
): NormalizedPublicationRequestInput {
  const artifactId = assertString(input.artifactId, 'artifactId', 3, 128)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(artifactId)) {
    throw new PublicationRequestInputError('artifactId contains unsupported characters')
  }

  const expectedBaseSha = assertString(input.expectedBaseSha, 'expectedBaseSha', 7, 64)
  if (!/^[a-f0-9]+$/u.test(expectedBaseSha)) {
    throw new PublicationRequestInputError('expectedBaseSha must be lowercase hexadecimal')
  }

  const expectedContentRevision = assertContentRevision(
    input.expectedContentRevision,
    'expectedContentRevision',
  )
  const expectedSourceRevision = assertContentRevision(
    input.expectedSourceRevision,
    'expectedSourceRevision',
  )

  const commitMessage = assertString(input.commitMessage, 'commitMessage', 8, 200)
  if (/\r|\n/u.test(commitMessage)) {
    throw new PublicationRequestInputError('commitMessage must be a single line')
  }

  const idempotencyKey = assertString(input.idempotencyKey, 'idempotencyKey', 8, 128)
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(idempotencyKey)) {
    throw new PublicationRequestInputError('idempotencyKey contains unsupported characters')
  }

  const localeSet = new Set<InternalBetaLocale>()
  for (const locale of input.locales) {
    if (!(INTERNAL_BETA_LOCALES as readonly string[]).includes(locale)) {
      throw new PublicationRequestInputError(`locale is not enabled for the internal beta: ${locale}`)
    }
    localeSet.add(locale as InternalBetaLocale)
  }
  const locales = [...localeSet].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
  if (locales.length === 0) {
    throw new PublicationRequestInputError('at least one locale is required')
  }

  return {
    artifactId,
    commitMessage,
    expectedBaseSha,
    expectedContentRevision,
    expectedSourceRevision,
    idempotencyKey,
    locales,
  }
}

export function publicationRequestFingerprint(input: NormalizedPublicationRequestInput): string {
  const canonical = JSON.stringify({
    artifactId: input.artifactId,
    commitMessage: input.commitMessage,
    expectedBaseSha: input.expectedBaseSha,
    expectedContentRevision: input.expectedContentRevision,
    expectedSourceRevision: input.expectedSourceRevision,
    idempotencyKey: input.idempotencyKey,
    locales: input.locales,
  })
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

export class PublicationRequestService {
  private readonly repository: PublicationRequestRepository
  private readonly gitPublisher: GitPublisher
  private readonly contentValidator: PublicationContentValidator

  constructor(
    repository: PublicationRequestRepository,
    gitPublisher: GitPublisher,
    contentValidator: PublicationContentValidator,
  ) {
    this.repository = repository
    this.gitPublisher = gitPublisher
    this.contentValidator = contentValidator
  }

  async create(
    rawInput: PublicationRequestInput,
    requestedBy: string,
  ): Promise<PublicationRequestRecord> {
    const input = normalizePublicationRequest(rawInput)
    const requestFingerprint = publicationRequestFingerprint(input)
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey)

    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new PublicationIdempotencyConflictError(
          'Idempotency-Key is already associated with a different publication request',
        )
      }
      return existing
    }


    const validation = await this.contentValidator.validate(input)

    const pending = await this.repository.createPending({
      ...input,
      requestFingerprint,
      requestedBy,
      validatedContentRevision: validation.contentRevision,
      validatedSourceRevision: validation.sourceRevision,
    })

    if (
      input.expectedContentRevision !== validation.contentRevision ||
      input.expectedSourceRevision !== validation.sourceRevision
    ) {
      const error = new PublicationContentRevisionConflictError(
        'The editorial projection changed after validation; validate again before submitting',
      )
      await this.repository.markConflicted(pending.id, error.code, error.message)
      throw error
    }

    try {
      const receipt = await this.gitPublisher.requestPublication({
        ...input,
        requestFingerprint,
        requestId: pending.id,
        validatedContentRevision: validation.contentRevision,
        validatedSourceRevision: validation.sourceRevision,
      })
      return await this.repository.applyPublisherReceipt(pending.id, receipt)
    } catch (error: unknown) {
      if (error instanceof PublicationBaseRevisionConflictError) {
        await this.repository.markConflicted(pending.id, error.code, error.message)
        throw error
      }
      const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'GIT_PUBLISHER_FAILED'
      const detail = error instanceof Error ? error.message : 'Git publisher failed'
      await this.repository.markFailed(pending.id, code, detail)
      throw error
    }
  }
}
