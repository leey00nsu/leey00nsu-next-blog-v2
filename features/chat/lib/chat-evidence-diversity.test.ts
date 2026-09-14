import { describe, expect, it } from 'vitest'
import {
  isAggregateChatRetrievalPlan,
  isDocumentScopedRetrievalPlan,
  resolveChatEvidenceDiversityPolicy,
} from '@/features/chat/lib/chat-evidence-diversity'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

const BASE_PLAN: ChatRetrievalPlan = {
  executionKind: 'retrieve_and_generate',
  standaloneQuestion: '질문',
  operation: 'explain',
  canonicalTargets: [],
  sourceStrategy: 'all',
  sourceCategories: [],
  requiredConcepts: [],
  optionalConcepts: [],
  requestedFields: ['content'],
  temporalStrategy: 'none',
  temporalOrder: null,
  maximumEvidenceCount: 3,
}

const LEESFIELD_TARGET = {
  kind: 'named_entity' as const,
  sourceCategory: 'project' as const,
  slug: 'leesfield',
  title: 'Leesfield',
}

describe('isDocumentScopedRetrievalPlan', () => {
  it('only 전략으로 대상 하나에 고정된 계획을 단일 문서 스코프로 본다', () => {
    expect(
      isDocumentScopedRetrievalPlan({
        ...BASE_PLAN,
        canonicalTargets: [LEESFIELD_TARGET],
        sourceStrategy: 'only',
        sourceCategories: ['project'],
      }),
    ).toBe(true)
  })

  it('현재 페이지를 대상으로 하면 단일 문서 스코프로 본다', () => {
    expect(
      isDocumentScopedRetrievalPlan({
        ...BASE_PLAN,
        canonicalTargets: [
          {
            kind: 'current_source',
            sourceCategory: 'blog',
            slug: 'current-post',
            title: null,
          },
        ],
      }),
    ).toBe(true)
  })

  it('대상이 없으면 단일 문서 스코프가 아니다', () => {
    expect(
      isDocumentScopedRetrievalPlan({
        ...BASE_PLAN,
        sourceStrategy: 'only',
        sourceCategories: ['project'],
      }),
    ).toBe(false)
  })

  it('대상을 비교하는 계획은 단일 문서 스코프가 아니다', () => {
    expect(
      isDocumentScopedRetrievalPlan({
        ...BASE_PLAN,
        canonicalTargets: [
          LEESFIELD_TARGET,
          { ...LEESFIELD_TARGET, slug: 'leemage', title: 'Leemage' },
        ],
        sourceStrategy: 'only',
        sourceCategories: ['project'],
      }),
    ).toBe(false)
  })

  it('prefer 전략은 문서를 하나만 가리켜도 단일 문서 스코프가 아니다', () => {
    expect(
      isDocumentScopedRetrievalPlan({
        ...BASE_PLAN,
        canonicalTargets: [LEESFIELD_TARGET],
        sourceStrategy: 'prefer',
        sourceCategories: ['project'],
      }),
    ).toBe(false)
  })
})

describe('resolveChatEvidenceDiversityPolicy', () => {
  it('단일 문서 스코프에서는 섹션(url)당 한 건만 남긴다', () => {
    const policy = resolveChatEvidenceDiversityPolicy({
      plan: {
        ...BASE_PLAN,
        canonicalTargets: [LEESFIELD_TARGET],
        sourceStrategy: 'only',
        sourceCategories: ['project'],
      },
      maximumMatchesPerSlug: 2,
    })

    expect(policy.maximumMatchesPerGroup).toBe(1)
    expect(
      policy.resolveGroupKey({
        slug: 'leesfield',
        url: '/en/projects/leesfield#key-features',
      }),
    ).toBe('/en/projects/leesfield#key-features')
  })

  it('여러 문서를 다루면 slug당 상한을 그대로 쓴다', () => {
    const policy = resolveChatEvidenceDiversityPolicy({
      plan: { ...BASE_PLAN, sourceStrategy: 'all' },
      maximumMatchesPerSlug: 2,
    })

    expect(policy.maximumMatchesPerGroup).toBe(2)
    expect(
      policy.resolveGroupKey({
        slug: 'leesfield',
        url: '/en/projects/leesfield#key-features',
      }),
    ).toBe('leesfield')
  })
})

describe('isAggregateChatRetrievalPlan', () => {
  it('비교와 추천, 요약만 집계 질문으로 본다', () => {
    expect(
      isAggregateChatRetrievalPlan({ ...BASE_PLAN, operation: 'compare' }),
    ).toBe(true)
    expect(
      isAggregateChatRetrievalPlan({ ...BASE_PLAN, operation: 'recommend' }),
    ).toBe(true)
    expect(
      isAggregateChatRetrievalPlan({ ...BASE_PLAN, operation: 'summarize' }),
    ).toBe(true)
    expect(
      isAggregateChatRetrievalPlan({ ...BASE_PLAN, operation: 'explain' }),
    ).toBe(false)
  })
})
