import { describe, expect, it } from 'vitest'
import { resolveChatRetrievalScope } from '@/features/chat/lib/chat-retrieval-scope'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'

const DEFAULT_QUESTION_PLAN: ChatQuestionPlan = {
  standaloneQuestion: 'Leesfield는 어떤 프로젝트야?',
  action: 'answer',
  route: 'retrieve',
  directAction: 'none',
  retrievalScope: 'entity',
  referenceTarget: {
    kind: 'named_entity',
    sourceCategory: 'project',
    slug: null,
    title: 'Leesfield',
    confidence: 'high',
  },
  preferredSourceCategories: ['project'],
  additionalKeywords: ['leesfield'],
  clarificationQuestion: null,
  reason: 'project lookup',
}

describe('resolveChatRetrievalScope', () => {
  it('current source blog target은 현재 post slug를 fallback으로 사용한다', () => {
    expect(
      resolveChatRetrievalScope({
        questionPlan: {
          ...DEFAULT_QUESTION_PLAN,
          standaloneQuestion: '이 글에서 구조가 왜 중요해?',
          retrievalScope: 'current_source',
          referenceTarget: {
            kind: 'current_source',
            sourceCategory: 'blog',
            slug: null,
            title: null,
            confidence: 'high',
          },
        },
        currentPostSlug: 'why-i-built-lee-spec-kit',
      }),
    ).toEqual({
      mode: 'current_source',
      sourceCategory: 'blog',
      slug: 'why-i-built-lee-spec-kit',
      title: null,
    })
  })

  it('named entity target은 planner가 정한 source category와 title을 유지한다', () => {
    expect(
      resolveChatRetrievalScope({
        questionPlan: DEFAULT_QUESTION_PLAN,
      }),
    ).toEqual({
      mode: 'entity',
      sourceCategory: 'project',
      slug: null,
      title: 'Leesfield',
    })
  })
})
