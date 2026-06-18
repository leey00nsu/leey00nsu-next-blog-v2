import { describe, expect, it } from 'vitest'
import { resolveChatEvidenceScope } from '@/features/chat/lib/chat-retrieval-scope'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'

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

describe('resolveChatEvidenceScope', () => {
  it('current source intent는 현재 post slug를 fallback으로 사용한다', () => {
    expect(
      resolveChatEvidenceScope({
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
      resolveChatEvidenceScope({
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
