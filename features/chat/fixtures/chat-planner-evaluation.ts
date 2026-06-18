import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import {
  EMPTY_CHAT_CONVERSATION_STATE,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type {
  ChatIntentPatch,
  NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'
import type { SupportedLocale } from '@/shared/config/constants'

export {
  CHAT_RETRIEVAL_EVALUATION_ASSISTANT_PROFILE as CHAT_PLANNER_EVALUATION_ASSISTANT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS as CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE as CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS as CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'

export interface ChatPlannerEvaluationCase {
  id: string
  question: string
  locale: SupportedLocale
  inputState: ChatConversationState
  modelPatch: ChatIntentPatch
  expectedIntent: NormalizedChatIntent
  expectedExecutionKind: 'direct' | 'model'
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  expectedTopMatchUrl?: string
}

const EMPTY_TARGET = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
} as const

const OWNER_TARGET = {
  kind: 'profile',
  sourceCategory: 'profile',
  slug: 'about',
  title: '이윤수',
} as const

export const CHAT_PLANNER_EVALUATION_CASES: ChatPlannerEvaluationCase[] = [
  {
    id: 'mixed-greeting-project',
    question: '안녕 leesfield 라는 프로젝트 알아?',
    locale: 'ko',
    inputState: EMPTY_CHAT_CONVERSATION_STATE,
    modelPatch: {
      standaloneQuestion: 'Leesfield라는 프로젝트를 설명해 주세요.',
      targetUpdate: {
        kind: 'replace',
        target: {
          kind: 'named_entity',
          sourceCategory: 'project',
          slug: 'leesfield',
          title: 'Leesfield',
        },
      },
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'entity',
      requiredConcepts: ['Leesfield'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Project lookup after greeting.',
    },
    expectedIntent: {
      standaloneQuestion: 'Leesfield라는 프로젝트를 설명해 주세요.',
      target: {
        kind: 'named_entity',
        sourceCategory: 'project',
        slug: 'leesfield',
        title: 'Leesfield',
      },
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'entity',
      requiredConcepts: ['Leesfield'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Project lookup after greeting.',
    },
    expectedExecutionKind: 'model',
    expectedTopMatchUrl: '/ko/projects/leesfield',
  },
  {
    id: 'ambiguous-person-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    inputState: EMPTY_CHAT_CONVERSATION_STATE,
    modelPatch: {
      standaloneQuestion: '이 사람의 이름은 무엇인가요?',
      targetUpdate: { kind: 'clear' },
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'none',
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low',
      reason: 'The target is missing.',
    },
    expectedIntent: {
      standaloneQuestion: '이 사람의 이름은 무엇인가요?',
      target: EMPTY_TARGET,
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'none',
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low',
      reason: 'The target is missing.',
    },
    expectedExecutionKind: 'direct',
  },
  {
    id: 'resolved-profile-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    inputState: {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      resolvedTarget: OWNER_TARGET,
    },
    modelPatch: {
      standaloneQuestion: '이윤수의 이름을 알려주세요.',
      targetUpdate: { kind: 'preserve' },
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'entity',
      requiredConcepts: ['이윤수'],
      optionalConcepts: ['이름'],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Use the resolved owner target.',
    },
    expectedIntent: {
      standaloneQuestion: '이윤수의 이름을 알려주세요.',
      target: OWNER_TARGET,
      operation: 'answer',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'entity',
      requiredConcepts: ['이윤수'],
      optionalConcepts: ['이름'],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Use the resolved owner target.',
    },
    expectedExecutionKind: 'model',
    expectedTopMatchUrl: '/ko/about',
  },
  {
    id: 'current-post-question',
    question: '이 글에서 구조가 왜 중요해?',
    locale: 'ko',
    inputState: EMPTY_CHAT_CONVERSATION_STATE,
    currentPostSlug: 'why-i-built-lee-spec-kit',
    modelPatch: {
      standaloneQuestion: '현재 글에서 구조가 중요한 이유를 설명해 주세요.',
      targetUpdate: {
        kind: 'replace',
        target: {
          kind: 'current_source',
          sourceCategory: 'blog',
          slug: 'why-i-built-lee-spec-kit',
          title: null,
        },
      },
      operation: 'explain',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'current_source',
      requiredConcepts: ['구조'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Current post explanation.',
    },
    expectedIntent: {
      standaloneQuestion: '현재 글에서 구조가 중요한 이유를 설명해 주세요.',
      target: {
        kind: 'current_source',
        sourceCategory: 'blog',
        slug: 'why-i-built-lee-spec-kit',
        title: null,
      },
      operation: 'explain',
      temporalConstraint: { order: 'none' },
      requestedFields: ['content'],
      evidenceScope: 'current_source',
      requiredConcepts: ['구조'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Current post explanation.',
    },
    expectedExecutionKind: 'model',
    expectedTopMatchUrl: '/ko/blog/why-i-built-lee-spec-kit',
  },
]
