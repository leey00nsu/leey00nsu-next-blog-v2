import { spawnSync } from 'node:child_process'
import '@/shared/lib/load-node-environment'

const ALLOW_MISSING_DATABASE_ARGUMENT = '--allow-missing-database'

function migrateDatabase(): void {
  const chatDatabaseUrl =
    process.env.BLOG_CHAT_RAG_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim()
  const engagementDatabaseUrl = process.env.ENGAGEMENT_DATABASE_URL?.trim()
  const databases = [
    { url: chatDatabaseUrl, ssl: process.env.BLOG_CHAT_RAG_DATABASE_SSL },
    { url: engagementDatabaseUrl, ssl: process.env.ENGAGEMENT_DATABASE_SSL },
  ].filter((database) => Boolean(database.url))

  if (databases.length === 0) {
    if (process.argv.includes(ALLOW_MISSING_DATABASE_ARGUMENT)) {
      console.info(
        'Skipped Prisma migrations because no database URL is configured.',
      )
      return
    }
    throw new Error('A database URL is required to run Prisma migrations.')
  }

  const migratedDatabases = new Set<string>()
  for (const database of databases) {
    const connectionUrl = new URL(database.url!)
    if (database.ssl === 'true' && !connectionUrl.searchParams.has('sslmode')) {
      connectionUrl.searchParams.set('sslmode', 'require')
      connectionUrl.searchParams.set('sslaccept', 'accept_invalid_certs')
    }
    const url = connectionUrl.toString()
    if (migratedDatabases.has(url)) continue

    const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env, PRISMA_DATABASE_URL: url },
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(
        'Prisma migrate deploy failed. See the Prisma output above.',
      )
    }
    migratedDatabases.add(url)
  }
}

try {
  migrateDatabase()
} catch (error) {
  console.error('Database migration failed.', error)
  process.exitCode = 1
}
