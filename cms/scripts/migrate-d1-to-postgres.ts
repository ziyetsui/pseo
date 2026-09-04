import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdtemp,
  readFile,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync, constants as sqliteConstants } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

import { Client, type QueryResultRow } from 'pg'

const MIGRATION_VERSION = 'd1-to-postgres-v1'
const MIGRATION_LOCK_NAME = 'pseo:cms:d1-to-postgres:v1'
const POSTGRES_MIGRATION_TABLE = 'payload_migrations'
const REQUIRED_POSTGRES_BASELINE = '20260903_060851_initial_postgres_baseline'
const DEFAULT_DATABASE_ENV = 'DATABASE_URI'
const DEFAULT_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 500
const MAX_POSTGRES_PARAMETERS = 60_000
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/u
const SAFE_ENVIRONMENT_NAME = /^[A-Z][A-Z0-9_]*$/u
const REQUIRED_SOURCE_TABLES = [
  'users',
  'prompt_artifacts',
  'locale_variants',
  'taxonomies',
  'source_evidence',
  'publication_requests',
] as const
const KEY_ENTITY_TABLES = [
  'users',
  'prompt_artifacts',
  'locale_variants',
  'taxonomies',
  'source_evidence',
  'publication_decision_sequences',
  'content_approvals',
  'content_withdrawals',
  'publication_requests',
] as const

export type MigrationMode = 'plan' | 'dry-run' | 'apply' | 'verify'
export type SourceKind = 'd1-sql' | 'sqlite'

export interface MigrationCliOptions {
  readonly mode: MigrationMode
  readonly sourceKind: SourceKind
  readonly sourcePath: string
  readonly databaseEnvironmentName: string
  readonly batchSize: number
  readonly expectedCounts: ReadonlyMap<string, number>
  readonly confirmEmptyTarget: boolean
}

export interface SqliteColumn {
  readonly name: string
  readonly declaredType: string
  readonly notNull: boolean
  readonly primaryKeyOrder: number
}

export interface SourceTable {
  readonly name: string
  readonly columns: readonly SqliteColumn[]
  readonly primaryKey: readonly string[]
  readonly rowCount: number
}

export interface TargetColumn {
  readonly name: string
  readonly dataType: string
  readonly udtName: string
  readonly nullable: boolean
  readonly defaultExpression: string | null
  readonly identity: boolean
}

export interface TargetTable {
  readonly name: string
  readonly columns: readonly TargetColumn[]
  readonly primaryKey: readonly string[]
}

export interface ForeignKeyEdge {
  readonly child: string
  readonly parent: string
}

export interface TableParity {
  readonly rows: number
  readonly sha256: string
}

export interface MigrationReport {
  readonly version: typeof MIGRATION_VERSION
  readonly mode: MigrationMode
  readonly outcome: 'planned' | 'rolled_back' | 'committed' | 'verified'
  readonly source: {
    readonly kind: SourceKind
    readonly sha256: string
    readonly tableCount: number
    readonly totalRows: number
  }
  readonly copiedTableCount: number
  readonly copiedRows: number
  readonly keyEntityCounts: Readonly<Record<string, number>>
  readonly tables: Readonly<Record<string, TableParity>>
  readonly targetOnlyEmptyTables: readonly string[]
  readonly adapterMigrationHistory: {
    readonly sourceRowsExcluded: number
    readonly targetRowsPreserved: number
    readonly requiredPostgresBaseline: string
  }
}

interface SourceHandle {
  readonly database: DatabaseSync
  readonly kind: SourceKind
  readonly sha256: string
  close(): Promise<void>
}

interface TargetCatalog {
  readonly tables: ReadonlyMap<string, TargetTable>
  readonly foreignKeys: readonly ForeignKeyEdge[]
}

interface PgQueryResult<Row extends QueryResultRow = QueryResultRow> {
  readonly rows: Row[]
  readonly rowCount: number | null
}

export interface PostgresClientLike {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<PgQueryResult<Row>>
}

export class MigrationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MigrationError'
    this.code = code
  }
}

