import { describe, expect, it, vi } from 'vitest'
import {
  type DatabaseMigration,
  type DatabaseMigrationClient,
  runDatabaseMigrations,
} from '@/scripts/lib/database-migrations'

const DATABASE_MIGRATION_TEST = {
  ID: '0001_add_example_column.sql',
  CHECKSUM: 'example-checksum',
  CHANGED_CHECKSUM: 'changed-checksum',
  STATEMENT: 'ALTER TABLE example ADD COLUMN value TEXT',
} as const

function createMigration(
  checksum: string = DATABASE_MIGRATION_TEST.CHECKSUM,
): DatabaseMigration {
  return {
    id: DATABASE_MIGRATION_TEST.ID,
    checksum,
    statement: DATABASE_MIGRATION_TEST.STATEMENT,
  }
}

function createStatefulDatabaseClient(compatible = true) {
  const appliedChecksums = new Map<string, string>()
  const queryTexts: string[] = []
  const databaseClient: DatabaseMigrationClient = {
    query: vi.fn(async (queryText: string, values: unknown[] = []) => {
      queryTexts.push(queryText)

      if (queryText.includes('SELECT checksum')) {
        const checksum = appliedChecksums.get(String(values[0]))

        return {
          rows: checksum ? [{ checksum }] : [],
        }
      }

      if (queryText.includes('AS compatible')) {
        return { rows: [{ compatible }] }
      }

      if (queryText.includes('UPDATE database_schema_migrations')) {
        appliedChecksums.set(String(values[0]), String(values[1]))
        return { rows: [{ checksum: values[1] }] }
      }

      if (queryText.includes('INSERT INTO database_schema_migrations')) {
        appliedChecksums.set(String(values[0]), String(values[1]))
      }

      return { rows: [] }
    }),
  }

  return {
    appliedChecksums,
    databaseClient,
    queryTexts,
  }
}

describe('runDatabaseMigrations', () => {
  it('여러 번 실행해도 적용된 마이그레이션은 다시 실행하지 않는다', async () => {
    const { databaseClient, queryTexts } = createStatefulDatabaseClient()
    const migration = createMigration()

    const firstResult = await runDatabaseMigrations({
      databaseClient,
      migrations: [migration],
    })
    const secondResult = await runDatabaseMigrations({
      databaseClient,
      migrations: [migration],
    })

    expect(firstResult).toEqual({
      appliedMigrationIds: [DATABASE_MIGRATION_TEST.ID],
      skippedMigrationIds: [],
    })
    expect(secondResult).toEqual({
      appliedMigrationIds: [],
      skippedMigrationIds: [DATABASE_MIGRATION_TEST.ID],
    })
    expect(
      queryTexts.filter((queryText) => {
        return queryText === DATABASE_MIGRATION_TEST.STATEMENT
      }),
    ).toHaveLength(1)
  })

  it('적용된 마이그레이션 파일의 체크섬이 바뀌면 중단한다', async () => {
    const { appliedChecksums, databaseClient, queryTexts } =
      createStatefulDatabaseClient()
    appliedChecksums.set(
      DATABASE_MIGRATION_TEST.ID,
      DATABASE_MIGRATION_TEST.CHECKSUM,
    )

    await expect(
      runDatabaseMigrations({
        databaseClient,
        migrations: [createMigration(DATABASE_MIGRATION_TEST.CHANGED_CHECKSUM)],
      }),
    ).rejects.toThrow('was changed after it was applied')
    expect(queryTexts).not.toContain('BEGIN')
    expect(queryTexts.at(-1)).toContain('pg_advisory_unlock')
  })

  it('마이그레이션 실행이 실패하면 롤백하고 잠금을 해제한다', async () => {
    const queryTexts: string[] = []
    const databaseClient: DatabaseMigrationClient = {
      query: vi.fn(async (queryText: string) => {
        queryTexts.push(queryText)

        if (queryText === DATABASE_MIGRATION_TEST.STATEMENT) {
          throw new Error('migration statement failed')
        }

        return { rows: [] }
      }),
    }

    await expect(
      runDatabaseMigrations({
        databaseClient,
        migrations: [createMigration()],
      }),
    ).rejects.toThrow('migration statement failed')
    expect(queryTexts).toContain('ROLLBACK')
    expect(queryTexts.at(-1)).toContain('pg_advisory_unlock')
  })
})

