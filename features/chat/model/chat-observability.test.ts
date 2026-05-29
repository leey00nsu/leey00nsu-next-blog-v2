import { describe, expect, it, vi } from 'vitest'
import type { Pool, PoolClient } from 'pg'
import {
  initializeChatObservabilityDatabase,
  insertChatObservabilityEvent,
  selectChatObservabilityLogPage,
} from '@/features/chat/model/chat-observability'

describe('chat-observability', () => {
  it('observability 테이블을 생성한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    await initializeChatObservabilityDatabase(databaseClient)

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN IF NOT EXISTS answer TEXT'),
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
        answer: 'nivo chart 관련 글에서 사용 경험을 확인할 수 있습니다.',
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
        'nivo chart 관련 글에서 사용 경험을 확인할 수 있습니다.',
        '이윤수님이 블로그에서 nivo를 사용한 적이 있는지 확인해 주세요.',
        'nivo라는걸 쓴 적 있나요',
        expect.any(String),
      ]),
    )
  })

  it('observability 이벤트 목록을 최신순 페이지로 조회한다', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total_count: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '42',
            created_at: new Date('2026-05-29T03:00:00.000Z'),
            locale: 'ko',
            original_question: '블로그 챗봇은 어떤 로그를 남기나요?',
            answer: '질문과 답변, 검색 결과, citation, 처리 시간을 저장합니다.',
            resolved_question: '블로그 챗봇 로그 저장 항목을 알려주세요.',
            normalized_question: '블로그 챗봇 로그 저장 항목을 알려주세요',
            current_post_slug: 'building-ai-chat-for-my-blog',
            cache_kind: 'none',
            reranked: false,
            planner_reason: 'log inspection',
            planner_action: 'answer',
            planner_retrieval_mode: 'standard',
            planner_deterministic_action: 'none',
            preferred_source_categories_json: ['blog'],
            additional_keywords_json: ['로그'],
            lexical_matches_json: [
              {
                url: '/ko/blog/building-ai-chat-for-my-blog',
                title: '블로그 챗봇은 어떻게 RAG까지 가게 됐을까',
                sourceCategory: 'blog',
              },
            ],
            semantic_matches_json: [],
            final_matches_json: [],
            citations_json: [],
            grounded: true,
            refusal_reason: null,
            duration_milliseconds: 120,
          },
        ],
      })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    const result = await selectChatObservabilityLogPage({
      databaseClient,
      page: 2,
      pageSize: 10,
    })

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY created_at DESC'),
      [10, 10],
    )
    expect(result).toMatchObject({
      totalCount: 1,
      page: 2,
      pageSize: 10,
      sortDirection: 'created_at_desc',
      records: [
        {
          id: '42',
          createdAt: '2026-05-29T03:00:00.000Z',
          originalQuestion: '블로그 챗봇은 어떤 로그를 남기나요?',
          answer: '질문과 답변, 검색 결과, citation, 처리 시간을 저장합니다.',
          preferredSourceCategories: ['blog'],
          grounded: true,
          durationMilliseconds: 120,
        },
      ],
    })
  })

  it('observability 이벤트 목록을 오래된순으로 조회한다', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total_count: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    const result = await selectChatObservabilityLogPage({
      databaseClient,
      page: 1,
      pageSize: 20,
      sortDirection: 'created_at_asc',
    })

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY created_at ASC'),
      [20, 0],
    )
    expect(result.sortDirection).toBe('created_at_asc')
  })
})
