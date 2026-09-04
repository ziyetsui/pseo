export interface PublicationDecisionTransactionalPayload {
  create(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
  update(args: Record<string, unknown>): Promise<unknown>
  readonly db: {
    readonly name?: string
    readonly pool?: {
      readonly options?: { readonly max?: number }
      connect(): Promise<{
        query(text: string, values?: readonly unknown[]): Promise<unknown>
        release(destroy?: boolean): void
      }>
    }
    beginTransaction(options?: unknown): Promise<number | string | null>
    commitTransaction(id: number | string): Promise<void>
    rollbackTransaction(id: number | string): Promise<void>
  }
}

export type PublicationDecisionLocalApi = Pick<
  PublicationDecisionTransactionalPayload,
  'create' | 'find' | 'update'
>

export class PublicationDecisionTransactionError extends Error {
  readonly code: 'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE' | 'PUBLICATION_DECISION_COMMIT_UNVERIFIED'
  readonly httpStatus: 503
  override readonly name = 'PublicationDecisionTransactionError'

  constructor(code: PublicationDecisionTransactionError['code'], detail: string) {
    super(detail)
    this.code = code
    this.httpStatus = 503
  }
}

function unavailable(): PublicationDecisionTransactionError {
  return new PublicationDecisionTransactionError(
    'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE',
    'CMS cannot provide an atomic publication decision transaction',
  )
}

function confirmedUnlock(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('rows' in value)) return false
  const rows = (value as { rows?: unknown }).rows
  if (!Array.isArray(rows) || rows.length !== 1) return false
  const row = rows[0]
  return typeof row === 'object' && row !== null &&
    'pg_advisory_unlock' in row &&
    row.pg_advisory_unlock === true
}

function confirmedTryLock(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('rows' in value)) return false
  const rows = (value as { rows?: unknown }).rows
  if (!Array.isArray(rows) || rows.length !== 1) return false
  const row = rows[0]
  return typeof row === 'object' && row !== null &&
    'pg_try_advisory_lock' in row &&
    row.pg_try_advisory_lock === true
}

const GLOBAL_DECISION_LOCK_KEY = 'pseo:publication-decisions:v1'
const LOCK_RETRY_LIMIT = 80
const LOCK_RETRY_DELAY_MS = 25

function waitForRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS))
}

/**
 * Serializes all beta publication decisions before opening the SERIALIZABLE
 * database transaction. One global lock is deliberate: it prevents a burst of
 * distinct-artifact locks from exhausting a small serverless connection pool.
 * Taking the session advisory lock first is essential: a
 * PostgreSQL serializable snapshot acquired while waiting on a transaction
 * lock could otherwise remain stale after the prior decision commits.
 */
export async function runSerializablePayloadDecision<T>(
  payload: PublicationDecisionTransactionalPayload,
  _artifactId: string,
  operation: (payload: PublicationDecisionLocalApi) => Promise<T>,
  verifyCommitted: (payload: PublicationDecisionTransactionalPayload, result: T) => Promise<boolean>,
): Promise<T> {
  if (
    payload.db?.name !== 'postgres' ||
    typeof payload.db.pool?.connect !== 'function' ||
    !Number.isSafeInteger(payload.db.pool.options?.max) ||
    Number(payload.db.pool.options?.max) < 2 ||
    typeof payload.db.beginTransaction !== 'function' ||
    typeof payload.db.commitTransaction !== 'function' ||
    typeof payload.db.rollbackTransaction !== 'function'
  ) {
    throw unavailable()
  }

  let lockClient: Awaited<ReturnType<NonNullable<typeof payload.db.pool>['connect']>> | null = null
  let lockHeld = false
  let transactionId: number | string | null = null
  let result!: T
  try {
    for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt += 1) {
      try {
        lockClient = await payload.db.pool.connect()
        const lockResult = await lockClient.query(
          'SELECT pg_try_advisory_lock(hashtextextended($1, 0))',
          [GLOBAL_DECISION_LOCK_KEY],
        )
        if (confirmedTryLock(lockResult)) {
          lockHeld = true
          break
        }
        lockClient.release()
        lockClient = null
      } catch {
        lockClient?.release(true)
        lockClient = null
        throw unavailable()
      }
      await waitForRetry()
    }
    if (!lockHeld || lockClient === null) throw unavailable()
    transactionId = await payload.db.beginTransaction({
      accessMode: 'read write',
      isolationLevel: 'serializable',
    }).catch(() => {
      throw unavailable()
    })
    if (transactionId === null) throw unavailable()

    const req = { payload, transactionID: transactionId }
    const transactional: PublicationDecisionLocalApi = {
      create: (args) => payload.create({ ...args, req }),
      find: (args) => payload.find({ ...args, req }),
      update: (args) => payload.update({ ...args, req }),
    }
    try {
      result = await operation(transactional)
      try {
        await payload.db.commitTransaction(transactionId)
      } catch {
        throw unavailable()
      }
      transactionId = null
    } catch (error: unknown) {
      if (transactionId !== null) {
        await payload.db.rollbackTransaction(transactionId).catch(() => {
          throw unavailable()
        })
        transactionId = null
      }
      throw error
    }

    // Payload's adapter commit API does not surface every driver commit error.
    // Re-read the immutable audit outside the transaction before acknowledging.
    let verified = false
    try {
      verified = await verifyCommitted(payload, result)
    } catch {
      verified = false
    }
    if (!verified) {
      throw new PublicationDecisionTransactionError(
        'PUBLICATION_DECISION_COMMIT_UNVERIFIED',
        'CMS could not verify the committed publication decision',
      )
    }
    return result
  } finally {
    if (transactionId !== null) {
      await payload.db.rollbackTransaction(transactionId).catch(() => undefined)
    }
    let destroyLockConnection = false
    if (lockHeld) {
      try {
        const unlockResult = await lockClient?.query(
          'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
          [GLOBAL_DECISION_LOCK_KEY],
        )
        if (confirmedUnlock(unlockResult)) {
          lockHeld = false
        } else {
          destroyLockConnection = true
        }
      } catch {
        destroyLockConnection = true
      }
    }
    lockClient?.release(destroyLockConnection)
  }
}
