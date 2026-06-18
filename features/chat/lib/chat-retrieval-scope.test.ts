import { describe, expect, it } from 'vitest'
import {
  resolveChatIntentRetrievalScope,
  resolveChatRetrievalScope,
} from '@/features/chat/lib/chat-retrieval-scope'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
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

const DEFAULT_INTENT: NormalizedChatIntent = {
  standaloneQuestion: 'Leesfield는 어떤 프로젝트야?',
  operation: 'answer',
  target: {
    kind: 'named_entity',
    sourceCategory: 'project',
    slug: null,
    title: 'Leesfield',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Leesfield'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Project lookup.',
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

describe('resolveChatIntentRetrievalScope', () => {
  it('current source intent는 현재 post slug를 fallback으로 사용한다', () => {
    expect(
      resolveChatIntentRetrievalScope({
        intent: {
          ...DEFAULT_INTENT,
          target: {
            kind: 'current_source',
            sourceCategory: 'blog',
            slug: null,
            title: null,
          },
          evidenceScope: 'current_source',
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

  it('entity intent는 target 범위를 그대로 유지한다', () => {
    expect(
      resolveChatIntentRetrievalScope({
        intent: DEFAULT_INTENT,
      }),
    ).toEqual({
      mode: 'entity',
      sourceCategory: 'project',
      slug: null,
      title: 'Leesfield',
    })
  })
})
