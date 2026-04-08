import { describe, expect, it } from 'vitest'
import { rewriteChatQuestionWithHistory } from '@/features/chat/lib/rewrite-chat-question'

describe('rewriteChatQuestionWithHistory', () => {
  it('후속 질문이면 직전 질문과 인용 제목을 함께 붙인다', () => {
    const result = rewriteChatQuestionWithHistory({
      question: '그건 왜 그렇게 했어?',
      conversationHistory: [
        {
          question: '대표 프로젝트가 뭐야?',
          answer: 'lee-spec-kit이 대표 프로젝트입니다.',
          citations: [
            {
              title: 'lee-spec-kit',
              url: '/ko/projects/lee-spec-kit',
              sectionTitle: null,
              sourceCategory: 'project',
            },
          ],
        },
      ],
    })

    expect(result).toContain('대표 프로젝트가 뭐야')
    expect(result).toContain('lee-spec-kit')
    expect(result).toContain('그건 왜 그렇게 했어')
  })

  it('독립 질문이면 원문을 그대로 유지한다', () => {
    const result = rewriteChatQuestionWithHistory({
      question: 'TypeScript를 왜 자주 사용해?',
      conversationHistory: [
        {
          question: '대표 프로젝트가 뭐야?',
          answer: 'lee-spec-kit이 대표 프로젝트입니다.',
          citations: [],
        },
      ],
    })

    expect(result).toBe('TypeScript를 왜 자주 사용해?')
  })
})
