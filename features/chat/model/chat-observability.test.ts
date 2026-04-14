import { describe, expect, it, vi } from 'vitest'
import type { Pool, PoolClient } from 'pg'
import {
  initializeChatObservabilityDatabase,
  insertChatObservabilityEvent,
} from '@/features/chat/model/chat-observability'

describe('chat-observability', () => {
  it('observability 테이블을 생성한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    await initializeChatObservabilityDatabase(databaseClient)

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS chat_observability_events'),
    )
  })

  it('observability 이벤트를 JSONB payload와 함께 저장한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    await insertChatObservabilityEvent({
      databaseClient,
      event: {
        locale: 'ko',
        originalQuestion: 'nivo라는걸 쓴 적 있나요?',
        resolvedQuestion: '이윤수님이 블로그에서 nivo를 사용한 적이 있는지 확인해 주세요.',
        normalizedQuestion: 'nivo라는걸 쓴 적 있나요',
        currentPostSlug: 'building-ai-chat-for-my-blog',
        cacheKind: 'semantic',
        reranked: true,
        plannerReason: 'technology experience lookup',
        plannerAction: 'answer',
        plannerRetrievalMode: 'standard',
        plannerDeterministicAction: 'none',
        preferredSourceCategories: ['blog'],
        additionalKeywords: ['nivo'],
        lexicalMatches: [
          {
            url: '/ko/blog/nivo-chart',
            title: 'nivo chart로 데이터 시각화하기',
            sourceCategory: 'blog',
          },
        ],
        semanticMatches: [],
        finalMatches: [
          {
            url: '/ko/blog/nivo-chart',
            title: 'nivo chart로 데이터 시각화하기',
            sourceCategory: 'blog',
          },
        ],
        citations: [
          {
            url: '/ko/blog/nivo-chart',
            title: 'nivo chart로 데이터 시각화하기',
            sourceCategory: 'blog',
          },
        ],
        grounded: true,
        refusalReason: null,
        durationMilliseconds: 148,
      },
    })

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO chat_observability_events'),
      expect.arrayContaining([
        'ko',
        'nivo라는걸 쓴 적 있나요?',
        '이윤수님이 블로그에서 nivo를 사용한 적이 있는지 확인해 주세요.',
        'nivo라는걸 쓴 적 있나요',
        expect.any(String),
      ]),
    )
  })
})
