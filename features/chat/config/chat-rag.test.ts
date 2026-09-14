import { afterEach, describe, expect, it, vi } from 'vitest'

describe('CHAT_RAG search limits', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('환경변수로 semantic 후보 수와 유사도 하한을 조정한다', async () => {
    vi.stubEnv('BLOG_CHAT_RAG_MAXIMUM_SEMANTIC_CANDIDATES', '12')
    vi.stubEnv('BLOG_CHAT_RAG_MINIMUM_SIMILARITY_SCORE', '0.42')
    vi.resetModules()

    const { CHAT_RAG } = await import('@/features/chat/config/chat-rag')

    expect(CHAT_RAG.SEARCH.MAXIMUM_SEMANTIC_CANDIDATES).toBe(12)
    expect(CHAT_RAG.SEARCH.MINIMUM_SIMILARITY_SCORE).toBe(0.42)
  })

  it('숫자가 아닌 값은 기본값으로 되돌린다', async () => {
    vi.stubEnv('BLOG_CHAT_RAG_MAXIMUM_SEMANTIC_CANDIDATES', 'many')
    vi.stubEnv('BLOG_CHAT_RAG_MINIMUM_SIMILARITY_SCORE', 'high')
    vi.resetModules()

    const { CHAT_RAG } = await import('@/features/chat/config/chat-rag')

    expect(CHAT_RAG.SEARCH.MAXIMUM_SEMANTIC_CANDIDATES).toBe(8)
    expect(CHAT_RAG.SEARCH.MINIMUM_SIMILARITY_SCORE).toBe(0.15)
  })
})
