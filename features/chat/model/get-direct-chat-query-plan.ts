import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import { isPrivateChatContactQuestion } from '@/features/chat/lib/chat-contact-question'

const DIRECT_CHAT_QUERY = {
  TRAILING_PUNCTUATION_PATTERN: /[?!.,~]+$/gu,
  MULTIPLE_WHITESPACE_PATTERN: /\s+/gu,
  IDENTITY_PATTERNS: [
    /^(?:넌|너는|너|당신은|당신)\s*(?:대체\s*)?(?:누구(?:야|지|니|예요|인가요|입니까)?|정체(?:가\s*)?(?:뭐야|뭔데|예요|인가요|입니까)|뭐(?:야|지|니|예요|인가요|입니까))$/u,
    /^(?:넌|너는|너|당신은|당신)\s*(?:무슨|어떤|뭐\s*하는)\s*(?:챗봇|존재)(?:이야|이니|예요|인가요|입니까)?$/u,
    /^(?:무슨|어떤|뭐\s*하는)\s*챗봇(?:이야|이니|예요|인가요|입니까)?$/u,
    /^(?:너|넌|너는|당신|당신은)\s*(?:블로그\s*주인|작성자|이윤수)(?:와|하고|랑|과)\s*(?:무슨|어떤)\s*관계(?:야|니|예요|인가요|입니까)?$/u,
    /^(?:블로그\s*주인|작성자|이윤수)(?:와|하고|랑|과)의?\s*관계(?:가\s*)?(?:뭐야|뭔데|예요|인가요|입니까)?$/u,
    /^(?:who|what)\s+are\s+you$/u,
    /^who\s+is\s+this\s+(?:chatbot|assistant)$/u,
    /^what\s+is\s+your\s+relationship\s+with\s+(?:the\s+)?(?:author|blog\s+owner|him|her|them)$/u,
  ],
  OWNER_IDENTITY_PATTERNS: [
    /^(?:이\s*)?(?:블로그|사이트)\s*(?:의\s*)?(?:주인|작성자)(?:은|는|이|가)?\s*누구(?:야|지|니|예요|인가요|입니까)?$/u,
    /^(?:이\s*)?(?:블로그|사이트)\s*(?:의\s*)?(?:주인|작성자)\s*(?:의\s*)?이름(?:이|은|가)?\s*(?:뭐야|뭔데|뭐예요|무엇인가요|입니까)$/u,
    /^(?:who\s+is|what\s+is\s+the\s+name\s+of)\s+the\s+(?:blog|site)\s+(?:owner|author)$/u,
  ],
  RECENT_WORKPLACE_PATTERNS: [
    /^(?:이윤수(?:는|가)?\s*)?(?:(?:가장\s*)?(?:최근|마지막으로)\s*)?어디(?:에서)?\s*(?:일했어|근무했어|일했나요|근무했나요|일했습니까|근무했습니까)$/u,
    /^(?:이윤수(?:의|가)?\s*)?(?:(?:가장\s*)?(?:최근|마지막)\s*)?(?:직장|근무처)(?:은|는|이|가)?\s*어디(?:야|예요|인가요|입니까)$/u,
    /^(?:(?:이윤수|작성자|블로그\s*주인)(?:의|가|는)?\s*)?(?:가장\s*)?(?:최근|최신|마지막)\s*(?:경력|직장|근무처)(?:을|를|은|는)?\s*(?:알려줘|말해줘|소개해줘|뭐야|어디야|알려주세요|말해주세요)?$/u,
    /^(?:where\s+did\s+)?(?:yoonsu\s+lee|the\s+blog\s+owner|the\s+author)\s+(?:most\s+recently\s+)?work$/u,
  ],
  IDENTITY_REASON: 'Direct assistant identity question.',
  OWNER_IDENTITY_REASON: 'Direct blog owner identity question.',
  RECENT_WORKPLACE_REASON: 'Direct recent workplace question.',
  PRIVATE_CONTACT_REASON: 'Private contact information is not public.',
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

function isOwnerIdentityQuestion(question: string): boolean {
  const normalizedQuestion = normalizeDirectQuestion(question)

  return DIRECT_CHAT_QUERY.OWNER_IDENTITY_PATTERNS.some(
    (ownerIdentityPattern) => {
      return ownerIdentityPattern.test(normalizedQuestion)
    },
  )
}

function isRecentWorkplaceQuestion(question: string): boolean {
  const normalizedQuestion = normalizeDirectQuestion(question)

  return DIRECT_CHAT_QUERY.RECENT_WORKPLACE_PATTERNS.some(
    (recentWorkplacePattern) => {
      return recentWorkplacePattern.test(normalizedQuestion)
    },
  )
}

export function getDirectChatQueryPlan(question: string): ChatQueryPlan | null {
  if (isPrivateChatContactQuestion(question)) {
    return {
      standaloneQuestion: question.trim(),
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'contact',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: DIRECT_CHAT_QUERY.PRIVATE_CONTACT_REASON,
    }
  }

  if (isOwnerIdentityQuestion(question)) {
    return {
      standaloneQuestion: question.trim(),
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'owner_identity',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: [],
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: DIRECT_CHAT_QUERY.OWNER_IDENTITY_REASON,
    }
  }

  if (isRecentWorkplaceQuestion(question)) {
    return {
      standaloneQuestion: question.trim(),
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['profile'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['content'],
      requiredConcepts: [],
      optionalConcepts: ['career', 'workplace'],
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: DIRECT_CHAT_QUERY.RECENT_WORKPLACE_REASON,
    }
  }

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
