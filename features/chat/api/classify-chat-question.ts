import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatQuestionType } from '@/features/chat/lib/question-analysis'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import {
  ChatQuestionRoutingResultSchema,
  type ChatQuestionRoutingResult,
} from '@/features/chat/model/chat-question-routing'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_QUESTION_ROUTING = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  ROUTER_MODEL_ID: 'gpt-5.4-mini',
  FALLBACK_PATTERNS: {
    CONTACT: [
      '연락',
      '연락처',
      '연락 방법',
      'contact',
      'reach',
      'get in touch',
      'email',
      '이메일',
      'github',
      'linkedin',
    ],
    LATEST: ['최신', '최근', '마지막', '마지막 글', 'latest', 'recent', 'last', 'last post'],
    OLDEST: ['오래된', '가장 오래된', '첫 글', '처음 글', 'oldest', 'first post'],
    CURRENT_POST: [
      '이 글',
      '이 문서',
      '이 포스트',
      '이 페이지',
      '이거',
      '이건',
      '요약',
      '요약해줘',
      '짧게 소개',
      '핵심',
    ],
    CORPUS: [
      '블로그 전체',
      '전체 글',
      '전체를 보면',
      '공통',
      '공통된',
      '관통',
      '반복되는',
      '여러 글',
      'across the blog',
      'across posts',
      'common patterns',
      'common philosophy',
    ],
    ACTION_SUMMARIZE: ['요약', '요약해', '요약해줘', 'summary', 'summarize'],
    ACTION_EXPLAIN: ['설명', '설명해', 'explain'],
    ACTION_RECOMMEND: ['추천', '추천해', '추천해줘', 'recommend'],
    ACTION_COMPARE: ['비교', 'compare'],
  },
} as const

const CHAT_QUESTION_ROUTING_PROMPT = {
  SYSTEM: `Classify each user question for a blog chatbot into selector, action, and scope.

Selectors:
- greeting: greetings, small talk, simple pleasantries
- assistant_identity: asking who the chatbot is, what relationship it has to the author, or what scope it answers from
- contact: asking how to contact the author or where public contact channels are
- latest_post: asking for the latest or most recent post
- oldest_post: asking for the oldest or first post
- current_post: asking about the currently viewed post or page when currentPostContext is true
- retrieval: normal factual questions that need evidence from blog posts, public profile, or projects
- corpus: questions asking for themes, philosophies, common patterns, or summaries across multiple posts or the whole blog

Actions:
- answer: direct factual answer
- summarize: short summary of the selected target
- explain: explanation of the selected target
- recommend: recommendation response
- compare: compare multiple relevant sources

Scopes:
- global: blog-wide question
- current_page: question about the currently viewed post or page

Rules:
- Prefer greeting for short social messages like hello.
- Prefer assistant_identity for "who are you", "what are you", or "what is your relationship to the author".
- Prefer contact for questions about how to contact the author or where GitHub/LinkedIn/contact links are.
- Prefer latest_post/oldest_post only for chronological questions about posts.
- Prefer current_post only when currentPostContext=true and the user is clearly asking about the currently viewed post or page.
- Prefer corpus when the user asks about the whole blog or repeated patterns across multiple writings.
- Use summarize when the user explicitly asks for a summary or gist.
- Use explain when the user explicitly asks for explanation.
- Use recommend when the user explicitly asks for a recommendation.
- Everything else should be retrieval with answer.
- Return concise reasoning in one sentence.`,
} as const

function includesAnyPattern(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

function escapeRegularExpression(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function includesTokenBoundedPattern(text: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase()
  const boundedPattern = new RegExp(
    String.raw`(^|\s)${escapeRegularExpression(normalizedPattern)}($|\s)`,
    'u',
  )

  return boundedPattern.test(text)
}

function isAssistantIdentityFallbackQuestion(params: {
  normalizedQuestion: string
  assistantProfile?: ChatAssistantProfile | null
}): boolean {
  if (!params.assistantProfile) {
    return false
  }

  const assistantIdentityPatterns = [
    params.assistantProfile.chatbotName,
    ...params.assistantProfile.aliases,
  ]

  return assistantIdentityPatterns.some((pattern) => {
    return includesTokenBoundedPattern(params.normalizedQuestion, pattern)
  })
}

function buildFallbackAction(normalizedQuestion: string) {
  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.ACTION_SUMMARIZE,
    )
  ) {
    return 'summarize' as const
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.ACTION_EXPLAIN,
    )
  ) {
    return 'explain' as const
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.ACTION_RECOMMEND,
    )
  ) {
    return 'recommend' as const
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.ACTION_COMPARE,
    )
  ) {
    return 'compare' as const
  }

  return 'answer' as const
}

