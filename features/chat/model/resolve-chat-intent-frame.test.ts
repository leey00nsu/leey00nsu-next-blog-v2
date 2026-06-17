import { describe, expect, it } from 'vitest'
import type { ChatIntentFrame } from './chat-intent-frame'
import { buildChatQuestionPlanFromIntentFrame } from './resolve-chat-intent-frame'

const BASE_INTENT_FRAME: ChatIntentFrame = {
  standaloneQuestion: '블로그에 관해 알려주세요.',
  domain: 'general',
  operation: 'answer',
  target: {
    kind: 'none',
    sourceCategory: null,
    slug: null,
    title: null,
    confidence: 'high',
  },
  temporalConstraint: {
    order: 'none',
  },
  requestedFields: ['content'],
  evidenceScope: 'corpus',
  searchConcepts: {
    required: [],
    optional: [],
  },
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'General blog question.',
}

describe('buildChatQuestionPlanFromIntentFrame', () => {
  it('최신 글 게시일 요청을 chronological direct plan으로 변환한다', () => {
    const result = buildChatQuestionPlanFromIntentFrame({
      intentFrame: {
        ...BASE_INTENT_FRAME,
        domain: 'blog',
        standaloneQuestion: '블로그의 최신 글은 언제 게시되었나요?',
        temporalConstraint: {
          order: 'latest',
        },
        requestedFields: ['title', 'published_at'],
      },
      locale: 'ko',
    })

    expect(result).toMatchObject({
      route: 'direct',
      directAction: 'latest_post',
      retrievalScope: 'none',
      preferredSourceCategories: ['blog'],
    })
  })

  it('시간순 corpus 조회에서는 잘못 생성된 target 누락 slot을 무시한다', () => {
    const result = buildChatQuestionPlanFromIntentFrame({
      intentFrame: {
        ...BASE_INTENT_FRAME,
        domain: 'blog',
        standaloneQuestion: '블로그의 최신 글은 언제 게시되었나요?',
        temporalConstraint: {
          order: 'latest',
        },
        requestedFields: ['title', 'published_at'],
        missingSlots: ['target'],
        clarificationQuestion: '어떤 글을 말하는지 알려주세요.',
      },
      locale: 'ko',
    })

    expect(result).toMatchObject({
      route: 'direct',
      directAction: 'latest_post',
      clarificationQuestion: null,
    })
  })

  it('최신 글 요약 요청은 최신 글 selector와 summarize action을 함께 유지한다', () => {
    const result = buildChatQuestionPlanFromIntentFrame({
      intentFrame: {
        ...BASE_INTENT_FRAME,
        domain: 'blog',
        operation: 'summarize',
        standaloneQuestion: '블로그의 최신 글을 요약해 주세요.',
        temporalConstraint: {
          order: 'latest',
        },
        requestedFields: ['summary'],
      },
      locale: 'ko',
    })

    expect(result).toMatchObject({
      action: 'summarize',
      route: 'direct',
      directAction: 'latest_post',
    })
  })

  it('작성자 target과 필수 검색 개념을 기존 검색 계획에 보존한다', () => {
    const result = buildChatQuestionPlanFromIntentFrame({
      intentFrame: {
        ...BASE_INTENT_FRAME,
        domain: 'profile',
        target: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: null,
          title: '이윤수',
          confidence: 'high',
        },
        evidenceScope: 'entity',
        searchConcepts: {
          required: ['Vercel'],
          optional: ['배포'],
        },
      },
      locale: 'ko',
    })

    expect(result).toMatchObject({
      route: 'retrieve',
      retrievalScope: 'entity',
      referenceTarget: {
        kind: 'profile',
        sourceCategory: 'profile',
      },
      preferredSourceCategories: ['profile'],
      additionalKeywords: expect.arrayContaining(['Vercel', '배포']),
    })
  })

  it('필수 slot이 누락되면 명확화 계획을 만든다', () => {
    const result = buildChatQuestionPlanFromIntentFrame({
      intentFrame: {
        ...BASE_INTENT_FRAME,
        target: {
          ...BASE_INTENT_FRAME.target,
          confidence: 'low',
        },
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
      },
      locale: 'ko',
    })

    expect(result).toMatchObject({
      route: 'clarify',
      directAction: 'none',
      retrievalScope: 'none',
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
    })
  })
})
