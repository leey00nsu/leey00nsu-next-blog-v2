import type { ChatConversationHistoryItem } from '@/features/chat/lib/rewrite-chat-question'
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
  expectedRetrieval: boolean
  expectedClarificationQuestion?: string
  expectedTopMatchUrl?: string
  expectedPreferredSourceCategories?: ChatSourceCategory[]
}

const DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN = {
  action: 'answer',
  scope: 'global',
  deterministicAction: 'none',
  needsRetrieval: true,
  retrievalMode: 'standard',
  preferredSourceCategories: [],
  additionalKeywords: [],
  needsClarification: false,
  clarificationQuestion: null,
  reason: 'evaluation plan',
} satisfies Omit<ChatQuestionPlan, 'standaloneQuestion' | 'socialPreamble'>

export const CHAT_PLANNER_EVALUATION_CASES: ChatPlannerEvaluationCase[] = [
  {
    id: 'mixed-greeting-project',
    question: '안녕 leesfield 라는 프로젝트 알아?',
    locale: 'ko',
    questionPlan: {
      ...DEFAULT_CHAT_PLANNER_EVALUATION_QUESTION_PLAN,
      standaloneQuestion: 'leesfield 라는 프로젝트 알아?',
      socialPreamble: true,
      preferredSourceCategories: ['project'],
      additionalKeywords: ['leesfield'],
      reason: 'project lookup after greeting',
    },
    expectedSelector: 'retrieval',
    expectedRetrieval: true,
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
      socialPreamble: false,
      preferredSourceCategories: ['assistant', 'profile'],
      additionalKeywords: ['챗봇', 'assistant', 'profile'],
      reason: 'assistant identity retrieval',
    },
    expectedSelector: 'retrieval',
    expectedRetrieval: true,
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
      socialPreamble: false,
      needsRetrieval: false,
      retrievalMode: 'none',
      needsClarification: true,
      clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
      reason: 'ambiguous person reference',
    },
    expectedRetrieval: false,
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
      socialPreamble: false,
      needsRetrieval: false,
      retrievalMode: 'none',
      needsClarification: true,
      clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
      reason: 'ambiguous person reference on current post',
    },
    currentPostSlug: 'why-i-built-lee-spec-kit',
    expectedRetrieval: false,
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
      socialPreamble: false,
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
    expectedRetrieval: true,
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
      socialPreamble: false,
      scope: 'current_page',
      retrievalMode: 'current_post',
      preferredSourceCategories: ['blog'],
      additionalKeywords: ['구조'],
      reason: 'explicit current post question',
    },
    currentPostSlug: 'why-i-built-lee-spec-kit',
    expectedSelector: 'current_post',
    expectedRetrieval: true,
    expectedTopMatchUrl: '/ko/blog/why-i-built-lee-spec-kit',
    expectedPreferredSourceCategories: ['blog'],
  },
]
