import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import type { QueryResultRow } from 'pg'

import {
  MigrationError,
  assertCompatibleSchemas,
  hashRows,
  inspectSource,
  inspectTarget,
  normalizeForTarget,
  openMigrationSource,
  parseMigrationArgs,
  runAgainstPostgres,
  topologicallySortTables,
  type MigrationCliOptions,
  type PostgresClientLike,
  type SourceTable,
  type TargetColumn,
} from '../scripts/migrate-d1-to-postgres.ts'

const requiredSourceTables = [
  'users',
  'prompt_artifacts',
  'locale_variants',
  'taxonomies',
  'source_evidence',
  'publication_requests',
] as const

test('CLI requires an explicit mode/source and a second apply confirmation', () => {
  const plan = parseMigrationArgs([
    '--mode',
    'plan',
    '--source-sql',
    'backup.sql',
    '--expect',
    'prompt_artifacts=36',
  ])
  assert.equal(plan.mode, 'plan')
  assert.equal(plan.sourceKind, 'd1-sql')
  assert.equal(plan.expectedCounts.get('prompt_artifacts'), 36)

  assert.throws(
    () => parseMigrationArgs(['--mode', 'apply', '--source-sql', 'backup.sql']),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'CLI_APPLY_CONFIRMATION_REQUIRED',
  )
  assert.throws(
    () => parseMigrationArgs([
      '--mode=plan',
      '--source-sql=backup.sql',
      '--database-uri=postgresql://do-not-print.invalid/secret',
    ]),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'CLI_SECRET_ARGUMENT_FORBIDDEN'
      && !error.message.includes('do-not-print'),
  )
})

test('D1 SQL restore is private, foreign-key checked, and preserves auth fields without logging them', async () => {
  const fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'pseo-migration-test-'))
  const fixturePath = path.join(fixtureDirectory, 'd1.sql')
  await writeFile(fixturePath, sourceSql({ validForeignKey: true }), { mode: 0o600 })
  const source = await openMigrationSource({ kind: 'd1-sql', sourcePath: fixturePath })
  try {
    const tables = inspectSource(source.database)
    assert.equal(tables.find((table) => table.name === 'users')?.rowCount, 1)
    assert.equal(tables.find((table) => table.name === 'users_roles')?.rowCount, 1)
    const user = source.database.prepare('SELECT email, hash FROM users').get()
    assert.deepEqual({ ...user }, {
      email: 'admin@example.invalid',
      hash: 'not-a-real-auth-hash',
    })
    assert.match(source.sha256, /^[a-f0-9]{64}$/u)
  } finally {
    await source.close()
    await rm(fixtureDirectory, { recursive: true, force: true })
  }
})

test('D1 SQL restore rejects broken foreign-key data before a target connection', async () => {
  const fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'pseo-migration-test-'))
  const fixturePath = path.join(fixtureDirectory, 'broken.sql')
  await writeFile(fixturePath, sourceSql({ validForeignKey: false }), { mode: 0o600 })
  try {
    await assert.rejects(
      openMigrationSource({ kind: 'd1-sql', sourcePath: fixturePath }),
      (error: unknown) => error instanceof MigrationError
        && error.code === 'SOURCE_FOREIGN_KEY_FAILED',
    )
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true })
  }
})

test('schema compatibility permits nullable Postgres additions but fails closed on missing required fields', () => {
  const source: SourceTable[] = [{
    name: 'users',
    columns: [{ name: 'id', declaredType: 'integer', notNull: true, primaryKeyOrder: 1 }],
    primaryKey: ['id'],
    rowCount: 0,
  }]
  const compatible = {
    tables: new Map([['users', {
      name: 'users',
      columns: [integerColumn('id'), textColumn('new_optional', true)],
      primaryKey: ['id'],
    }]]),
    foreignKeys: [],
  }
  assert.deepEqual(assertCompatibleSchemas(source, compatible), {
    copyTables: ['users'],
    targetOnlyTables: [],
  })

  const incompatible = {
    tables: new Map([['users', {
      name: 'users',
      columns: [integerColumn('id'), textColumn('required_without_default', false)],
      primaryKey: ['id'],
    }]]),
    foreignKeys: [],
  }
  assert.throws(
    () => assertCompatibleSchemas(source, incompatible),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'SOURCE_UNMAPPED_COLUMN_UNSAFE',
  )

  const implicitDefault = {
    tables: new Map([['users', {
      name: 'users',
      columns: [integerColumn('id'), {
        ...textColumn('implicit_state', true),
        defaultExpression: "'published'",
      }],
      primaryKey: ['id'],
    }]]),
    foreignKeys: [],
  }
  assert.throws(
    () => assertCompatibleSchemas(source, implicitDefault),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'SOURCE_UNMAPPED_COLUMN_UNSAFE',
  )
})

