import { describe, expect, it } from 'vitest'
import { planChatQuestion } from '@/features/chat/api/plan-chat-question'
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
    '누구의 챗봇이야',
    '이 사람이랑 어떤 관계야',
    'whose chatbot are you',
  ],
  content:
    '저는 이윤수 님의 챗봇입니다. 블로그 글과 공개된 소개 페이지를 근거로 답변합니다.',
}

describe('planChatQuestion', () => {
  it('인사와 실제 질문이 섞인 문장은 retrieval 질문으로 계획한다', async () => {
    const result = await planChatQuestion({
      question: '안녕 leesfield 라는 프로젝트 알아?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.socialPreamble).toBe(true)
    expect(result.standaloneQuestion).toBe('leesfield 라는 프로젝트 알아')
    expect(result.needsRetrieval).toBe(true)
    expect(result.retrievalMode).toBe('standard')
    expect(result.preferredSourceCategories).toContain('project')
  })

  it('assistant 정체 질문은 direct identity가 아니라 retrieval 질문으로 계획한다', async () => {
    const result = await planChatQuestion({
      question: '넌 누구야?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.deterministicAction).toBe('none')
    expect(result.needsRetrieval).toBe(true)
    expect(result.preferredSourceCategories).toEqual(['assistant', 'profile'])
    expect(result.additionalKeywords).toContain('챗봇')
  })

  it('맥락 없는 사람 지시어 질문은 clarification으로 계획한다', async () => {
    const result = await planChatQuestion({
      question: '이 사람 이름 뭐야?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.needsClarification).toBe(true)
    expect(result.needsRetrieval).toBe(false)
    expect(result.clarificationQuestion).toContain('구체적으로')
  })

  it('최신 글 질문은 deterministic action으로 계획한다', async () => {
    const result = await planChatQuestion({
      question: '최신 글 요약해줘',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.deterministicAction).toBe('latest_post')
    expect(result.action).toBe('summarize')
    expect(result.needsRetrieval).toBe(false)
  })
})