export function parseMigrationArgs(args: readonly string[]): MigrationCliOptions {
  let mode: MigrationMode | undefined
  let sourceKind: SourceKind | undefined
  let sourcePath: string | undefined
  let databaseEnvironmentName = DEFAULT_DATABASE_ENV
  let batchSize = DEFAULT_BATCH_SIZE
  let confirmEmptyTarget = false
  const expectedCounts = new Map<string, number>()

  const takeValue = (index: number, option: string): [string, number] => {
    const inlinePrefix = `${option}=`
    if (args[index]?.startsWith(inlinePrefix)) {
      const value = args[index]!.slice(inlinePrefix.length)
      if (!value) throw new MigrationError('CLI_VALUE_REQUIRED', `${option} requires a value`)
      return [value, index]
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new MigrationError('CLI_VALUE_REQUIRED', `${option} requires a value`)
    }
    return [value, index + 1]
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!
    if (argument === '--confirm-empty-target') {
      confirmEmptyTarget = true
      continue
    }
    if (argument === '--help' || argument === '-h') {
      throw new MigrationError('CLI_HELP', migrationUsage())
    }
    if (argument === '--database-uri' || argument.startsWith('--database-uri=')) {
      throw new MigrationError(
        'CLI_SECRET_ARGUMENT_FORBIDDEN',
        'Database credentials must be supplied through a named environment variable, never a CLI argument',
      )
    }
    if (argument === '--mode' || argument.startsWith('--mode=')) {
      const [value, consumedIndex] = takeValue(index, '--mode')
      if (!isMigrationMode(value)) {
        throw new MigrationError('CLI_MODE_INVALID', 'Mode must be plan, dry-run, apply, or verify')
      }
      mode = value
      index = consumedIndex
      continue
    }
    if (argument === '--source-sql' || argument.startsWith('--source-sql=')) {
      if (sourcePath) throw new MigrationError('CLI_SOURCE_DUPLICATE', 'Provide exactly one source')
      const [value, consumedIndex] = takeValue(index, '--source-sql')
      sourceKind = 'd1-sql'
      sourcePath = value
      index = consumedIndex
      continue
    }
    if (argument === '--source-sqlite' || argument.startsWith('--source-sqlite=')) {
      if (sourcePath) throw new MigrationError('CLI_SOURCE_DUPLICATE', 'Provide exactly one source')
      const [value, consumedIndex] = takeValue(index, '--source-sqlite')
      sourceKind = 'sqlite'
      sourcePath = value
      index = consumedIndex
      continue
    }
    if (argument === '--database-env' || argument.startsWith('--database-env=')) {
      const [value, consumedIndex] = takeValue(index, '--database-env')
      if (!SAFE_ENVIRONMENT_NAME.test(value) || value.startsWith('NEXT_PUBLIC_')) {
        throw new MigrationError(
          'CLI_DATABASE_ENV_INVALID',
          'Database environment variable must be an uppercase, server-only name',
        )
      }
      databaseEnvironmentName = value
      index = consumedIndex
      continue
    }
    if (argument === '--batch-size' || argument.startsWith('--batch-size=')) {
      const [value, consumedIndex] = takeValue(index, '--batch-size')
      const parsed = Number(value)
      if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_BATCH_SIZE) {
        throw new MigrationError(
          'CLI_BATCH_SIZE_INVALID',
          `Batch size must be an integer from 1 through ${MAX_BATCH_SIZE}`,
        )
      }
      batchSize = parsed
      index = consumedIndex
      continue
    }
    if (argument === '--expect' || argument.startsWith('--expect=')) {
      const [value, consumedIndex] = takeValue(index, '--expect')
      const separator = value.indexOf('=')
      const table = value.slice(0, separator)
      const countText = value.slice(separator + 1)
      const count = Number(countText)
      assertSafeIdentifier(table, 'expected table')
      if (table === POSTGRES_MIGRATION_TABLE) {
        throw new MigrationError(
          'CLI_EXPECTATION_EXCLUDED',
          `${POSTGRES_MIGRATION_TABLE} is adapter-specific and cannot be an expectation`,
        )
      }
      if (separator <= 0 || !Number.isSafeInteger(count) || count < 0) {
        throw new MigrationError('CLI_EXPECTATION_INVALID', 'Expected count must use table=nonnegative-integer')
      }
      if (expectedCounts.has(table)) {
        throw new MigrationError('CLI_EXPECTATION_DUPLICATE', `Duplicate expectation for table ${table}`)
      }
      expectedCounts.set(table, count)
      index = consumedIndex
      continue
    }
    throw new MigrationError('CLI_ARGUMENT_UNKNOWN', `Unknown option: ${argument}`)
  }

  if (!mode) throw new MigrationError('CLI_MODE_REQUIRED', '--mode is required')
  if (!sourceKind || !sourcePath) {
    throw new MigrationError('CLI_SOURCE_REQUIRED', 'Exactly one of --source-sql or --source-sqlite is required')
  }
  if (mode === 'apply' && !confirmEmptyTarget) {
    throw new MigrationError(
      'CLI_APPLY_CONFIRMATION_REQUIRED',
      'Apply requires --confirm-empty-target in addition to an empty-target database check',
    )
  }
  if (mode !== 'apply' && confirmEmptyTarget) {
    throw new MigrationError(
      'CLI_CONFIRMATION_MODE_INVALID',
      '--confirm-empty-target is accepted only with --mode apply',
    )
  }

  return {
    mode,
    sourceKind,
    sourcePath: path.resolve(sourcePath),
    databaseEnvironmentName,
    batchSize,
    expectedCounts,
    confirmEmptyTarget,
  }
}

export function migrationUsage(): string {
  return [
    'Usage:',
    '  pnpm migrate:d1-to-postgres --mode plan --source-sql <d1-export.sql>',
    '  DATABASE_URI=<secret> pnpm migrate:d1-to-postgres --mode dry-run --source-sql <d1-export.sql>',
    '  DATABASE_URI=<secret> pnpm migrate:d1-to-postgres --mode apply --confirm-empty-target --source-sql <d1-export.sql>',
    '  DATABASE_URI=<secret> pnpm migrate:d1-to-postgres --mode verify --source-sql <d1-export.sql>',
    '',
    'Optional: --expect prompt_artifacts=36 --expect locale_variants=36 --batch-size 100',
    'Credentials are accepted only through --database-env (DATABASE_URI by default).',
  ].join('\n')
}

