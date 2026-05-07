import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { ChatQuestionSelector } from '@/features/chat/model/chat-question-routing'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import type {
  ChatSourceCategory,
  ChatEvidenceRecord,
} from '@/features/chat/model/chat-evidence'
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
  questionPlan: ChatQuestionPlan
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  semanticMatches?: ChatEvidenceRecord[]
  expectedSelector?: ChatQuestionSelector
  expectedRoute: ChatQuestionPlan['route']
  expectedClarificationQuestion?: string
  expectedTopMatchUrl?: string
  expectedPreferredSourceCategories?: ChatSourceCategory[]
}

const DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN = {
  action: 'answer',
  route: 'retrieve',
  directAction: 'none',
  retrievalScope: 'entity',
  referenceTarget: {
    kind: 'named_entity',
    sourceCategory: null,
    slug: null,
    title: null,
    confidence: 'medium',
  },
  preferredSourceCategories: [],
  additionalKeywords: [],
  clarificationQuestion: null,
  reason: 'evaluation plan',
} satisfies Omit<ChatQuestionPlan, 'standaloneQuestion'>

export const CHAT_PLANNER_EVALUATION_CASES: ChatPlannerEvaluationCase[] = [
  {
    id: 'mixed-greeting-project',
    question: '안녕 leesfield 라는 프로젝트 알아?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: 'leesfield 라는 프로젝트 알아?',
      referenceTarget: {
        kind: 'named_entity',
        sourceCategory: 'project',
        slug: null,
        title: 'Leesfield',
        confidence: 'high',
      },
      preferredSourceCategories: ['project'],
      additionalKeywords: ['leesfield'],
      reason: 'project lookup after greeting',
    },
    expectedSelector: 'retrieval',
    expectedRoute: 'retrieve',
    expectedTopMatchUrl: '/ko/projects/leesfield',
    expectedPreferredSourceCategories: ['project'],
  },
  {
    id: 'assistant-identity-retrieval',
    question: '넌 누구야?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: '넌 누구야?',
      retrievalScope: 'entity',
      referenceTarget: {
        kind: 'assistant',
        sourceCategory: 'assistant',
        slug: 'assistant-profile',
        title: null,
        confidence: 'high',
      },
      preferredSourceCategories: ['assistant', 'profile'],
      additionalKeywords: ['챗봇', 'assistant', 'profile'],
      reason: 'assistant identity retrieval',
    },
    expectedSelector: 'retrieval',
    expectedRoute: 'retrieve',
    expectedTopMatchUrl: '/ko/about',
    expectedPreferredSourceCategories: ['assistant', 'profile'],
  },
  {
    id: 'ambiguous-person-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: '이 사람 이름 뭐야?',
      route: 'clarify',
      retrievalScope: 'none',
      referenceTarget: {
        kind: 'none',
        sourceCategory: null,
        slug: null,
        title: null,
        confidence: 'low',
      },
      clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
      reason: 'ambiguous person reference',
    },
    expectedRoute: 'clarify',
    expectedClarificationQuestion:
      '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
  },
  {
    id: 'ambiguous-person-reference-on-current-post',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: '이 사람 이름 뭐야?',
      route: 'clarify',
      retrievalScope: 'none',
      referenceTarget: {
        kind: 'none',
        sourceCategory: null,
        slug: null,
        title: null,
        confidence: 'low',
      },
      clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
      reason: 'ambiguous person reference on current post',
    },
    currentPostSlug: 'why-i-built-lee-spec-kit',
    expectedRoute: 'clarify',
    expectedClarificationQuestion:
      '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
  },
  {
    id: 'profile-follow-up-reference',
    question: '이 사람 이름 뭐야?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: '이 사람 이름 뭐야?',
      referenceTarget: {
        kind: 'profile',
        sourceCategory: 'profile',
        slug: 'about',
        title: null,
        confidence: 'high',
      },
      preferredSourceCategories: ['profile'],
      reason: 'profile follow-up reference',
    },
    conversationHistory: [
      {
        question: '이 사람은 어떤 개발자야?',
        answer: 'React와 Next.js 중심의 개발자입니다.',
        citations: [
          {
            title: 'About Me',
            url: '/ko/about',
            sectionTitle: null,
            sourceCategory: 'profile',
          },
        ],
      },
    ],
    expectedSelector: 'retrieval',
    expectedRoute: 'retrieve',
    expectedTopMatchUrl: '/ko/about',
    expectedPreferredSourceCategories: ['profile'],
  },
  {
    id: 'current-post-question',
    question: '이 글에서 구조가 왜 중요해?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: '이 글에서 구조가 왜 중요해?',
      retrievalScope: 'current_source',
      referenceTarget: {
        kind: 'current_source',
        sourceCategory: 'blog',
        slug: 'why-i-built-lee-spec-kit',
        title: null,
        confidence: 'high',
      },
      preferredSourceCategories: ['blog'],
      additionalKeywords: ['구조'],
      reason: 'explicit current post question',
    },
    currentPostSlug: 'why-i-built-lee-spec-kit',
    expectedSelector: 'current_source',
    expectedRoute: 'retrieve',
    expectedTopMatchUrl: '/ko/blog/why-i-built-lee-spec-kit',
    expectedPreferredSourceCategories: ['blog'],
  },
]
