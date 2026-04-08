import { describe, expect, it } from 'vitest'
import { classifyChatQuestion } from '@/features/chat/api/classify-chat-question'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'

const CHAT_ASSISTANT_PROFILE: ChatAssistantProfile = {
  title: '블로그 챗봇 안내',
  description: '챗봇 내부 안내 문서',
  chatbotName: '블로그 챗봇',
  ownerName: '이윤수',
  greetingAnswer:
    '안녕하세요. 저는 이윤수 님의 블로그 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  identityAnswer:
    '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  aliases: [
    '넌 뭐야',
    '누구의 챗봇이야',
    '이 사람이랑 어떤 관계야',
    'who are you',
    'whose chatbot are you',
  ],
  content:
    '저는 이윤수 님의 챗봇입니다. 블로그 글과 공개된 소개 페이지를 근거로 답변합니다.',
}

describe('classifyChatQuestion', () => {
  it('assistant 내부 문서 alias로 정체 질문 fallback 분류를 한다', async () => {
    const result = await classifyChatQuestion({
      question: '넌 이 사람이랑 어떤 관계야?',
      locale: 'ko',
      normalizedQuestion: '넌 이 사람이랑 어떤 관계야',
      fallbackQuestionType: 'general',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      hasCurrentPostContext: false,
    })

    expect(result.handlingType).toBe('direct_assistant_identity')
  })

  it('연락 질문은 fallback에서 direct_contact로 분류한다', async () => {
    const result = await classifyChatQuestion({
      question: '어떻게 연락해?',
      locale: 'ko',
      normalizedQuestion: '어떻게 연락해',
      fallbackQuestionType: 'general',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      hasCurrentPostContext: false,
    })

    expect(result.handlingType).toBe('direct_contact')
  })

  it('현재 글 컨텍스트가 있으면 현재 글 질문을 direct_current_post로 분류한다', async () => {
    const result = await classifyChatQuestion({
      question: '이 글 요약해줘',
      locale: 'ko',
      normalizedQuestion: '이 글 요약해줘',
      fallbackQuestionType: 'general',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      hasCurrentPostContext: true,
    })

    expect(result.handlingType).toBe('direct_current_post')
  })
})