export async function openMigrationSource(options: {
  readonly kind: SourceKind
  readonly sourcePath: string
}): Promise<SourceHandle> {
  const sourcePath = await validateSourceFile(options.sourcePath)
  const sha256 = await sha256File(sourcePath)

  if (options.kind === 'sqlite') {
    const database = openReadOnlySqlite(sourcePath)
    verifySqliteSource(database)
    return {
      database,
      kind: options.kind,
      sha256,
      async close() {
        database.close()
      },
    }
  }

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'pseo-d1-to-postgres-'))
  await chmod(temporaryDirectory, 0o700)
  const sqlitePath = path.join(temporaryDirectory, 'source.sqlite')
  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(sqlitePath, {
      allowExtension: false,
      timeout: 10_000,
    })
    installSqliteImportAuthorizer(database)
    // Wrangler exports tables and rows in an order that is valid only while
    // foreign-key enforcement is disabled. Integrity is checked after the
    // complete export has been restored.
    database.exec('PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=OFF')
    database.exec(await readFile(sourcePath, 'utf8'))
    database.close()
    database = undefined
    await chmod(sqlitePath, 0o600)
    const readOnlyDatabase = openReadOnlySqlite(sqlitePath)
    verifySqliteSource(readOnlyDatabase)
    return {
      database: readOnlyDatabase,
      kind: options.kind,
      sha256,
      async close() {
        readOnlyDatabase.close()
        await safeRemoveTemporaryDirectory(temporaryDirectory)
      },
    }
  } catch (error) {
    try {
      database?.close()
    } catch {
      // Preserve the original failure and still attempt the private temp cleanup.
    }
    await safeRemoveTemporaryDirectory(temporaryDirectory)
    throw error
  }
}

export function inspectSource(database: DatabaseSync): readonly SourceTable[] {
  const tableStatement = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `)
  const names = tableStatement.all().map((row) => String(row.name))
  if (names.length === 0) {
    throw new MigrationError('SOURCE_EMPTY_SCHEMA', 'The source contains no Payload tables')
  }

  const tables = names.map((name): SourceTable => {
    assertSafeIdentifier(name, 'source table')
    const columns = database.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).all()
      .map((row): SqliteColumn => ({
        name: String(row.name),
        declaredType: String(row.type ?? ''),
        notNull: Number(row.notnull) === 1,
        primaryKeyOrder: Number(row.pk),
      }))
    for (const column of columns) assertSafeIdentifier(column.name, `column in ${name}`)
    if (columns.length === 0) {
      throw new MigrationError('SOURCE_TABLE_WITHOUT_COLUMNS', `Source table ${name} has no columns`)
    }
    const primaryKey = columns
      .filter((column) => column.primaryKeyOrder > 0)
      .sort((left, right) => left.primaryKeyOrder - right.primaryKeyOrder)
      .map((column) => column.name)
    const countStatement = database.prepare(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier(name)}`,
    )
    countStatement.setReadBigInts(true)
    const count = toSafeCount(countStatement.get()?.count, `source table ${name}`)
    return { name, columns, primaryKey, rowCount: count }
  })

  for (const required of REQUIRED_SOURCE_TABLES) {
    if (!tables.some((table) => table.name === required)) {
      throw new MigrationError('SOURCE_REQUIRED_TABLE_MISSING', `Required source table is missing: ${required}`)
    }
  }
  return tables
}

export function assertExpectedCounts(
  sourceTables: readonly SourceTable[],
  expectedCounts: ReadonlyMap<string, number>,
): void {
  const counts = new Map(sourceTables.map((table) => [table.name, table.rowCount]))
  for (const [table, expected] of expectedCounts) {
    const actual = counts.get(table)
    if (actual === undefined) {
      throw new MigrationError('EXPECTATION_TABLE_MISSING', `Expected table is absent from source: ${table}`)
    }
    if (actual !== expected) {
      throw new MigrationError(
        'EXPECTATION_COUNT_MISMATCH',
        `Expected ${expected} rows in ${table}, found ${actual}`,
      )
    }
  }
}

