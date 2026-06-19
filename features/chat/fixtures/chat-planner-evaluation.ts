import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import {
  EMPTY_CHAT_CONVERSATION_STATE,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import type {
  ChatExecutionKind,
  ChatRetrievalPlan,
} from '@/features/chat/model/chat-retrieval-plan'
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
  modelPlan: ChatQueryPlan
  expectedRetrievalPlan: Partial<ChatRetrievalPlan>
  expectedTargetSlug: string | null
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
}

export interface ChatPlannerGoldenCase {
  id: string
  question: string
  locale: SupportedLocale
  expectedContextAction: ChatQueryPlan['contextAction']
  expectedEntityId: string | null
  expectedOperations: ChatQueryPlan['operation'][]
  expectedSourceMode: ChatQueryPlan['sourceSelection']['mode']
  expectedSourceCategories: ChatSourceCategory[]
  expectedTemporalMode: ChatQueryPlan['temporalSelection']['mode']
  expectedTemporalOrder: 'latest' | 'oldest' | null
  expectedAnyRequestedFields: ChatQueryPlan['requestedFields']
  forbiddenRequestedFields?: ChatQueryPlan['requestedFields']
  expectedRequiredConcepts: string[]
  expectClarification: boolean
  expectedExecutionKind: ChatExecutionKind
  modelPlan: ChatQueryPlan
}

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
    modelPlan: {
      standaloneQuestion: 'Leesfield라는 프로젝트를 설명해 주세요.',
      contextAction: 'reset',
      targetSelection: {
        kind: 'candidate',
        entityId: 'project/leesfield',
      },
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['Leesfield'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Project lookup after greeting.',
    },
    expectedRetrievalPlan: {
      executionKind: 'retrieve_and_generate',
      sourceStrategy: 'only',
      sourceCategories: ['project'],
      temporalStrategy: 'none',
    },
    expectedTargetSlug: 'leesfield',
  },
  {
    id: 'ambiguous-person-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    inputState: EMPTY_CHAT_CONVERSATION_STATE,
    modelPlan: {
      standaloneQuestion: '이 사람의 이름은 무엇인가요?',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low',
      reason: 'The target is missing.',
    },
    expectedRetrievalPlan: {
      executionKind: 'clarification',
      sourceStrategy: 'all',
      sourceCategories: [],
    },
    expectedTargetSlug: null,
  },
  {
    id: 'resolved-profile-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    inputState: {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      focusedTarget: OWNER_TARGET,
    },
    modelPlan: {
      standaloneQuestion: '이윤수의 이름을 알려주세요.',
      contextAction: 'continue',
      targetSelection: { kind: 'preserve' },
      operation: 'lookup',
      sourceSelection: { mode: 'prefer', categories: ['profile'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['이윤수'],
      optionalConcepts: ['이름'],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Use the resolved owner target.',
    },
    expectedRetrievalPlan: {
      executionKind: 'retrieve_and_generate',
      sourceStrategy: 'prefer',
      sourceCategories: ['profile'],
    },
    expectedTargetSlug: 'about',
  },
  {
    id: 'current-post-question',
    question: '이 글에서 구조가 왜 중요해?',
    locale: 'ko',
    inputState: EMPTY_CHAT_CONVERSATION_STATE,
    currentPostSlug: 'why-i-built-lee-spec-kit',
    modelPlan: {
      standaloneQuestion: '현재 글에서 구조가 중요한 이유를 설명해 주세요.',
      contextAction: 'reset',
      targetSelection: { kind: 'current_source' },
      operation: 'explain',
      sourceSelection: { mode: 'only', categories: ['blog'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['구조'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Current post explanation.',
    },
    expectedRetrievalPlan: {
      executionKind: 'retrieve_and_generate',
      sourceStrategy: 'only',
      sourceCategories: ['blog'],
    },
    expectedTargetSlug: 'why-i-built-lee-spec-kit',
  },
]

export const CHAT_PLANNER_GOLDEN_CASES: ChatPlannerGoldenCase[] = [
  {
    id: 'why-lee-spec-kit',
    question: 'lee-spec-kit을 왜 만들었어?',
    locale: 'ko',
    expectedContextAction: 'reset',
    expectedEntityId: 'project/lee-spec-kit',
    expectedOperations: ['lookup', 'explain'],
    expectedSourceMode: 'only',
    expectedSourceCategories: ['project'],
    expectedTemporalMode: 'none',
    expectedTemporalOrder: null,
    expectedAnyRequestedFields: ['content', 'summary'],
    expectedRequiredConcepts: [],
    expectClarification: false,
    expectedExecutionKind: 'retrieve_and_generate',
    modelPlan: {
      standaloneQuestion: 'lee-spec-kit을 만든 이유는 무엇인가요?',
      contextAction: 'reset',
      targetSelection: {
        kind: 'candidate',
        entityId: 'project/lee-spec-kit',
      },
      operation: 'explain',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['lee-spec-kit'],
      optionalConcepts: ['만든 이유'],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Explicit project question.',
    },
  },
  {
    id: 'leemage-presigned-url',
    question: 'Leemage에서 Presigned URL을 사용한 이유가 뭐야?',
    locale: 'ko',
    expectedContextAction: 'reset',
    expectedEntityId: 'project/leemage',
    expectedOperations: ['lookup', 'explain'],
    expectedSourceMode: 'only',
    expectedSourceCategories: ['project'],
    expectedTemporalMode: 'none',
    expectedTemporalOrder: null,
    expectedAnyRequestedFields: ['content', 'summary'],
    expectedRequiredConcepts: ['Presigned URL'],
    expectClarification: false,
    expectedExecutionKind: 'retrieve_and_generate',
    modelPlan: {
      standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
      contextAction: 'reset',
      targetSelection: {
        kind: 'candidate',
        entityId: 'project/leemage',
      },
      operation: 'explain',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['Presigned URL'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Explicit project and technology question.',
    },
  },
  {
    id: 'recent-project-ai-usage',
    question: '최근 프로젝트에서 AI를 어떻게 활용하고 있어?',
    locale: 'ko',
    expectedContextAction: 'reset',
    expectedEntityId: null,
    expectedOperations: ['explain'],
    expectedSourceMode: 'only',
    expectedSourceCategories: ['project'],
    expectedTemporalMode: 'rank',
    expectedTemporalOrder: 'latest',
    expectedAnyRequestedFields: ['content', 'summary'],
    forbiddenRequestedFields: ['published_at'],
    expectedRequiredConcepts: ['AI'],
    expectClarification: false,
    expectedExecutionKind: 'retrieve_and_generate',
    modelPlan: {
      standaloneQuestion: '최근 프로젝트에서 AI를 활용한 방식을 설명해 주세요.',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'explain',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'rank', order: 'latest' },
      requestedFields: ['content', 'summary'],
      requiredConcepts: ['AI'],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'Cross-project aggregate question.',
    },
  },
  {
    id: 'ambiguous-vercel-person',
    question: '이 사람 Vercel 써봤어?',
    locale: 'ko',
    expectedContextAction: 'reset',
    expectedEntityId: null,
    expectedOperations: ['lookup'],
    expectedSourceMode: 'all',
    expectedSourceCategories: [],
    expectedTemporalMode: 'none',
    expectedTemporalOrder: null,
    expectedAnyRequestedFields: ['content'],
    expectedRequiredConcepts: ['Vercel'],
    expectClarification: true,
    expectedExecutionKind: 'clarification',
    modelPlan: {
      standaloneQuestion: '이 사람이 Vercel을 사용한 경험이 있나요?',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['Vercel'],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low',
      reason: 'Pronoun target is unresolved.',
    },
  },
]
