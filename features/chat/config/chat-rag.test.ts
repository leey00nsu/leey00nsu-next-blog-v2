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

  it('임베딩 토큰 한도를 바꾸면 색인 레시피 버전도 함께 바뀐다', async () => {
    vi.stubEnv('BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH', '128')
    vi.resetModules()

    const shorterSequenceLengthRag = await import(
      '@/features/chat/config/chat-rag'
    )

    vi.stubEnv('BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH', '256')
    vi.resetModules()

    const longerSequenceLengthRag = await import(
      '@/features/chat/config/chat-rag'
    )

    expect(
      shorterSequenceLengthRag.CHAT_RAG.EMBEDDING.MAXIMUM_SEQUENCE_LENGTH,
    ).toBe(128)
    expect(
      shorterSequenceLengthRag.CHAT_RAG.INDEX.CHUNKING_VERSION.endsWith(
        '-seq128',
      ),
    ).toBe(true)
    expect(longerSequenceLengthRag.CHAT_RAG.INDEX.CHUNKING_VERSION).not.toBe(
      shorterSequenceLengthRag.CHAT_RAG.INDEX.CHUNKING_VERSION,
    )
  })

  it('토큰 한도를 지정하지 않으면 서비스 기본값과 같은 256을 쓴다', async () => {
    vi.stubEnv('BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH', '')
    vi.resetModules()

    const { CHAT_RAG } = await import('@/features/chat/config/chat-rag')

    expect(CHAT_RAG.EMBEDDING.MAXIMUM_SEQUENCE_LENGTH).toBe(256)
    expect(CHAT_RAG.INDEX.CHUNKING_VERSION.endsWith('-seq256')).toBe(true)
  })
})
