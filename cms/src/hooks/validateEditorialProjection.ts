import type { CollectionBeforeValidateHook } from 'payload'

export class EditorialProjectionValidationError extends Error {
  readonly code = 'EDITORIAL_PROJECTION_INVALID'
  override readonly name = 'EditorialProjectionValidationError'
}

interface TranslationProjection {
  readonly locale?: unknown
  readonly reviewer?: unknown
  readonly sourceLocale?: unknown
  readonly translatedFromRevision?: unknown
  readonly translationStatus?: unknown
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateReadyTranslation(data: TranslationProjection): void {
  if (data.translationStatus !== 'ready') return
  if (!nonEmpty(data.reviewer)) {
    throw new EditorialProjectionValidationError('A ready locale variant requires a reviewer')
  }
  if (data.locale !== data.sourceLocale && !nonEmpty(data.translatedFromRevision)) {
    throw new EditorialProjectionValidationError(
      'A ready translated locale requires translatedFromRevision',
    )
  }
}

export const validateLocaleVariant: CollectionBeforeValidateHook = ({ data }) => {
  if (data) {
    const projection = data as Record<string, unknown>
    const nested = typeof projection.translation === 'object' && projection.translation !== null
      ? (projection.translation as Record<string, unknown>)
      : {}
    validateReadyTranslation({ ...projection, ...nested })
  }
  return data
}

interface SourceEvidenceProjection {
  readonly evidenceUrl?: unknown
  readonly evidenceType?: unknown
  readonly observedAt?: unknown
  readonly recordType?: unknown
  readonly sourceId?: unknown
  readonly sourcePlatform?: unknown
  readonly sourcePublishedDate?: unknown
  readonly sourceUrl?: unknown
}

function assertSafeHttpUrl(value: unknown, field: string): void {
  if (!nonEmpty(value)) {
    throw new EditorialProjectionValidationError(`${field} is required`)
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new EditorialProjectionValidationError(`${field} must be an absolute URL`)
  }
  if (parsed.protocol !== 'https:') {
    throw new EditorialProjectionValidationError(`${field} must use https`)
  }
}

function assertDate(value: unknown, field: string): void {
  if (!nonEmpty(value) || !/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/u.test(value)) {
    throw new EditorialProjectionValidationError(`${field} must be a calendar date`)
  }
}

export function validateSourceEvidenceProjection(data: SourceEvidenceProjection): void {
  if (data.recordType === 'source') {
    if (!nonEmpty(data.sourcePlatform)) {
      throw new EditorialProjectionValidationError('sourcePlatform is required for source records')
    }
    if (!nonEmpty(data.sourceId)) {
      throw new EditorialProjectionValidationError('sourceId is required for source records')
    }
    if (!nonEmpty(data.observedAt)) {
      throw new EditorialProjectionValidationError('observedAt is required for source records')
    }
    assertDate(data.sourcePublishedDate, 'sourcePublishedDate')
    assertSafeHttpUrl(data.sourceUrl, 'sourceUrl')
  }
  if (data.recordType === 'evidence') {
    if (!nonEmpty(data.evidenceType)) {
      throw new EditorialProjectionValidationError('evidenceType is required for evidence records')
    }
    assertSafeHttpUrl(data.evidenceUrl, 'evidenceUrl')
  }
}

export const validateSourceEvidence: CollectionBeforeValidateHook = ({ data }) => {
  if (data) validateSourceEvidenceProjection(data as SourceEvidenceProjection)
  return data
}