const LEGACY_EVIDENCE_MIGRATION = {
  id: '0001_add_chat_rag_evidence_time.sql',
  checksum: '4b1c95896725556fa4707bbdeb0b2ee1fadb6887f80e6b3edf45e8979e607f1f',
  statement: 'DO NOT REPLAY LEGACY SQL',
}
const LEGACY_EVIDENCE_CHECKSUM =
  '36b88e2e03c2cb59566192710d452a648af4eba9f06c7263bf7c5db92436d2ab'

describe('legacy evidence time reconciliation', () => {
  it('검증된 이전 이력만 한 번 보정하고 후속 마이그레이션을 실행한다', async () => {
    const { appliedChecksums, databaseClient, queryTexts } =
      createStatefulDatabaseClient()
    appliedChecksums.set(LEGACY_EVIDENCE_MIGRATION.id, LEGACY_EVIDENCE_CHECKSUM)
    const migrations = [LEGACY_EVIDENCE_MIGRATION, createMigration()]
    const result = await runDatabaseMigrations({ databaseClient, migrations })
    await runDatabaseMigrations({ databaseClient, migrations })
    expect(appliedChecksums.get(LEGACY_EVIDENCE_MIGRATION.id)).toBe(
      LEGACY_EVIDENCE_MIGRATION.checksum,
    )
    expect(result.appliedMigrationIds).toEqual([DATABASE_MIGRATION_TEST.ID])
    expect(queryTexts).not.toContain(LEGACY_EVIDENCE_MIGRATION.statement)
    expect(
      queryTexts.filter((query) =>
        query.includes('UPDATE database_schema_migrations'),
      ),
    ).toHaveLength(1)
  })

  it('컬럼 타입 또는 스키마가 다르면 보정하지 않고 롤백한다', async () => {
    const { appliedChecksums, databaseClient, queryTexts } =
      createStatefulDatabaseClient(false)
    appliedChecksums.set(LEGACY_EVIDENCE_MIGRATION.id, LEGACY_EVIDENCE_CHECKSUM)
    await expect(
      runDatabaseMigrations({
        databaseClient,
        migrations: [LEGACY_EVIDENCE_MIGRATION],
      }),
    ).rejects.toThrow('database schema does not match')
    expect(appliedChecksums.get(LEGACY_EVIDENCE_MIGRATION.id)).toBe(
      LEGACY_EVIDENCE_CHECKSUM,
    )
    expect(queryTexts).toContain('ROLLBACK')
    expect(queryTexts.at(-1)).toContain('pg_advisory_unlock')
  })

  it.each([
    { stored: 'unknown-checksum', current: LEGACY_EVIDENCE_MIGRATION.checksum },
    { stored: LEGACY_EVIDENCE_CHECKSUM, current: 'newly-edited-checksum' },
  ])(
    '알 수 없는 체크섬이나 새 파일 변경은 거부한다: $stored / $current',
    async ({ stored, current }) => {
      const { appliedChecksums, databaseClient, queryTexts } =
        createStatefulDatabaseClient()
      appliedChecksums.set(LEGACY_EVIDENCE_MIGRATION.id, stored)
      await expect(
        runDatabaseMigrations({
          databaseClient,
          migrations: [{ ...LEGACY_EVIDENCE_MIGRATION, checksum: current }],
        }),
      ).rejects.toThrow('was changed after it was applied')
      expect(queryTexts).not.toContain('BEGIN')
    },
  )
})