test('checked-in D1 baseline maps to the current Postgres baseline without dropping columns', () => {
  const d1 = JSON.parse(readFileSync(
    new URL('../src/migrations/20260902_225800_initial_cloudflare_d1.json', import.meta.url),
    'utf8',
  )) as DrizzleSnapshot
  const postgres = JSON.parse(readFileSync(
    new URL('../src/migrations-postgres/20260903_060851_initial_postgres_baseline.json', import.meta.url),
    'utf8',
  )) as DrizzleSnapshot
  const sourceTables = Object.entries(d1.tables).map(([name, table]): SourceTable => ({
    name,
    columns: Object.entries(table.columns).map(([columnName, column]) => ({
      name: columnName,
      declaredType: column.type,
      notNull: column.notNull === true,
      primaryKeyOrder: column.primaryKey === true ? 1 : 0,
    })),
    primaryKey: Object.entries(table.columns)
      .filter(([, column]) => column.primaryKey === true)
      .map(([columnName]) => columnName),
    rowCount: 0,
  }))
  const targetTables = new Map(Object.entries(postgres.tables).map(([qualifiedName, table]) => {
    const name = qualifiedName.replace(/^public\./u, '')
    return [name, {
      name,
      columns: Object.entries(table.columns).map(([columnName, column]) => ({
        name: columnName,
        dataType: drizzleTypeToInformationSchema(column.type),
        udtName: column.type,
        nullable: column.notNull !== true,
        defaultExpression: column.default === undefined ? null : String(column.default),
        identity: false,
      })),
      primaryKey: Object.entries(table.columns)
        .filter(([, column]) => column.primaryKey === true)
        .map(([columnName]) => columnName),
    }]
  }))

  const compatibility = assertCompatibleSchemas(sourceTables, {
    tables: targetTables,
    foreignKeys: [],
  })
  assert.equal(compatibility.copyTables.length, 51)
  assert.deepEqual(compatibility.targetOnlyTables, [
    'content_approvals',
    'content_approvals_files',
    'content_withdrawals',
    'publication_decision_sequences',
  ])
})

test('foreign-key topology inserts parents first and rejects cycles', () => {
  assert.deepEqual(
    topologicallySortTables(
      ['children', 'parents', 'grandchildren'],
      [
        { child: 'children', parent: 'parents' },
        { child: 'grandchildren', parent: 'children' },
      ],
    ),
    ['parents', 'children', 'grandchildren'],
  )
  assert.throws(
    () => topologicallySortTables(
      ['left', 'right'],
      [
        { child: 'left', parent: 'right' },
        { child: 'right', parent: 'left' },
      ],
    ),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'TARGET_FOREIGN_KEY_CYCLE',
  )
})

