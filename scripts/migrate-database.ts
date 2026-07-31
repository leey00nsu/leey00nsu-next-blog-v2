import path from 'node:path'
import { Pool } from 'pg'
import '@/shared/lib/load-node-environment'
import {
  loadDatabaseMigrations,
  runDatabaseMigrations,
} from '@/scripts/lib/database-migrations'

const DATABASE_MIGRATION = {
  DIRECTORY: path.resolve(process.cwd(), 'database/migrations'),
  SSL_ENABLED_VALUE: 'true',
  ALLOW_MISSING_DATABASE_ARGUMENT: '--allow-missing-database',
  MISSING_DATABASE_MESSAGE:
    'Skipped database migrations because no database URL is configured.',
} as const

function getDatabaseConnectionString(): string | null {
  const connectionString =
    process.env.BLOG_CHAT_RAG_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim()

  if (!connectionString) {
    if (
      process.argv.includes(DATABASE_MIGRATION.ALLOW_MISSING_DATABASE_ARGUMENT)
    ) {
      return null
    }

    throw new Error(
      'BLOG_CHAT_RAG_DATABASE_URL or DATABASE_URL is required to run database migrations.',
    )
  }

  return connectionString
}

async function migrateDatabase(): Promise<void> {
  const connectionString = getDatabaseConnectionString()

  if (!connectionString) {
    console.warn(DATABASE_MIGRATION.MISSING_DATABASE_MESSAGE)
    return
  }

  const databasePool = new Pool({
    connectionString,
    ssl:
      process.env.BLOG_CHAT_RAG_DATABASE_SSL ===
      DATABASE_MIGRATION.SSL_ENABLED_VALUE
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  })

  try {
    const migrations = await loadDatabaseMigrations(
      DATABASE_MIGRATION.DIRECTORY,
    )
    const databaseClient = await databasePool.connect()

    try {
      const result = await runDatabaseMigrations({
        databaseClient,
        migrations,
      })

      console.info(
        `Database migrations complete: ${result.appliedMigrationIds.length} applied, ${result.skippedMigrationIds.length} skipped.`,
      )
    } finally {
      databaseClient.release()
    }
  } finally {
    await databasePool.end()
  }
}

function handleDatabaseMigrationError(error: unknown): void {
  console.error('Database migration failed.', error)
  process.exitCode = 1
}

// tsx transforms package scripts to CommonJS because package.json has no ESM type.
// eslint-disable-next-line unicorn/prefer-top-level-await
void migrateDatabase().catch(handleDatabaseMigrationError)
