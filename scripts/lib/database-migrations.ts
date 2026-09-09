import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const DATABASE_MIGRATIONS = {
  FILE_NAME_PATTERN: /^\d{4}_[a-z0-9_]+\.sql$/u,
  TABLE_NAME: 'database_schema_migrations',
  ADVISORY_LOCK: {
    APPLICATION: 'leey00nsu-next-blog-v2',
    PURPOSE: 'database-schema-migrations',
  },
} as const

// Both versions were deployed before 0001 was restored in ec4353b.
// Never extend this into a general checksum bypass.
const EVIDENCE_TIME_MIGRATION_REPAIR = {
  ID: '0001_add_chat_rag_evidence_time.sql',
  PREVIOUS_CHECKSUM:
    '36b88e2e03c2cb59566192710d452a648af4eba9f06c7263bf7c5db92436d2ab',
  CURRENT_CHECKSUM:
    '4b1c95896725556fa4707bbdeb0b2ee1fadb6887f80e6b3edf45e8979e607f1f',
} as const

interface DatabaseQueryResult {
  rows: Array<Record<string, unknown>>
}

export interface DatabaseMigrationClient {
  query(queryText: string, values?: unknown[]): Promise<DatabaseQueryResult>
}

export interface DatabaseMigration {
  id: string
  checksum: string
  statement: string
}

export interface DatabaseMigrationResult {
  appliedMigrationIds: string[]
  skippedMigrationIds: string[]
}

function calculateMigrationChecksum(migrationStatement: string): string {
  return createHash('sha256').update(migrationStatement).digest('hex')
}

function assertValidMigrationFileName(fileName: string): void {
  if (!DATABASE_MIGRATIONS.FILE_NAME_PATTERN.test(fileName)) {
    throw new Error(
      `Invalid database migration file name "${fileName}". Expected a name such as "0001_add_column.sql".`,
    )
  }
}

export async function loadDatabaseMigrations(
  migrationsDirectory: string,
): Promise<DatabaseMigration[]> {
  const directoryEntries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  })
  const migrationFileNames = directoryEntries
    .filter((directoryEntry) => {
      return directoryEntry.isFile() && directoryEntry.name.endsWith('.sql')
    })
    .map((directoryEntry) => {
      return directoryEntry.name
    })
    .sort((firstFileName, secondFileName) => {
      return firstFileName.localeCompare(secondFileName)
    })

  if (migrationFileNames.length === 0) {
    throw new Error(
      `No database migration files were found in "${migrationsDirectory}".`,
    )
  }

  return Promise.all(
    migrationFileNames.map(async (fileName) => {
      assertValidMigrationFileName(fileName)

      const migrationStatement = await readFile(
        path.join(migrationsDirectory, fileName),
        'utf8',
      )

      return {
        id: fileName,
        checksum: calculateMigrationChecksum(migrationStatement),
        statement: migrationStatement,
      }
    }),
  )
}

async function acquireDatabaseMigrationLock(
  databaseClient: DatabaseMigrationClient,
): Promise<void> {
  await databaseClient.query(
    'SELECT pg_advisory_lock(hashtext($1), hashtext($2))',
    [
      DATABASE_MIGRATIONS.ADVISORY_LOCK.APPLICATION,
      DATABASE_MIGRATIONS.ADVISORY_LOCK.PURPOSE,
    ],
  )
}

async function releaseDatabaseMigrationLock(
  databaseClient: DatabaseMigrationClient,
): Promise<void> {
  await databaseClient.query(
    'SELECT pg_advisory_unlock(hashtext($1), hashtext($2))',
    [
      DATABASE_MIGRATIONS.ADVISORY_LOCK.APPLICATION,
      DATABASE_MIGRATIONS.ADVISORY_LOCK.PURPOSE,
    ],
  )
}