export async function inspectTarget(client: PostgresClientLike): Promise<TargetCatalog> {
  const columns = await client.query<{
    tableName: string
    columnName: string
    dataType: string
    udtName: string
    isNullable: string
    defaultExpression: string | null
    isIdentity: string
  }>(`
    SELECT
      table_name AS "tableName",
      column_name AS "columnName",
      data_type AS "dataType",
      udt_name AS "udtName",
      is_nullable AS "isNullable",
      column_default AS "defaultExpression",
      is_identity AS "isIdentity"
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)
  const primaryKeys = await client.query<{
    tableName: string
    columnName: string
    ordinalPosition: number
  }>(`
    SELECT
      tc.table_name AS "tableName",
      kcu.column_name AS "columnName",
      kcu.ordinal_position AS "ordinalPosition"
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name, kcu.ordinal_position
  `)
  const foreignKeys = await client.query<{
    child: string
    parent: string
  }>(`
    SELECT
      child.relname AS child,
      parent.relname AS parent
    FROM pg_constraint AS fk_constraint
    JOIN pg_class AS child ON child.oid = fk_constraint.conrelid
    JOIN pg_namespace AS child_namespace ON child_namespace.oid = child.relnamespace
    JOIN pg_class AS parent ON parent.oid = fk_constraint.confrelid
    JOIN pg_namespace AS parent_namespace ON parent_namespace.oid = parent.relnamespace
    WHERE
      fk_constraint.contype = 'f'
      AND child_namespace.nspname = 'public'
      AND parent_namespace.nspname = 'public'
    ORDER BY child.relname, parent.relname
  `)

  const columnsByTable = new Map<string, TargetColumn[]>()
  for (const row of columns.rows) {
    assertSafeIdentifier(row.tableName, 'target table')
    assertSafeIdentifier(row.columnName, `column in ${row.tableName}`)
    const list = columnsByTable.get(row.tableName) ?? []
    list.push({
      name: row.columnName,
      dataType: row.dataType,
      udtName: row.udtName,
      nullable: row.isNullable === 'YES',
      defaultExpression: row.defaultExpression,
      identity: row.isIdentity === 'YES',
    })
    columnsByTable.set(row.tableName, list)
  }
  const primaryKeysByTable = new Map<string, string[]>()
  for (const row of primaryKeys.rows) {
    const list = primaryKeysByTable.get(row.tableName) ?? []
    list.push(row.columnName)
    primaryKeysByTable.set(row.tableName, list)
  }
  const tables = new Map<string, TargetTable>()
  for (const [name, tableColumns] of columnsByTable) {
    tables.set(name, {
      name,
      columns: tableColumns,
      primaryKey: primaryKeysByTable.get(name) ?? [],
    })
  }
  if (!tables.has(POSTGRES_MIGRATION_TABLE)) {
    throw new MigrationError(
      'TARGET_SCHEMA_MISSING',
      `PostgreSQL target has not been migrated: ${POSTGRES_MIGRATION_TABLE} is absent`,
    )
  }
  return { tables, foreignKeys: foreignKeys.rows }
}

export function assertCompatibleSchemas(
  sourceTables: readonly SourceTable[],
  targetCatalog: TargetCatalog,
): { readonly copyTables: readonly string[]; readonly targetOnlyTables: readonly string[] } {
  const sourceNames = new Set(sourceTables.map((table) => table.name))
  const copyTables = sourceTables
    .map((table) => table.name)
    .filter((name) => name !== POSTGRES_MIGRATION_TABLE)
    .sort()
  const targetOnlyTables = [...targetCatalog.tables.keys()]
    .filter((name) => !sourceNames.has(name) && name !== POSTGRES_MIGRATION_TABLE)
    .sort()

  for (const sourceTable of sourceTables) {
    if (sourceTable.name === POSTGRES_MIGRATION_TABLE) continue
    const targetTable = targetCatalog.tables.get(sourceTable.name)
    if (!targetTable) {
      throw new MigrationError(
        'TARGET_TABLE_MISSING',
        `PostgreSQL target is missing source table ${sourceTable.name}`,
      )
    }
    const sourceColumns = new Set(sourceTable.columns.map((column) => column.name))
    const targetColumns = new Map(targetTable.columns.map((column) => [column.name, column]))
    for (const sourceColumn of sourceTable.columns) {
      if (!targetColumns.has(sourceColumn.name)) {
        throw new MigrationError(
          'TARGET_COLUMN_MISSING',
          `PostgreSQL target is missing ${sourceTable.name}.${sourceColumn.name}`,
        )
      }
    }
    for (const targetColumn of targetTable.columns) {
      if (
        !sourceColumns.has(targetColumn.name)
        && (
          !targetColumn.nullable
          || targetColumn.defaultExpression !== null
          || targetColumn.identity
        )
      ) {
        throw new MigrationError(
          'SOURCE_UNMAPPED_COLUMN_UNSAFE',
          `Source lacks safely nullable target column ${sourceTable.name}.${targetColumn.name}`,
        )
      }
    }
  }
  return { copyTables, targetOnlyTables }
}

export function topologicallySortTables(
  tableNames: readonly string[],
  foreignKeys: readonly ForeignKeyEdge[],
): readonly string[] {
  const tables = new Set(tableNames)
  const parentsByChild = new Map<string, Set<string>>()
  const childrenByParent = new Map<string, Set<string>>()
  for (const table of tables) {
    parentsByChild.set(table, new Set())
    childrenByParent.set(table, new Set())
  }
  for (const edge of foreignKeys) {
    if (!tables.has(edge.child) || !tables.has(edge.parent) || edge.child === edge.parent) continue
    parentsByChild.get(edge.child)!.add(edge.parent)
    childrenByParent.get(edge.parent)!.add(edge.child)
  }
  const ready = [...tables]
    .filter((table) => parentsByChild.get(table)!.size === 0)
    .sort()
  const ordered: string[] = []
  while (ready.length > 0) {
    const table = ready.shift()!
    ordered.push(table)
    for (const child of [...childrenByParent.get(table)!].sort()) {
      const parents = parentsByChild.get(child)!
      parents.delete(table)
      if (parents.size === 0 && !ordered.includes(child) && !ready.includes(child)) {
        ready.push(child)
        ready.sort()
      }
    }
  }
  if (ordered.length !== tables.size) {
    const blocked = [...tables].filter((table) => !ordered.includes(table)).sort()
    throw new MigrationError(
      'TARGET_FOREIGN_KEY_CYCLE',
      `Cannot derive a safe insert order for: ${blocked.join(', ')}`,
    )
  }
  return ordered
}

export function normalizeForTarget(value: unknown, column: TargetColumn): unknown {
  if (value === null || value === undefined) return null
  if (column.dataType === 'boolean') {
    if (value === true || value === 1 || value === 1n || value === '1' || value === 'true') return true
    if (value === false || value === 0 || value === 0n || value === '0' || value === 'false') return false
    throw new MigrationError('VALUE_BOOLEAN_INVALID', `Invalid boolean value for column ${column.name}`)
  }
  if (column.dataType.includes('timestamp')) {
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.valueOf())) {
      throw new MigrationError('VALUE_TIMESTAMP_INVALID', `Invalid timestamp for column ${column.name}`)
    }
    return date.toISOString()
  }
  if (column.dataType === 'json' || column.dataType === 'jsonb') {
    const parsed = typeof value === 'string' ? parseJsonValue(value, column.name) : value
    return canonicalize(parsed)
  }
  if (column.dataType === 'bytea') {
    if (Buffer.isBuffer(value)) return value.toString('base64')
    if (value instanceof Uint8Array) return Buffer.from(value).toString('base64')
    throw new MigrationError('VALUE_BYTEA_INVALID', `Invalid binary value for column ${column.name}`)
  }
  if (column.dataType === 'numeric' || column.dataType === 'decimal') {
    if (typeof value === 'bigint') return value.toString()
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      throw new MigrationError('VALUE_NUMERIC_INVALID', `Invalid numeric value for column ${column.name}`)
    }
    return Object.is(numeric, -0) ? '0' : String(numeric)
  }
  if (column.dataType === 'integer' || column.dataType === 'smallint') {
    const integer = typeof value === 'bigint' ? Number(value) : Number(value)
    if (!Number.isSafeInteger(integer)) {
      throw new MigrationError('VALUE_INTEGER_INVALID', `Invalid integer value for column ${column.name}`)
    }
    return integer
  }
  if (column.dataType === 'bigint') return String(value)
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  return value
}

export function hashRows(
  rows: readonly Readonly<Record<string, unknown>>[],
  columns: readonly TargetColumn[],
): string {
  const canonicalRows = rows.map((row) => stableJson(
    columns.map((column) => normalizeForTarget(row[column.name], column)),
  )).sort()
  const hash = createHash('sha256')
  for (const row of canonicalRows) hash.update(row).update('\n')
  return `sha256:${hash.digest('hex')}`
}

export async function runMigration(
  options: MigrationCliOptions,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<MigrationReport> {
  const source = await openMigrationSource({
    kind: options.sourceKind,
    sourcePath: options.sourcePath,
  })
  try {
    const sourceTables = inspectSource(source.database)
    assertExpectedCounts(sourceTables, options.expectedCounts)
    const sourceMigrationRows = sourceTables.find(
      (table) => table.name === POSTGRES_MIGRATION_TABLE,
    )?.rowCount ?? 0
    if (options.mode === 'plan') {
      return buildPlanReport(options, source, sourceTables, sourceMigrationRows)
    }

    const databaseUri = readDatabaseUri(environment, options.databaseEnvironmentName)
    const client = new Client({
      connectionString: databaseUri,
      application_name: MIGRATION_VERSION,
    })
    await client.connect()
    try {
      return await runAgainstPostgres(client, options, source, sourceTables, sourceMigrationRows)
    } finally {
      await client.end().catch(() => undefined)
    }
  } finally {
    await source.close()
  }
}

export async function runAgainstPostgres(
  client: PostgresClientLike,
  options: MigrationCliOptions,
  source: Pick<SourceHandle, 'database' | 'kind' | 'sha256'>,
  sourceTables: readonly SourceTable[],
  sourceMigrationRows: number,
): Promise<MigrationReport> {
  const readOnly = options.mode === 'verify'
  let phase = 'begin'
  let activeTable: string | undefined
  let transactionOpen = false
  try {
    await client.query(
      readOnly
        ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
        : 'BEGIN ISOLATION LEVEL SERIALIZABLE',
    )
    transactionOpen = true
    phase = 'configure-transaction'
    await client.query("SET LOCAL statement_timeout = '10min'")
    await client.query("SET LOCAL lock_timeout = '10s'")
    if (!readOnly) {
      phase = 'advisory-lock'
      const advisoryLock = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
        [MIGRATION_LOCK_NAME],
      )
      if (advisoryLock.rows[0]?.locked !== true) {
        throw new MigrationError('TARGET_MIGRATION_BUSY', 'Another CMS data migration holds the target lock')
      }
    }

    phase = 'inspect-schema'
    const targetCatalog = await inspectTarget(client)
    phase = 'compare-schema'
    const compatibility = assertCompatibleSchemas(sourceTables, targetCatalog)
    phase = 'order-tables'
    const orderedTables = topologicallySortTables(
      compatibility.copyTables,
      targetCatalog.foreignKeys,
    )

    if (!readOnly) {
      phase = 'lock-and-check-empty'
      await lockAndAssertEmptyTarget(client, targetCatalog)
    }
    phase = 'check-postgres-baseline'
    const targetMigrationRows = await assertPostgresBaseline(client)
    if (!readOnly) {
      for (const tableName of orderedTables) {
        phase = 'copy-table'
        activeTable = tableName
        const sourceTable = sourceTables.find((table) => table.name === tableName)!
        const targetTable = targetCatalog.tables.get(tableName)!
        await copyTable(client, source.database, sourceTable, targetTable, options.batchSize)
      }
      activeTable = undefined
      phase = 'restart-sequences'
      await restartOwnedSequences(client, targetCatalog, compatibility.copyTables)
    }

    phase = 'verify-parity'
    const parity = await verifyParity(
      client,
      source.database,
      sourceTables,
      targetCatalog,
      compatibility.copyTables,
      compatibility.targetOnlyTables,
    )
    const report = buildMigrationReport({
      options,
      source,
      sourceTables,
      sourceMigrationRows,
      targetMigrationRows,
      parity,
      targetOnlyTables: compatibility.targetOnlyTables,
    })

    if (options.mode === 'dry-run') {
      phase = 'rollback-dry-run'
      await client.query('ROLLBACK')
      transactionOpen = false
      return { ...report, outcome: 'rolled_back' }
    }
    phase = 'commit'
    await client.query('COMMIT')
    transactionOpen = false
    return report
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined)
    throw safePostgresOperationError(error, phase, activeTable)
  }
}

async function copyTable(
  client: PostgresClientLike,
  sourceDatabase: DatabaseSync,
  sourceTable: SourceTable,
  targetTable: TargetTable,
  requestedBatchSize: number,
): Promise<void> {
  const targetColumns = new Map(targetTable.columns.map((column) => [column.name, column]))
  const columns = sourceTable.columns.map((column) => targetColumns.get(column.name)!)
  const rows = readSourceRows(sourceDatabase, sourceTable, columns.map((column) => column.name))
  const batchSize = Math.max(
    1,
    Math.min(requestedBatchSize, Math.floor(MAX_POSTGRES_PARAMETERS / columns.length)),
  )
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    const values: unknown[] = []
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(preparePostgresValue(row[column.name], column))
        return `$${values.length}`
      })
      return `(${placeholders.join(', ')})`
    })
    const result = await client.query(
      `INSERT INTO ${quoteQualifiedIdentifier('public', sourceTable.name)} (${columns.map((column) => quoteIdentifier(column.name)).join(', ')}) VALUES ${tuples.join(', ')}`,
      values,
    )
    if (result.rowCount !== batch.length) {
      throw new MigrationError(
        'TARGET_INSERT_COUNT_MISMATCH',
        `Insert count mismatch for table ${sourceTable.name}`,
      )
    }
  }
}

async function verifyParity(
  client: PostgresClientLike,
  sourceDatabase: DatabaseSync,
  sourceTables: readonly SourceTable[],
  targetCatalog: TargetCatalog,
  copyTables: readonly string[],
  targetOnlyTables: readonly string[],
): Promise<Readonly<Record<string, TableParity>>> {
  const parity: Record<string, TableParity> = {}
  for (const tableName of copyTables) {
    const sourceTable = sourceTables.find((table) => table.name === tableName)!
    const targetTable = targetCatalog.tables.get(tableName)!
    const targetColumnMap = new Map(targetTable.columns.map((column) => [column.name, column]))
    const columns = sourceTable.columns.map((column) => targetColumnMap.get(column.name)!)
    const sourceRows = readSourceRows(
      sourceDatabase,
      sourceTable,
      columns.map((column) => column.name),
    )
    const targetRows = await readTargetRows(client, targetTable, columns)
    if (sourceRows.length !== targetRows.length) {
      throw new MigrationError(
        'PARITY_ROW_COUNT_MISMATCH',
        `Row-count parity failed for ${tableName}: source ${sourceRows.length}, target ${targetRows.length}`,
      )
    }
    const sourceHash = hashRows(sourceRows, columns)
    const targetHash = hashRows(targetRows, columns)
    if (sourceHash !== targetHash) {
      throw new MigrationError('PARITY_HASH_MISMATCH', `Value parity failed for table ${tableName}`)
    }
    parity[tableName] = { rows: sourceRows.length, sha256: sourceHash }
  }
  for (const tableName of targetOnlyTables) {
    const count = await readTargetCount(client, tableName)
    if (count !== 0) {
      throw new MigrationError(
        'PARITY_TARGET_ONLY_DATA',
        `Target-only table ${tableName} contains ${count} rows`,
      )
    }
  }
  return parity
}

async function readTargetRows(
  client: PostgresClientLike,
  table: TargetTable,
  columns: readonly TargetColumn[],
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const orderColumns = table.primaryKey.length > 0
    ? table.primaryKey
    : columns.map((column) => column.name)
  const result = await client.query(
    `SELECT ${columns.map((column) => quoteIdentifier(column.name)).join(', ')} FROM ${quoteQualifiedIdentifier('public', table.name)} ORDER BY ${orderColumns.map(quoteIdentifier).join(', ')}`,
  )
  return result.rows
}

function readSourceRows(
  database: DatabaseSync,
  table: SourceTable,
  columnNames: readonly string[],
): readonly Readonly<Record<string, unknown>>[] {
  const orderColumns = table.primaryKey.length > 0 ? table.primaryKey : columnNames
  const statement = database.prepare(
    `SELECT ${columnNames.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(table.name)} ORDER BY ${orderColumns.map(quoteIdentifier).join(', ')}`,
  )
  statement.setReadBigInts(true)
  return statement.all() as Readonly<Record<string, unknown>>[]
}

async function lockAndAssertEmptyTarget(
  client: PostgresClientLike,
  targetCatalog: TargetCatalog,
): Promise<void> {
  const allTables = [...targetCatalog.tables.keys()].sort()
  if (allTables.length > 0) {
    await client.query(
      `LOCK TABLE ${allTables.map((name) => quoteQualifiedIdentifier('public', name)).join(', ')} IN ACCESS EXCLUSIVE MODE`,
    )
  }
  const tables = allTables.filter((name) => name !== POSTGRES_MIGRATION_TABLE)
  for (const table of tables) {
    const count = await readTargetCount(client, table)
    if (count !== 0) {
      throw new MigrationError(
        'TARGET_NOT_EMPTY',
        `PostgreSQL target table ${table} contains ${count} rows; refusing to overwrite or merge`,
      )
    }
  }
}

async function assertPostgresBaseline(client: PostgresClientLike): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteQualifiedIdentifier('public', POSTGRES_MIGRATION_TABLE)} WHERE name = $1`,
    [REQUIRED_POSTGRES_BASELINE],
  )
  const baselineRows = toSafeCount(result.rows[0]?.count, 'PostgreSQL migration history')
  if (baselineRows !== 1) {
    throw new MigrationError(
      'TARGET_BASELINE_MISSING',
      `PostgreSQL migration history does not contain ${REQUIRED_POSTGRES_BASELINE} exactly once`,
    )
  }
  const total = await readTargetCount(client, POSTGRES_MIGRATION_TABLE)
  return total
}

