import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'

const DIRECT_CHAT_QUERY = {
  TRAILING_PUNCTUATION_PATTERN: /[?!.,~]+$/gu,
  MULTIPLE_WHITESPACE_PATTERN: /\s+/gu,
  IDENTITY_PATTERNS: [
    /^(?:넌|너는|너|당신은|당신)\s*(?:대체\s*)?(?:누구(?:야|지|니|예요|인가요|입니까)?|정체(?:가\s*)?(?:뭐야|뭔데|예요|인가요|입니까)|뭐(?:야|지|니|예요|인가요|입니까))$/u,
    /^(?:넌|너는|너|당신은|당신)\s*(?:무슨|어떤|뭐\s*하는)\s*(?:챗봇|존재)(?:이야|이니|예요|인가요|입니까)?$/u,
    /^(?:무슨|어떤|뭐\s*하는)\s*챗봇(?:이야|이니|예요|인가요|입니까)?$/u,
    /^(?:who|what)\s+are\s+you$/u,
    /^who\s+is\s+this\s+(?:chatbot|assistant)$/u,
  ],
  IDENTITY_REASON: 'Direct assistant identity question.',
} as const

function normalizeDirectQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replaceAll(DIRECT_CHAT_QUERY.TRAILING_PUNCTUATION_PATTERN, '')
    .replaceAll(DIRECT_CHAT_QUERY.MULTIPLE_WHITESPACE_PATTERN, ' ')
    .trim()
}

function isAssistantIdentityQuestion(question: string): boolean {
  const normalizedQuestion = normalizeDirectQuestion(question)

  return DIRECT_CHAT_QUERY.IDENTITY_PATTERNS.some((identityPattern) => {
    return identityPattern.test(normalizedQuestion)
  })
}

export function getDirectChatQueryPlan(question: string): ChatQueryPlan | null {
  if (!isAssistantIdentityQuestion(question)) {
    return null
  }

  return {
    standaloneQuestion: question.trim(),
    contextAction: 'reset',
    targetSelection: { kind: 'none' },
    operation: 'identity',
    sourceSelection: { mode: 'all' },
    temporalSelection: { mode: 'none' },
    requestedFields: [],
    requiredConcepts: [],
    optionalConcepts: [],
    missingSlots: [],
    clarificationQuestion: null,
    confidence: 'high',
    reason: DIRECT_CHAT_QUERY.IDENTITY_REASON,
  }
}
