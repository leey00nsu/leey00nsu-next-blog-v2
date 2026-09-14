import { describe, expect, it, vi } from 'vitest'
import { validateAndActivateChatRagIndex } from '@/features/chat/model/validate-and-activate-chat-rag-index'

function buildDatabase() {
  const query = vi.fn(async () => ({ rows: [{ id: 'candidate' }] }))
  const release = vi.fn()
  const connect = vi.fn(async () => ({ query, release }))
  return { query, release, connect }
}

describe('validateAndActivateChatRagIndex', () => {
  it.each(['failed', 'error'] as const)(
    '검증 %s 시 활성 인덱스를 변경하지 않는다',
    async (failure) => {
      const database = buildDatabase()
      await expect(
        validateAndActivateChatRagIndex({
          databasePool: database as never,
          indexVersion: 'candidate',
          embeddingDimension: 384,
          validateIndex: async () => {
            if (failure === 'error') throw new Error('endpoint unavailable')
            return false
          },
        }),
      ).rejects.toThrow()
      expect(database.connect).not.toHaveBeenCalled()
      expect(database.query).toHaveBeenCalledOnce()
    },
  )

  it('후보 인덱스를 검사한 뒤에만 활성화하고 직전 인덱스를 보존한다', async () => {
    const database = buildDatabase()
    const validateIndex = vi.fn(async (indexVersion: string) => {
      expect(indexVersion).toBe('candidate')
      expect(database.query).toHaveBeenCalledOnce()
      expect(database.connect).not.toHaveBeenCalled()
      return true
    })
    await validateAndActivateChatRagIndex({
      databasePool: database as never,
      indexVersion: 'candidate',
      embeddingDimension: 384,
      validateIndex,
    })
    expect(validateIndex).toHaveBeenCalledOnce()
    expect(database.release).toHaveBeenCalledOnce()
    const statements = database.query.mock.calls.map((call) =>
      String((call as unknown[])[0]),
    )
    expect(statements.at(-1)).toBe('COMMIT')
    expect(
      statements.find((statement) => statement.includes('DELETE FROM')),
    ).toContain('AND id NOT IN')
  })
})