async function restartOwnedSequences(
  client: PostgresClientLike,
  targetCatalog: TargetCatalog,
  tableNames: readonly string[],
): Promise<void> {
  for (const tableName of [...tableNames].sort()) {
    const table = targetCatalog.tables.get(tableName)!
    for (const column of table.columns) {
      if (!column.defaultExpression?.includes('nextval(')) continue
      const sequence = await client.query<{ sequenceName: string | null }>(
        'SELECT pg_get_serial_sequence($1, $2) AS "sequenceName"',
        [`public.${tableName}`, column.name],
      )
      const sequenceName = sequence.rows[0]?.sequenceName
      if (!sequenceName) {
        throw new MigrationError(
          'TARGET_SEQUENCE_MISSING',
          `Serial sequence missing for ${tableName}.${column.name}`,
        )
      }
      const maximum = await client.query<{ maximum: string | null }>(
        `SELECT MAX(${quoteIdentifier(column.name)})::text AS maximum FROM ${quoteQualifiedIdentifier('public', tableName)}`,
      )
      const maxValue = maximum.rows[0]?.maximum
      const restartAt = maxValue === null || maxValue === undefined
        ? 1n
        : BigInt(maxValue) + 1n
      const quotedSequence = quotePostgresQualifiedName(sequenceName)
      await client.query(`ALTER SEQUENCE ${quotedSequence} RESTART WITH ${restartAt.toString()}`)
    }
  }
}

