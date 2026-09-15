import { describe, expect, it } from 'vitest'
import { BlogChatRequestSchema, BlogChatResponseSchema } from './chat-schema'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import { BLOG_CHAT } from '@/features/chat/config/constants'

describe('BlogChatRequestSchema', () => {
  const citation = {
    title: 'Source',
    url: '/source',
    sectionTitle: null,
    sourceCategory: 'blog',
  }
  const historyItem = {
    question: 'Earlier question',
    answer: 'Earlier answer',
    citations: [citation],
  }

  it.each([
    {
      ...historyItem,
      answer: 'a'.repeat(BLOG_CHAT.INPUT.MAXIMUM_HISTORY_ANSWER_CHARACTERS + 1),
    },
    {
      ...historyItem,
      citations: [
        {
          ...citation,
          title: 'a'.repeat(
            BLOG_CHAT.INPUT.MAXIMUM_HISTORY_TITLE_CHARACTERS + 1,
          ),
        },
      ],
    },
    {
      ...historyItem,
      citations: [
        {
          ...citation,
          sectionTitle: 'a'.repeat(
            BLOG_CHAT.INPUT.MAXIMUM_HISTORY_TITLE_CHARACTERS + 1,
          ),
        },
      ],
    },
    {
      ...historyItem,
      citations: [
        {
          ...citation,
          url: 'a'.repeat(BLOG_CHAT.INPUT.MAXIMUM_HISTORY_URL_CHARACTERS + 1),
        },
      ],
    },
    {
      ...historyItem,
      citations: Array.from(
        { length: BLOG_CHAT.INPUT.MAXIMUM_HISTORY_CITATION_COUNT + 1 },
        () => citation,
      ),
    },
  ])('초과된 히스토리 필드를 거절한다 (%#)', (turn) => {
    expect(
      BlogChatRequestSchema.safeParse({
        question: 'Follow-up',
        conversationHistory: [turn],
      }).success,
    ).toBe(false)
  })

  it('개별 필드가 허용 범위여도 히스토리 총량을 제한한다', () => {
    const turn = {
      ...historyItem,
      answer: 'a'.repeat(BLOG_CHAT.INPUT.MAXIMUM_HISTORY_ANSWER_CHARACTERS),
    }
    expect(
      BlogChatRequestSchema.safeParse({
        question: 'Follow-up',
        conversationHistory: [turn],
      }).success,
    ).toBe(true)
    expect(
      BlogChatRequestSchema.safeParse({
        question: 'Follow-up',
        conversationHistory: [turn, turn],
      }).success,
    ).toBe(false)
  })

  it('정상적인 두 턴과 출처를 보존한다', () => {
    const conversationHistory = [historyItem, historyItem]
    expect(
      BlogChatRequestSchema.parse({
        question: 'Follow-up',
        conversationHistory,
      }).conversationHistory,
    ).toEqual(conversationHistory)
  })
  it('질문 길이는 200자를 넘길 수 없다', () => {
    const result = BlogChatRequestSchema.safeParse({
      question: 'a'.repeat(201),
      locale: 'ko',
    })

    expect(result.success).toBe(false)
  })

  it('대화 상태가 없으면 빈 상태를 기본값으로 사용한다', () => {
    const result = BlogChatRequestSchema.parse({
      question: '안녕?',
      locale: 'ko',
    })

    expect(result.conversationState).toEqual(EMPTY_CHAT_CONVERSATION_STATE)
  })

  it('지원하지 않는 대화 상태 버전을 거부한다', () => {
    const result = BlogChatRequestSchema.safeParse({
      question: '안녕?',
      locale: 'ko',
      conversationState: {
        ...EMPTY_CHAT_CONVERSATION_STATE,
        version: 1,
      },
    })

    expect(result.success).toBe(false)
  })
})

describe('BlogChatResponseSchema', () => {
  it('public 응답의 빈 answer를 거부한다', () => {
    const result = BlogChatResponseSchema.safeParse({
      answer: '',
      citations: [],
      grounded: false,
      refusalReason: 'insufficient_search_match',
    })

    expect(result.success).toBe(false)
  })
})
