import { describe, expect, it } from 'vitest'
import { buildChatRetrievalPlanCacheKey } from '@/features/chat/lib/chat-intent-cache-key'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

const BASE_RETRIEVAL_PLAN: ChatRetrievalPlan = {
  executionKind: 'retrieve_and_generate',
  standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
  operation: 'lookup',
  canonicalTargets: [
    {
      kind: 'profile',
      sourceCategory: 'profile',
      slug: 'about',
      title: '이윤수',
    },
  ],
  sourceStrategy: 'prefer',
  sourceCategories: ['profile'],
  temporalStrategy: 'none',
  temporalOrder: null,
  requestedFields: ['content'],
  requiredConcepts: ['Vercel', '배포'],
  optionalConcepts: [],
  maximumEvidenceCount: 5,
}

function buildKey(
  retrievalPlan: ChatRetrievalPlan,
  currentPostSlug?: string,
): string {
  return buildChatRetrievalPlanCacheKey({
    locale: 'ko',
    retrievalPlan,
    currentPostSlug,
    evidenceVersion: 'commit-a',
  })
}

describe('buildChatRetrievalPlanCacheKey', () => {
  it('질문 표현과 배열 순서가 달라도 실행 의미가 같으면 같은 키를 만든다', () => {
    const firstKey = buildKey(BASE_RETRIEVAL_PLAN)
    const secondKey = buildKey({
      ...BASE_RETRIEVAL_PLAN,
      standaloneQuestion: '이 사람 버셀 써봤어?',
      requiredConcepts: ['배포', 'vercel'],
    })

    expect(secondKey).toBe(firstKey)
  })

  it.each([
    {
      name: 'canonical target',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        canonicalTargets: [
          {
            ...BASE_RETRIEVAL_PLAN.canonicalTargets[0],
            slug: 'another-profile',
          },
        ],
      },
    },
    {
      name: 'source strategy',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        sourceStrategy: 'only' as const,
      },
    },
    {
      name: 'source categories',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        sourceCategories: ['project'] as const,
      },
    },
    {
      name: 'temporal strategy',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        temporalStrategy: 'rank' as const,
        temporalOrder: 'latest' as const,
      },
    },
    {
      name: 'requested fields',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        requestedFields: ['title', 'published_at'] as const,
      },
    },
    {
      name: 'required concepts',
      retrievalPlan: {
        ...BASE_RETRIEVAL_PLAN,
        requiredConcepts: ['Cloudflare'],
      },
    },
  ])('$name이 다르면 다른 키를 만든다', ({ retrievalPlan }) => {
    expect(buildKey(retrievalPlan as ChatRetrievalPlan)).not.toBe(
      buildKey(BASE_RETRIEVAL_PLAN),
    )
  })

  it('현재 글 slug와 evidence version을 키에 포함한다', () => {
    const currentPostKey = buildKey(BASE_RETRIEVAL_PLAN, 'current-post')
    const anotherPostKey = buildKey(BASE_RETRIEVAL_PLAN, 'another-post')
    const anotherVersionKey = buildChatRetrievalPlanCacheKey({
      locale: 'ko',
      retrievalPlan: BASE_RETRIEVAL_PLAN,
      currentPostSlug: 'current-post',
      evidenceVersion: 'commit-b',
    })

    expect(currentPostKey).not.toBe(anotherPostKey)
    expect(currentPostKey).not.toBe(anotherVersionKey)
  })
})