async function readTargetCount(client: PostgresClientLike, tableName: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteQualifiedIdentifier('public', tableName)}`,
  )
  return toSafeCount(result.rows[0]?.count, `target table ${tableName}`)
}

function buildPlanReport(
  options: MigrationCliOptions,
  source: Pick<SourceHandle, 'kind' | 'sha256'>,
  sourceTables: readonly SourceTable[],
  sourceMigrationRows: number,
): MigrationReport {
  const copied = sourceTables.filter((table) => table.name !== POSTGRES_MIGRATION_TABLE)
  return {
    version: MIGRATION_VERSION,
    mode: options.mode,
    outcome: 'planned',
    source: {
      kind: source.kind,
      sha256: `sha256:${source.sha256}`,
      tableCount: sourceTables.length,
      totalRows: sourceTables.reduce((sum, table) => sum + table.rowCount, 0),
    },
    copiedTableCount: copied.length,
    copiedRows: copied.reduce((sum, table) => sum + table.rowCount, 0),
    keyEntityCounts: keyEntityCounts(sourceTables),
    tables: Object.fromEntries(copied.map((table) => [table.name, {
      rows: table.rowCount,
      sha256: 'not-computed-without-target-types',
    }])),
    targetOnlyEmptyTables: [],
    adapterMigrationHistory: {
      sourceRowsExcluded: sourceMigrationRows,
      targetRowsPreserved: 0,
      requiredPostgresBaseline: REQUIRED_POSTGRES_BASELINE,
    },
  }
}

function buildMigrationReport(input: {
  readonly options: MigrationCliOptions
  readonly source: Pick<SourceHandle, 'kind' | 'sha256'>
  readonly sourceTables: readonly SourceTable[]
  readonly sourceMigrationRows: number
  readonly targetMigrationRows: number
  readonly parity: Readonly<Record<string, TableParity>>
  readonly targetOnlyTables: readonly string[]
}): MigrationReport {
  const copiedRows = Object.values(input.parity).reduce((sum, table) => sum + table.rows, 0)
  return {
    version: MIGRATION_VERSION,
    mode: input.options.mode,
    outcome: input.options.mode === 'verify' ? 'verified' : 'committed',
    source: {
      kind: input.source.kind,
      sha256: `sha256:${input.source.sha256}`,
      tableCount: input.sourceTables.length,
      totalRows: input.sourceTables.reduce((sum, table) => sum + table.rowCount, 0),
    },
    copiedTableCount: Object.keys(input.parity).length,
    copiedRows,
    keyEntityCounts: Object.fromEntries(KEY_ENTITY_TABLES.map((table) => [
      table,
      input.parity[table]?.rows ?? 0,
    ])),
    tables: input.parity,
    targetOnlyEmptyTables: input.targetOnlyTables,
    adapterMigrationHistory: {
      sourceRowsExcluded: input.sourceMigrationRows,
      targetRowsPreserved: input.targetMigrationRows,
      requiredPostgresBaseline: REQUIRED_POSTGRES_BASELINE,
    },
  }
}

function keyEntityCounts(sourceTables: readonly SourceTable[]): Readonly<Record<string, number>> {
  const counts = new Map(sourceTables.map((table) => [table.name, table.rowCount]))
  return Object.fromEntries(KEY_ENTITY_TABLES.map((table) => [table, counts.get(table) ?? 0]))
}

function preparePostgresValue(value: unknown, column: TargetColumn): unknown {
  if (value === null || value === undefined) return null
  if (column.dataType === 'boolean') return normalizeForTarget(value, column)
  if (column.dataType === 'json' || column.dataType === 'jsonb') {
    const parsed = typeof value === 'string' ? parseJsonValue(value, column.name) : value
    // An actual JSON null must remain a JSON document; passing parsed null to
    // pg would turn it into SQL NULL.
    return stableJson(parsed)
  }
  if (column.dataType === 'integer' || column.dataType === 'smallint') {
    return normalizeForTarget(value, column)
  }
  if (typeof value === 'bigint') return value.toString()
  return value
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Readonly<Record<string, unknown>>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    )
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new MigrationError('VALUE_NON_FINITE', 'Non-finite values cannot be migrated')
  }
  return value
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function parseJsonValue(value: string, columnName: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new MigrationError('VALUE_JSON_INVALID', `Invalid JSON value for column ${columnName}`)
  }
}

function openReadOnlySqlite(sqlitePath: string): DatabaseSync {
  const database = new DatabaseSync(sqlitePath, {
    allowExtension: false,
    readOnly: true,
    timeout: 10_000,
  })
  database.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON')
  return database
}

function verifySqliteSource(database: DatabaseSync): void {
  const integrity = database.prepare('PRAGMA integrity_check(1)').get()
  if (integrity?.integrity_check !== 'ok') {
    throw new MigrationError('SOURCE_INTEGRITY_FAILED', 'SQLite source integrity check failed')
  }
  if (database.prepare('PRAGMA foreign_key_check').get() !== undefined) {
    throw new MigrationError('SOURCE_FOREIGN_KEY_FAILED', 'SQLite source foreign-key check failed')
  }
}

function installSqliteImportAuthorizer(database: DatabaseSync): void {
  database.setAuthorizer((actionCode, first, second) => {
    if (actionCode === sqliteConstants.SQLITE_ATTACH || actionCode === sqliteConstants.SQLITE_DETACH) {
      return sqliteConstants.SQLITE_DENY
    }
    if (
      actionCode === sqliteConstants.SQLITE_FUNCTION
      && String(second ?? first ?? '').toLowerCase() === 'load_extension'
    ) {
      return sqliteConstants.SQLITE_DENY
    }
    return sqliteConstants.SQLITE_OK
  })
}

async function validateSourceFile(inputPath: string): Promise<string> {
  const absolute = path.resolve(inputPath)
  const stats = await lstat(absolute).catch(() => undefined)
  if (!stats?.isFile() || stats.isSymbolicLink()) {
    throw new MigrationError('SOURCE_FILE_INVALID', 'Migration source must be an existing regular file, not a symlink')
  }
  if (stats.size === 0) throw new MigrationError('SOURCE_FILE_EMPTY', 'Migration source is empty')
  return realpath(absolute)
}

async function sha256File(filename: string): Promise<string> {
  const bytes = await readFile(filename)
  return createHash('sha256').update(bytes).digest('hex')
}

async function safeRemoveTemporaryDirectory(directory: string): Promise<void> {
  const base = path.resolve(tmpdir()) + path.sep
  const resolved = path.resolve(directory)
  if (!resolved.startsWith(base) || path.basename(resolved).startsWith('pseo-d1-to-postgres-') === false) {
    throw new MigrationError('TEMP_PATH_INVALID', 'Refusing to remove an unexpected temporary path')
  }
  await rm(resolved, { recursive: true, force: true })
}

function readDatabaseUri(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]
  if (!value) {
    throw new MigrationError('DATABASE_URI_REQUIRED', `${name} is required for this mode`)
  }
  if (value.includes('\n') || !/^postgres(?:ql)?:\/\//u.test(value)) {
    throw new MigrationError('DATABASE_URI_INVALID', `${name} must contain one PostgreSQL URI`)
  }
  return value
}

function quoteIdentifier(identifier: string): string {
  assertSafeIdentifier(identifier, 'SQL identifier')
  return `"${identifier}"`
}

function quoteQualifiedIdentifier(schema: string, identifier: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(identifier)}`
}