test('Postgres 17 catalog query never uses reserved CONSTRAINT as an alias', async () => {
  const queries: string[] = []
  const client: PostgresClientLike = {
    async query<Row extends QueryResultRow = QueryResultRow>(text: string) {
      queries.push(text)
      if (text.includes('information_schema.columns')) {
        return {
          rows: [{
            tableName: 'payload_migrations',
            columnName: 'id',
            dataType: 'integer',
            udtName: 'int4',
            isNullable: 'NO',
            defaultExpression: null,
            isIdentity: 'NO',
          }] as unknown as Row[],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    },
  }
  await inspectTarget(client)
  const foreignKeyQuery = queries.find((query) => query.includes('FROM pg_constraint'))
  assert.ok(foreignKeyQuery)
  assert.match(foreignKeyQuery, /FROM pg_constraint AS fk_constraint/u)
  assert.match(foreignKeyQuery, /fk_constraint\.contype = 'f'/u)
  assert.doesNotMatch(foreignKeyQuery, /AS constraint\b/u)
})

test('parity hashing normalizes SQLite booleans, timestamps, numeric values, and JSONB', () => {
  const columns: TargetColumn[] = [
    { ...integerColumn('id') },
    { name: 'enabled', dataType: 'boolean', udtName: 'bool', nullable: false, defaultExpression: null, identity: false },
    { name: 'observed_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', nullable: true, defaultExpression: null, identity: false },
    { name: 'score', dataType: 'numeric', udtName: 'numeric', nullable: true, defaultExpression: null, identity: false },
    { name: 'payload', dataType: 'jsonb', udtName: 'jsonb', nullable: true, defaultExpression: null, identity: false },
  ]
  const sqliteRows = [{
    id: 1n,
    enabled: 1n,
    observed_at: '2026-09-03T01:02:03.000Z',
    score: 1.5,
    payload: '{"z":2,"a":1}',
  }]
  const postgresRows = [{
    id: 1,
    enabled: true,
    observed_at: new Date('2026-09-03T01:02:03.000Z'),
    score: '1.500',
    payload: { a: 1, z: 2 },
  }]
  assert.equal(hashRows(sqliteRows, columns), hashRows(postgresRows, columns))
  assert.equal(normalizeForTarget(0n, columns[1]!), false)
})

test('dry-run executes the full copy/parity path and rolls all rows back', async () => {
  const database = createMinimalSourceDatabase()
  const sourceTables = inspectSource(database)
  const client = new MemoryPostgresClient(sourceTables)
  const report = await runAgainstPostgres(
    client,
    migrationOptions('dry-run'),
    { database, kind: 'sqlite', sha256: 'a'.repeat(64) },
    sourceTables,
    1,
  )
  assert.equal(report.outcome, 'rolled_back')
  assert.equal(report.keyEntityCounts.users, 1)
  assert.equal(client.rowCount('users'), 0)
  assert.equal(client.commands.at(-1), 'ROLLBACK')
  database.close()
})

test('apply commits only to an empty target and preserves complete value parity', async () => {
  const database = createMinimalSourceDatabase()
  const sourceTables = inspectSource(database)
  const client = new MemoryPostgresClient(sourceTables)
  const report = await runAgainstPostgres(
    client,
    migrationOptions('apply'),
    { database, kind: 'sqlite', sha256: 'b'.repeat(64) },
    sourceTables,
    1,
  )
  assert.equal(report.outcome, 'committed')
  assert.equal(report.copiedRows, 6)
  assert.equal(client.rowCount('users'), 1)
  assert.equal(client.commands.at(-1), 'COMMIT')

  const secondClient = new MemoryPostgresClient(sourceTables, { users: [{ id: 9 }] })
  await assert.rejects(
    runAgainstPostgres(
      secondClient,
      migrationOptions('apply'),
      { database, kind: 'sqlite', sha256: 'c'.repeat(64) },
      sourceTables,
      1,
    ),
    (error: unknown) => error instanceof MigrationError && error.code === 'TARGET_NOT_EMPTY',
  )
  assert.equal(secondClient.commands.at(-1), 'ROLLBACK')
  database.close()
})

test('Postgres failures expose only SQLSTATE and safe identifiers, never driver detail or row values', async () => {
  const database = createMinimalSourceDatabase()
  const sourceTables = inspectSource(database)
  const delegate = new MemoryPostgresClient(sourceTables)
  const client: PostgresClientLike = {
    async query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      if (text.startsWith('INSERT INTO "public"."users"')) {
        throw Object.assign(new Error('invalid value admin@example.invalid'), {
          code: '22P02',
          schema: 'public',
          table: 'users',
          column: 'id',
          constraint: 'users_pkey',
          detail: 'row contains not-a-real-auth-hash',
        })
      }
      return delegate.query<Row>(text, values)
    },
  }
  await assert.rejects(
    runAgainstPostgres(
      client,
      migrationOptions('dry-run'),
      { database, kind: 'sqlite', sha256: 'd'.repeat(64) },
      sourceTables,
      1,
    ),
    (error: unknown) => error instanceof MigrationError
      && error.code === 'POSTGRES_22P02'
      && error.message.includes('phase=copy-table')
      && error.message.includes('table=users')
      && error.message.includes('column=id')
      && error.message.includes('constraint=users_pkey')
      && !error.message.includes('admin@example.invalid')
      && !error.message.includes('not-a-real-auth-hash'),
  )
  assert.equal(delegate.commands.at(-1), 'ROLLBACK')
  database.close()
})

function sourceSql(input: { readonly validForeignKey: boolean }): string {
  const roleParent = input.validForeignKey ? 1 : 999
  return [
    'CREATE TABLE users_roles (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES users(id), value TEXT);',
    `INSERT INTO users_roles (id, parent_id, value) VALUES (1, ${roleParent}, 'admin');`,
    'CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL, hash TEXT);',
    "INSERT INTO users (id, email, hash) VALUES (1, 'admin@example.invalid', 'not-a-real-auth-hash');",
    'CREATE TABLE prompt_artifacts (id INTEGER PRIMARY KEY);',
    'CREATE TABLE locale_variants (id INTEGER PRIMARY KEY);',
    'CREATE TABLE taxonomies (id INTEGER PRIMARY KEY);',
    'CREATE TABLE source_evidence (id INTEGER PRIMARY KEY);',
    'CREATE TABLE publication_requests (id INTEGER PRIMARY KEY);',
    'CREATE TABLE payload_migrations (id INTEGER PRIMARY KEY, name TEXT);',
    "INSERT INTO payload_migrations (id, name) VALUES (1, 'd1-baseline');",
  ].join('\n')
}

interface DrizzleSnapshotColumn {
  readonly type: string
  readonly notNull?: boolean
  readonly primaryKey?: boolean
  readonly default?: unknown
}

interface DrizzleSnapshot {
  readonly tables: Readonly<Record<string, {
    readonly columns: Readonly<Record<string, DrizzleSnapshotColumn>>
  }>>
}

function drizzleTypeToInformationSchema(type: string): string {
  if (type === 'boolean') return 'boolean'
  if (type === 'jsonb') return 'jsonb'
  if (type.includes('timestamp')) return 'timestamp with time zone'
  if (type === 'serial' || type === 'integer') return 'integer'
  if (type === 'numeric') return 'numeric'
  return 'character varying'
}

function createMinimalSourceDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:')
  for (const table of requiredSourceTables) {
    database.exec(`CREATE TABLE "${table}" (id INTEGER PRIMARY KEY)`)
    database.exec(`INSERT INTO "${table}" (id) VALUES (1)`)
  }
  database.exec('CREATE TABLE payload_migrations (id INTEGER PRIMARY KEY, name TEXT)')
  database.exec("INSERT INTO payload_migrations (id, name) VALUES (1, 'd1-baseline')")
  return database
}

