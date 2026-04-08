import { describe, expect, it } from 'vitest'
import type { ChatQuestionType } from '@/features/chat/lib/question-analysis'
import { selectChatRagHandlingMode } from '@/features/chat/lib/chat-rag-routing'

function selectHandlingMode(params: {
  normalizedQuestion: string
  questionType: ChatQuestionType
}) {
  return selectChatRagHandlingMode(params)
}

describe('selectChatRagHandlingMode', () => {
  it('인사 질문은 deterministic으로 남긴다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion: '안녕',
        questionType: 'greeting',
      }),
    ).toBe('deterministic')
  })

  it('챗봇 관계 질문은 deterministic으로 남긴다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion: '넌 이 사람이랑 어떤 관계야',
        questionType: 'assistant-identity',
      }),
    ).toBe('deterministic')
  })

  it('최신 추천 질문은 deterministic으로 남긴다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion: '최신 회고 글 추천해줘',
        questionType: 'general',
      }),
    ).toBe('deterministic')
  })

  it('오래된 글 추천 질문은 deterministic으로 남긴다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion: '가장 오래된 글 추천',
        questionType: 'general',
      }),
    ).toBe('deterministic')
  })

  it('영문 일반 질문은 rag로 보낸다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion: 'what is his name',
        questionType: 'general',
      }),
    ).toBe('rag')
  })

  it('블로그 전체 공통 철학 질문은 rag로 보낸다', () => {
    expect(
      selectHandlingMode({
        normalizedQuestion:
          '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
        questionType: 'general',
      }),
    ).toBe('rag')
  })
})
