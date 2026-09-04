import type { CollectionBeforeValidateHook, FieldAccess } from 'payload'

import { hasAnyRole } from '../access/policy.ts'

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
  readonly authorHandle?: unknown
  readonly authorName?: unknown
  readonly authorUrl?: unknown
  readonly basis?: unknown
  readonly evidenceUrl?: unknown
  readonly evidenceType?: unknown
  readonly licenseReference?: unknown
  readonly observedAt?: unknown
  readonly originalPostUrl?: unknown
  readonly policyVersion?: unknown
  readonly recordType?: unknown
  readonly reviewedAt?: unknown
  readonly reviewedBy?: unknown
  readonly rightsStatus?: unknown
  readonly riskAcceptedAt?: unknown
  readonly riskAcceptedBy?: unknown
  readonly sourceId?: unknown
  readonly sourcePlatform?: unknown
  readonly sourcePublishedDate?: unknown
  readonly sourceUrl?: unknown
  readonly takedownCaseId?: unknown
  readonly takedownHandledAt?: unknown
  readonly takedownHandledBy?: unknown
  readonly takedownScope?: unknown
  readonly takedownUrl?: unknown
}

export const canWriteRightsDecision: FieldAccess = ({ req }) =>
  hasAnyRole(req.user, ['reviewer', 'admin'])

export const canWriteRightsEvidenceUrl: FieldAccess = (args) => {
  const data = args.data as Record<string, unknown> | undefined
  const doc = args.doc as Record<string, unknown> | undefined
  const recordType = data?.recordType ?? doc?.recordType
  return recordType === 'evidence' ? true : canWriteRightsDecision(args)
}

export const rightsDecisionFieldAccess = {
  create: canWriteRightsDecision,
  update: canWriteRightsDecision,
} as const

export const rightsEvidenceUrlFieldAccess = {
  create: canWriteRightsEvidenceUrl,
  update: canWriteRightsEvidenceUrl,
} as const

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

function assertBoundedText(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): void {
  if (!nonEmpty(value)) {
    throw new EditorialProjectionValidationError(`${field} is required`)
  }
  const length = value.trim().length
  if (length < minimum || length > maximum) {
    throw new EditorialProjectionValidationError(
      `${field} must be between ${minimum} and ${maximum} characters`,
    )
  }
}

const UTC_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/u

function assertUtcDateTime(value: unknown, field: string): void {
  if (
    !nonEmpty(value) ||
    !UTC_DATE_TIME_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new EditorialProjectionValidationError(`${field} must be an RFC 3339 UTC timestamp`)
  }
}

function validateHumanReview(data: SourceEvidenceProjection): void {
  assertBoundedText(data.reviewedBy, 'reviewedBy', 1, 100)
  assertUtcDateTime(data.reviewedAt, 'reviewedAt')
}

/**
 * Validate the status-specific rights decision stored on a source row. Draft
 * statuses intentionally remain saveable, while every decision status fails
 * closed when its audit contract is incomplete.
 */
