import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
  selectActiveChatRagIndexVersion,
} from '@/features/chat/model/chat-rag-database'
import { getChatCacheEvidenceVersion } from '@/features/chat/model/get-chat-cache-evidence-version'

vi.mock('@/features/chat/model/chat-rag-database', () => ({
  getChatRagDatabasePool: vi.fn(),
  isChatRagDatabaseConfigured: vi.fn(),
  selectActiveChatRagIndexVersion: vi.fn(),
}))

describe('getChatCacheEvidenceVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isChatRagDatabaseConfigured).mockReturnValue(true)
    vi.mocked(getChatRagDatabasePool).mockResolvedValue({} as never)
  })

  it('DB가 없으면 빌드 버전만 사용한다', async () => {
    vi.mocked(isChatRagDatabaseConfigured).mockReturnValue(false)

    await expect(getChatCacheEvidenceVersion()).resolves.toBe(
      BLOG_CHAT.EVIDENCE_VERSION,
    )
    expect(getChatRagDatabasePool).not.toHaveBeenCalled()
  })

  it('같은 빌드에서도 활성 색인을 교체하면 버전이 달라진다', async () => {
    vi.mocked(selectActiveChatRagIndexVersion)
      .mockResolvedValueOnce('index-a')
      .mockResolvedValueOnce('index-b')

    await expect(getChatCacheEvidenceVersion()).resolves.toBe(
      `${BLOG_CHAT.EVIDENCE_VERSION}:index-a`,
    )
    await expect(getChatCacheEvidenceVersion()).resolves.toBe(
      `${BLOG_CHAT.EVIDENCE_VERSION}:index-b`,
    )
  })

  it('아직 활성 색인이 없어도 이후 색인 활성화와 캐시 버전을 구분한다', async () => {
    vi.mocked(selectActiveChatRagIndexVersion).mockResolvedValue(null)

    await expect(getChatCacheEvidenceVersion()).resolves.toBe(
      `${BLOG_CHAT.EVIDENCE_VERSION}:unindexed`,
    )
  })

  it('DB 조회 오류가 나면 오래된 캐시를 재사용하지 않는다', async () => {
    vi.mocked(selectActiveChatRagIndexVersion).mockRejectedValue(
      new Error('database unavailable'),
    )
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await expect(getChatCacheEvidenceVersion()).resolves.toBeNull()
      expect(logError).toHaveBeenCalledOnce()
    } finally {
      logError.mockRestore()
    }
  })
})