function integerColumn(name: string): TargetColumn {
  return {
    name,
    dataType: 'integer',
    udtName: 'int4',
    nullable: false,
    defaultExpression: null,
    identity: false,
  }
}

function textColumn(name: string, nullable: boolean): TargetColumn {
  return {
    name,
    dataType: 'character varying',
    udtName: 'varchar',
    nullable,
    defaultExpression: null,
    identity: false,
  }
}

function migrationOptions(mode: 'dry-run' | 'apply'): MigrationCliOptions {
  return {
    mode,
    sourceKind: 'sqlite',
    sourcePath: '/unused-in-injected-test.sqlite',
    databaseEnvironmentName: 'DATABASE_URI',
    batchSize: 10,
    expectedCounts: new Map(),
    confirmEmptyTarget: mode === 'apply',
  }
}

class MemoryPostgresClient implements PostgresClientLike {
  readonly commands: string[] = []
  readonly #columns: readonly QueryResultRow[]
  readonly #primaryKeys: readonly QueryResultRow[]
  #tables = new Map<string, Readonly<Record<string, unknown>>[]>()
  #transactionSnapshot: Map<string, Readonly<Record<string, unknown>>[]> | undefined

  constructor(
    sourceTables: readonly SourceTable[],
    initial: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>> = {},
  ) {
    const targetTables = [...sourceTables.map((table) => table.name)]
    for (const table of targetTables) this.#tables.set(table, [...(initial[table] ?? [])])
    this.#tables.set('payload_migrations', [{
      id: 1,
      name: '20260903_060851_initial_postgres_baseline',
    }])
    this.#columns = targetTables.flatMap((tableName) => {
      const source = sourceTables.find((table) => table.name === tableName)!
      return source.columns.map((column) => ({
        tableName,
        columnName: column.name,
        dataType: column.name === 'id' ? 'integer' : 'character varying',
        udtName: column.name === 'id' ? 'int4' : 'varchar',
        isNullable: column.notNull ? 'NO' : 'YES',
        defaultExpression: null,
        isIdentity: 'NO',
      }))
    })
    this.#primaryKeys = targetTables.flatMap((tableName) => {
      const source = sourceTables.find((table) => table.name === tableName)!
      return source.primaryKey.map((columnName, index) => ({
        tableName,
        columnName,
        ordinalPosition: index + 1,
      }))
    })
  }

  rowCount(table: string): number {
    return this.#tables.get(table)?.length ?? 0
  }

  async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: Row[]; rowCount: number | null }> {
    const compact = text.replace(/\s+/gu, ' ').trim()
    const respond = (
      rows: readonly QueryResultRow[],
      rowCount: number | null = rows.length,
    ): { rows: Row[]; rowCount: number | null } => ({
      rows: rows as Row[],
      rowCount,
    })
    this.commands.push(compact)
    if (compact.startsWith('BEGIN ')) {
      this.#transactionSnapshot = cloneTables(this.#tables)
      return respond([])
    }
    if (compact === 'ROLLBACK') {
      if (this.#transactionSnapshot) this.#tables = cloneTables(this.#transactionSnapshot)
      this.#transactionSnapshot = undefined
      return respond([])
    }
    if (compact === 'COMMIT') {
      this.#transactionSnapshot = undefined
      return respond([])
    }
    if (compact.startsWith('SET LOCAL ') || compact.startsWith('LOCK TABLE ')) return respond([])
    if (compact.includes('pg_try_advisory_xact_lock')) return respond([{ locked: true }])
    if (compact.includes('FROM information_schema.columns')) return respond(this.#columns)
    if (compact.includes('FROM information_schema.table_constraints')) return respond(this.#primaryKeys)
    if (compact.includes('FROM pg_constraint')) return respond([])
    if (compact.includes('WHERE name = $1')) {
      const rows = this.#tables.get('payload_migrations') ?? []
      const count = rows.filter((row) => row.name === values[0]).length
      return respond([{ count: String(count) }])
    }
    if (compact.startsWith('SELECT COUNT(*)::text AS count FROM ')) {
      const table = postgresTableFrom(compact)
      return respond([{ count: String(this.rowCount(table)) }])
    }
    if (compact.startsWith('INSERT INTO ')) {
      const table = postgresTableFrom(compact)
      const match = compact.match(/^INSERT INTO "public"\."[a-z0-9_]+" \(([^)]+)\) VALUES /u)
      assert.ok(match)
      const columns = [...match[1]!.matchAll(/"([a-z0-9_]+)"/gu)].map((entry) => entry[1]!)
      const inserted: Readonly<Record<string, unknown>>[] = []
      for (let offset = 0; offset < values.length; offset += columns.length) {
        inserted.push(Object.fromEntries(columns.map((column, index) => [
          column,
          values[offset + index],
        ])))
      }
      this.#tables.set(table, [...(this.#tables.get(table) ?? []), ...inserted])
      return respond([], inserted.length)
    }
    if (compact.startsWith('SELECT ') && compact.includes(' ORDER BY ')) {
      const table = postgresTableFrom(compact)
      const selected = compact.slice('SELECT '.length, compact.indexOf(' FROM '))
      const columns = [...selected.matchAll(/"([a-z0-9_]+)"/gu)].map((entry) => entry[1]!)
      const rows = (this.#tables.get(table) ?? []).map((row) => Object.fromEntries(
        columns.map((column) => [column, row[column]]),
      ))
      return respond(rows)
    }
    throw new Error(`Unhandled test query shape: ${compact.slice(0, 80)}`)
  }
}

function postgresTableFrom(query: string): string {
  const match = query.match(/(?:FROM|INTO) "public"\."([a-z0-9_]+)"/u)
  assert.ok(match)
  return match[1]!
}

function cloneTables(
  tables: ReadonlyMap<string, readonly Readonly<Record<string, unknown>>[]>,
): Map<string, Readonly<Record<string, unknown>>[]> {
  return new Map([...tables].map(([table, rows]) => [
    table,
    rows.map((row) => ({ ...row })),
  ]))
}