export function validateRightsDecision(data: SourceEvidenceProjection): void {
  const status = typeof data.rightsStatus === 'string' ? data.rightsStatus.trim() : ''
  if (status === '' || status === 'unknown' || status === 'review_required') return

  if (data.recordType !== 'source') {
    throw new EditorialProjectionValidationError(
      'rights decisions may only be recorded on source records',
    )
  }

  switch (status) {
    case 'cleared':
      assertBoundedText(data.basis, 'basis', 12, 500)
      validateHumanReview(data)
      assertSafeHttpUrl(data.evidenceUrl, 'evidenceUrl')
      assertBoundedText(data.licenseReference, 'licenseReference', 3, 240)
      return
    case 'community_attributed':
      assertBoundedText(data.authorName, 'authorName', 1, 160)
      if (!nonEmpty(data.authorUrl) && !nonEmpty(data.authorHandle)) {
        throw new EditorialProjectionValidationError(
          'community attribution requires authorUrl or authorHandle',
        )
      }
      if (nonEmpty(data.authorUrl)) assertSafeHttpUrl(data.authorUrl, 'authorUrl')
      assertSafeHttpUrl(data.originalPostUrl, 'originalPostUrl')
      validateHumanReview(data)
      assertBoundedText(data.policyVersion, 'policyVersion', 1, 100)
      assertBoundedText(data.riskAcceptedBy, 'riskAcceptedBy', 1, 100)
      assertUtcDateTime(data.riskAcceptedAt, 'riskAcceptedAt')
      assertSafeHttpUrl(data.takedownUrl, 'takedownUrl')
      if (nonEmpty(data.licenseReference)) {
        throw new EditorialProjectionValidationError(
          'community-attributed content must not include a licenseReference',
        )
      }
      return
    case 'restricted':
      assertBoundedText(data.basis, 'basis', 12, 500)
      return
    case 'takedown':
      assertBoundedText(data.takedownCaseId, 'takedownCaseId', 1, 160)
      assertBoundedText(data.takedownHandledBy, 'takedownHandledBy', 1, 100)
      assertUtcDateTime(data.takedownHandledAt, 'takedownHandledAt')
      assertBoundedText(data.takedownScope, 'takedownScope', 3, 500)
      return
    default:
      throw new EditorialProjectionValidationError(`Unsupported rightsStatus: ${status}`)
  }
}

const CALENDAR_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})$/u
const ISO_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u

function validCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Payload stores date fields as instants, but sourcePublishedDate is a calendar
 * date. Preserve the explicit date portion and pin it to UTC midnight so the
 * projected YYYY-MM-DD cannot move when the CMS or compiler runs in another
 * timezone.
 */
export function normalizeSourcePublishedDate(value: unknown): string {
  if (!nonEmpty(value)) {
    throw new EditorialProjectionValidationError(
      'sourcePublishedDate must be a valid YYYY-MM-DD or timezone-qualified ISO datetime',
    )
  }

  const normalized = value.trim()
  const dateOnlyMatch = CALENDAR_DATE_PATTERN.exec(normalized)
  const dateTimeMatch = ISO_DATE_TIME_PATTERN.exec(normalized)
  const calendarDate = dateOnlyMatch?.[1] ?? dateTimeMatch?.[1]

  if (
    calendarDate === undefined ||
    !validCalendarDate(calendarDate) ||
    (dateTimeMatch !== null && Number.isNaN(Date.parse(normalized)))
  ) {
    throw new EditorialProjectionValidationError(
      'sourcePublishedDate must be a valid YYYY-MM-DD or timezone-qualified ISO datetime',
    )
  }

  return `${calendarDate}T00:00:00.000Z`
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
    if (data.sourcePublishedDate !== null && data.sourcePublishedDate !== undefined && data.sourcePublishedDate !== '') {
      normalizeSourcePublishedDate(data.sourcePublishedDate)
    }
    assertSafeHttpUrl(data.sourceUrl, 'sourceUrl')
  }
  if (data.recordType === 'evidence') {
    if (!nonEmpty(data.evidenceType)) {
      throw new EditorialProjectionValidationError('evidenceType is required for evidence records')
    }
    assertSafeHttpUrl(data.evidenceUrl, 'evidenceUrl')
  }
  validateRightsDecision(data)
}

export const validateSourceEvidence: CollectionBeforeValidateHook = ({ data }) => {
  if (data) {
    const projection = data as Record<string, unknown>
    if (
      projection.sourcePublishedDate !== null &&
      projection.sourcePublishedDate !== undefined &&
      projection.sourcePublishedDate !== ''
    ) {
      projection.sourcePublishedDate = normalizeSourcePublishedDate(projection.sourcePublishedDate)
    }
    validateSourceEvidenceProjection(projection)
  }
  return data
}