function buildFallbackRoutingResult(params: {
  normalizedQuestion: string
  fallbackQuestionType: ChatQuestionType
  assistantProfile?: ChatAssistantProfile | null
  hasCurrentPostContext: boolean
}): ChatQuestionRoutingResult {
  const action = buildFallbackAction(params.normalizedQuestion)

  if (params.fallbackQuestionType === 'greeting') {
    return {
      selector: 'greeting',
      action: 'answer',
      scope: 'global',
      reason: 'fallback greeting classification',
    }
  }

  if (
    params.fallbackQuestionType === 'assistant-identity' ||
    isAssistantIdentityFallbackQuestion({
      normalizedQuestion: params.normalizedQuestion,
      assistantProfile: params.assistantProfile,
    })
  ) {
    return {
      selector: 'assistant_identity',
      action: 'answer',
      scope: 'global',
      reason: 'fallback assistant identity classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.CONTACT,
    )
  ) {
    return {
      selector: 'contact',
      action: 'answer',
      scope: 'global',
      reason: 'fallback contact classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.LATEST,
    )
  ) {
    return {
      selector: 'latest_post',
      action,
      scope: 'global',
      reason: 'fallback chronological latest classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.OLDEST,
    )
  ) {
    return {
      selector: 'oldest_post',
      action,
      scope: 'global',
      reason: 'fallback chronological oldest classification',
    }
  }

  if (
    params.hasCurrentPostContext &&
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.CURRENT_POST,
    )
  ) {
    return {
      selector: 'current_post',
      action,
      scope: 'current_page',
      reason: 'fallback current post classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.CORPUS,
    )
  ) {
    return {
      selector: 'corpus',
      action,
      scope: 'global',
      reason: 'fallback corpus classification',
    }
  }

  return {
    selector: 'retrieval',
    action,
    scope: 'global',
    reason: 'fallback grounded retrieval classification',
  }
}

function trimQuestion(question: string): string {
  return question.slice(0, CHAT_QUESTION_ROUTING.MAXIMUM_QUESTION_CHARACTERS)
}

export async function classifyChatQuestion(params: {
  question: string
  locale: SupportedLocale
  normalizedQuestion: string
  fallbackQuestionType: ChatQuestionType
  assistantProfile?: ChatAssistantProfile | null
  hasCurrentPostContext: boolean
}): Promise<ChatQuestionRoutingResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackRoutingResult({
      normalizedQuestion: params.normalizedQuestion,
      fallbackQuestionType: params.fallbackQuestionType,
      assistantProfile: params.assistantProfile,
      hasCurrentPostContext: params.hasCurrentPostContext,
    })
  }

  try {
    const { output } = await generateText({
      model: openai(
        process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL ??
          process.env.OPENAI_BLOG_CHAT_MODEL ??
          CHAT_QUESTION_ROUTING.ROUTER_MODEL_ID,
      ),
      temperature: 0,
      output: Output.object({
        schema: ChatQuestionRoutingResultSchema,
      }),
      system: CHAT_QUESTION_ROUTING_PROMPT.SYSTEM,
      prompt: [
        `locale=${params.locale}`,
        `currentPostContext=${params.hasCurrentPostContext}`,
        `question=${trimQuestion(params.question)}`,
      ].join('\n'),
    })

    return output as ChatQuestionRoutingResult
  } catch {
    return buildFallbackRoutingResult({
      normalizedQuestion: params.normalizedQuestion,
      fallbackQuestionType: params.fallbackQuestionType,
      assistantProfile: params.assistantProfile,
      hasCurrentPostContext: params.hasCurrentPostContext,
    })
  }
}