async function createDatabaseMigrationsTable(
  databaseClient: DatabaseMigrationClient,
): Promise<void> {
  await databaseClient.query(`
    CREATE TABLE IF NOT EXISTS ${DATABASE_MIGRATIONS.TABLE_NAME} (
      migration_id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function selectAppliedMigrationChecksum(
  databaseClient: DatabaseMigrationClient,
  migrationId: string,
): Promise<string | null> {
  const migrationResult = await databaseClient.query(
    `
      SELECT checksum
      FROM ${DATABASE_MIGRATIONS.TABLE_NAME}
      WHERE migration_id = $1
    `,
    [migrationId],
  )
  const checksum = migrationResult.rows[0]?.checksum

  return typeof checksum === 'string' ? checksum : null
}

function assertMigrationChecksumMatches(
  migration: DatabaseMigration,
  appliedChecksum: string,
): void {
  if (migration.checksum !== appliedChecksum) {
    throw new Error(
      `Database migration "${migration.id}" was changed after it was applied. Create a new migration instead of editing an applied migration.`,
    )
  }
}

async function reconcileEvidenceTimeMigration(
  databaseClient: DatabaseMigrationClient,
  migration: DatabaseMigration,
  appliedChecksum: string,
): Promise<string> {
  if (
    migration.id !== EVIDENCE_TIME_MIGRATION_REPAIR.ID ||
    migration.checksum !== EVIDENCE_TIME_MIGRATION_REPAIR.CURRENT_CHECKSUM ||
    appliedChecksum !== EVIDENCE_TIME_MIGRATION_REPAIR.PREVIOUS_CHECKSUM
  ) {
    return appliedChecksum
  }

  await databaseClient.query('BEGIN')

  try {
    // Prevent schema changes between verification and the history update.
    await databaseClient.query(
      'LOCK TABLE public.chat_rag_chunks IN ACCESS SHARE MODE',
    )
    const verification = await databaseClient.query(`
      SELECT (
        to_regclass('chat_rag_chunks') = to_regclass('public.chat_rag_chunks')
        AND EXISTS (
          SELECT 1 FROM pg_attribute
          WHERE attrelid = 'public.chat_rag_chunks'::regclass
            AND attname = 'evidence_time_kind'
            AND atttypid = 'text'::regtype AND NOT attisdropped
        )
        AND EXISTS (
          SELECT 1 FROM pg_attribute
          WHERE attrelid = 'public.chat_rag_chunks'::regclass
            AND attname = 'evidence_time_value'
            AND atttypid = 'timestamptz'::regtype AND NOT attisdropped
        )
      ) AS compatible
    `)

    if (verification.rows[0]?.compatible !== true) {
      throw new Error(
        'Cannot reconcile evidence time migration: database schema does not match the verified public schema.',
      )
    }

    const updateResult = await databaseClient.query(
      `UPDATE ${DATABASE_MIGRATIONS.TABLE_NAME}
       SET checksum = $2
       WHERE migration_id = $1 AND checksum = $3
       RETURNING checksum`,
      [migration.id, migration.checksum, appliedChecksum],
    )

    if (updateResult.rows[0]?.checksum !== migration.checksum) {
      throw new Error(
        'Cannot reconcile evidence time migration: migration history changed.',
      )
    }

    await databaseClient.query('COMMIT')
    console.info(`Reconciled verified legacy checksum for "${migration.id}".`)
    return migration.checksum
  } catch (error) {
    await databaseClient.query('ROLLBACK')
    throw error
  }
}

async function applyDatabaseMigration(
  databaseClient: DatabaseMigrationClient,
  migration: DatabaseMigration,
): Promise<void> {
  await databaseClient.query('BEGIN')

  try {
    await databaseClient.query(migration.statement)
    await databaseClient.query(
      `
        INSERT INTO ${DATABASE_MIGRATIONS.TABLE_NAME} (
          migration_id,
          checksum
        ) VALUES ($1, $2)
      `,
      [migration.id, migration.checksum],
    )
    await databaseClient.query('COMMIT')
  } catch (error) {
    await databaseClient.query('ROLLBACK')
    throw error
  }
}

export async function runDatabaseMigrations(params: {
  databaseClient: DatabaseMigrationClient
  migrations: DatabaseMigration[]
}): Promise<DatabaseMigrationResult> {
  const appliedMigrationIds: string[] = []
  const skippedMigrationIds: string[] = []

  await acquireDatabaseMigrationLock(params.databaseClient)

  try {
    await createDatabaseMigrationsTable(params.databaseClient)

    for (const migration of params.migrations) {
      const appliedChecksum = await selectAppliedMigrationChecksum(
        params.databaseClient,
        migration.id,
      )

      if (appliedChecksum) {
        const verifiedChecksum = await reconcileEvidenceTimeMigration(
          params.databaseClient,
          migration,
          appliedChecksum,
        )
        assertMigrationChecksumMatches(migration, verifiedChecksum)
        skippedMigrationIds.push(migration.id)
        continue
      }

      await applyDatabaseMigration(params.databaseClient, migration)
      appliedMigrationIds.push(migration.id)
    }
  } finally {
    await releaseDatabaseMigrationLock(params.databaseClient)
  }

  return {
    appliedMigrationIds,
    skippedMigrationIds,
  }
}
