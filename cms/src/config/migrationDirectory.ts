import path from 'node:path'

import type { CmsEnvironment } from './env.ts'

const MIGRATION_DIRECTORY_BY_ADAPTER = {
  d1: 'migrations',
  postgres: 'migrations-postgres',
} as const satisfies Record<CmsEnvironment['databaseAdapter'], string>

/**
 * Keep dialect-specific Payload migrations physically separate. A migration
 * generated for D1 uses `db.run`, while PostgreSQL migrations use
 * `db.execute`; sharing a directory makes either adapter execute incompatible
 * SQL on a fresh database.
 */
export function cmsMigrationDirectory(
  sourceDirectory: string,
  adapter: CmsEnvironment['databaseAdapter'],
): string {
  return path.resolve(sourceDirectory, MIGRATION_DIRECTORY_BY_ADAPTER[adapter])
}
