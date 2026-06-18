import { describe, expect, it } from 'vitest'
import { buildChatIntentCacheKey } from '@/features/chat/lib/chat-intent-cache-key'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'

const BASE_INTENT: NormalizedChatIntent = {
  standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
  operation: 'answer',
  target: {
    kind: 'profile',
    sourceCategory: 'profile',
    slug: 'about',
    title: '이윤수',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Vercel', '배포'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Complete intent.',
}

function buildKey(intent: NormalizedChatIntent, currentPostSlug?: string) {
  return buildChatIntentCacheKey({
    locale: 'ko',
    intent,
    currentPostSlug,
    evidenceVersion: 'commit-a',
  })
}

describe('buildChatIntentCacheKey', () => {
  it('표현과 개념 배열 순서가 달라도 실행 의미가 같으면 같은 키를 만든다', () => {
    const firstKey = buildKey(BASE_INTENT)
    const secondKey = buildKey({
      ...BASE_INTENT,
      standaloneQuestion: '이 사람 버셀 써봤어?',
      requiredConcepts: ['배포', 'vercel'],
      reason: 'Same meaning with different wording.',
    })

    expect(secondKey).toBe(firstKey)
  })

  it.each([
    {
      name: 'target',
      intent: {
        ...BASE_INTENT,
        target: {
          ...BASE_INTENT.target,
          title: '다른 작성자',
        },
      },
    },
    {
      name: 'requested fields',
      intent: {
        ...BASE_INTENT,
        requestedFields: ['title', 'published_at'] as const,
      },
    },
    {
      name: 'required concepts',
      intent: {
        ...BASE_INTENT,
        requiredConcepts: ['Cloudflare'],
      },
    },
  ])('$name이 다르면 다른 키를 만든다', ({ intent }) => {
    expect(buildKey(intent as NormalizedChatIntent)).not.toBe(
      buildKey(BASE_INTENT),
    )
  })

  it('현재 글 slug와 evidence version을 키에 포함한다', () => {
    const currentPostKey = buildKey(BASE_INTENT, 'current-post')
    const anotherPostKey = buildKey(BASE_INTENT, 'another-post')
    const anotherVersionKey = buildChatIntentCacheKey({
      locale: 'ko',
      intent: BASE_INTENT,
      currentPostSlug: 'current-post',
      evidenceVersion: 'commit-b',
    })

    expect(currentPostKey).not.toBe(anotherPostKey)
    expect(currentPostKey).not.toBe(anotherVersionKey)
  })
})
