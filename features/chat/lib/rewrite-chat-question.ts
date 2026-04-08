import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'

export interface ChatConversationHistoryItem {
  question: string
  answer: string
  citations: {
    title: string
    url: string
    sectionTitle: string | null
    sourceCategory: ChatSourceCategory
  }[]
}

interface RewriteChatQuestionWithHistoryParams {
  question: string
  conversationHistory?: ChatConversationHistoryItem[]
}

const CHAT_FOLLOW_UP = {
  MAXIMUM_STORED_CITATION_TITLE_COUNT: 2,
  SHORT_QUESTION_MAXIMUM_LENGTH: 24,
  SHORT_FOLLOW_UP_MAXIMUM_TOKEN_COUNT: 2,
  CONTEXTUAL_REFERENCE_PATTERNS: [
    '그건',
    '그거',
    '그럼',
    'what about',
    'how about',
    'then',
    'that',
    'it',
    'this',
  ],
  GENERIC_FOLLOW_UP_PATTERNS: ['왜', '어떻게', '자세히', '예시는', 'why', 'how'],
} as const

function normalizeQuestionForMatch(question: string): string {
  return question.trim().toLowerCase()
}

function isFollowUpQuestion(question: string): boolean {
  const normalizedQuestion = normalizeQuestionForMatch(question)
  const tokenCount = normalizedQuestion.split(/\s+/u).filter(Boolean).length

  if (normalizedQuestion.length > CHAT_FOLLOW_UP.SHORT_QUESTION_MAXIMUM_LENGTH) {
    return false
  }

  const hasContextualReference = CHAT_FOLLOW_UP.CONTEXTUAL_REFERENCE_PATTERNS.some(
    (pattern) => {
      return normalizedQuestion.includes(pattern)
    },
  )

  if (hasContextualReference) {
    return true
  }

  if (tokenCount > CHAT_FOLLOW_UP.SHORT_FOLLOW_UP_MAXIMUM_TOKEN_COUNT) {
    return false
  }

  return CHAT_FOLLOW_UP.GENERIC_FOLLOW_UP_PATTERNS.some((pattern) => {
    return normalizedQuestion.includes(pattern)
  })
}

export function rewriteChatQuestionWithHistory({
  question,
  conversationHistory = [],
}: RewriteChatQuestionWithHistoryParams): string {
  if (!isFollowUpQuestion(question) || conversationHistory.length === 0) {
    return question
  }

  const latestConversationHistory =
    conversationHistory[conversationHistory.length - 1]
  const citationTitles = latestConversationHistory.citations
    .slice(0, CHAT_FOLLOW_UP.MAXIMUM_STORED_CITATION_TITLE_COUNT)
    .map((citation) => citation.title)
    .join(' ')

  return [
    latestConversationHistory.question,
    citationTitles,
    question,
  ]
    .filter(Boolean)
    .join(' ')
}