function quotePostgresQualifiedName(name: string): string {
  const pieces = name.split('.')
  if (pieces.length === 1) return quoteIdentifier(pieces[0]!)
  if (pieces.length === 2) return quoteQualifiedIdentifier(pieces[0]!, pieces[1]!)
  throw new MigrationError('TARGET_SEQUENCE_NAME_INVALID', 'PostgreSQL returned an invalid sequence name')
}

function assertSafeIdentifier(value: string, description: string): void {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new MigrationError('IDENTIFIER_UNSAFE', `Unsafe ${description}`)
  }
}

function toSafeCount(value: unknown, description: string): number {
  const count = typeof value === 'bigint' ? Number(value) : Number(value)
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new MigrationError('ROW_COUNT_INVALID', `Invalid row count for ${description}`)
  }
  return count
}

function isMigrationMode(value: string): value is MigrationMode {
  return value === 'plan' || value === 'dry-run' || value === 'apply' || value === 'verify'
}

function safeCliFailure(error: unknown): { readonly code: string; readonly message: string } {
  if (error instanceof MigrationError) return { code: error.code, message: error.message }
  return {
    code: 'MIGRATION_UNEXPECTED',
    message: 'Migration failed; database and row details were suppressed',
  }
}

function safePostgresOperationError(
  error: unknown,
  phase: string,
  activeTable?: string,
): MigrationError {
  if (error instanceof MigrationError) return error
  const record = typeof error === 'object' && error !== null
    ? error as Readonly<Record<string, unknown>>
    : {}
  const sqlState = safePostgresDiagnostic(record.code, /^[0-9A-Z]{5}$/u)
  const fields = [
    ['phase', phase],
    ['sqlstate', sqlState],
    ['schema', safePostgresDiagnostic(record.schema)],
    ['table', safePostgresDiagnostic(record.table) ?? activeTable],
    ['column', safePostgresDiagnostic(record.column)],
    ['constraint', safePostgresDiagnostic(record.constraint)],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  const summary = fields.map(([name, value]) => `${name}=${value}`).join(', ')
  return new MigrationError(
    sqlState ? `POSTGRES_${sqlState}` : 'POSTGRES_OPERATION_FAILED',
    `PostgreSQL migration operation failed (${summary})`,
  )
}

function safePostgresDiagnostic(
  value: unknown,
  pattern: RegExp = /^[a-zA-Z_][a-zA-Z0-9_$.-]{0,127}$/u,
): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined
}

async function main(): Promise<void> {
  try {
    const options = parseMigrationArgs(process.argv.slice(2))
    const report = await runMigration(options)
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } catch (error) {
    const failure = safeCliFailure(error)
    process.stderr.write(`${JSON.stringify({ error: failure }, null, 2)}\n`)
    process.exitCode = failure.code === 'CLI_HELP' ? 0 : 1
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === entrypoint) await main()
