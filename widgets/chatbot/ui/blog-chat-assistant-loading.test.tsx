import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BlogChatProgressTrace } from '@/features/chat/model/blog-chat-progress'
import { BlogChatAssistantLoading } from '@/widgets/chatbot/ui/blog-chat-assistant-loading'
import type { BlogChatProgressMessages } from '@/widgets/chatbot/ui/blog-chat-progress'

const PROGRESS_MESSAGES: BlogChatProgressMessages = {
  title: '답변 준비 과정',
  completedTitle: '답변 준비 완료',
  sourceCount: (sourceCount) => `근거 ${sourceCount}개`,
  stages: {
    understanding_question: '질문의 대상과 범위를 확인하고 있어요',
    checking_sources: '공개된 자료를 확인하고 있어요',
    searching_evidence: '관련 글과 프로젝트를 검색하고 있어요',
    selecting_evidence: '답변에 사용할 근거를 선별했어요',
    generating_answer: '근거를 바탕으로 답변을 작성하고 있어요',
    validating_answer: '답변과 출처가 일치하는지 확인하고 있어요',
  },
}

const INITIAL_TRACE: BlogChatProgressTrace = {
  stages: [
    {
      stage: 'understanding_question',
      status: 'active',
    },
  ],
  sources: [],
  elapsedMilliseconds: null,
  failed: false,
}

describe('BlogChatAssistantLoading', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('진행 단계가 추가될 때 최신 과정까지 부드럽게 스크롤한다', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const { rerender } = render(
      <BlogChatAssistantLoading
        locale="ko"
        trace={INITIAL_TRACE}
        messages={PROGRESS_MESSAGES}
      >
        답변 준비 중
      </BlogChatAssistantLoading>,
    )

    rerender(
      <BlogChatAssistantLoading
        locale="ko"
        trace={{
          ...INITIAL_TRACE,
          stages: [
            {
              stage: 'understanding_question',
              status: 'completed',
            },
            {
              stage: 'searching_evidence',
              status: 'active',
            },
          ],
        }}
        messages={PROGRESS_MESSAGES}
      >
        답변 준비 중
      </BlogChatAssistantLoading>,
    )

    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest',
    })
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })
})
