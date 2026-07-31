import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { BlogChatProgressTrace } from '@/features/chat/model/blog-chat-progress'
import {
  BlogChatProgress,
  type BlogChatProgressMessages,
} from '@/widgets/chatbot/ui/blog-chat-progress'

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

const COMPLETED_TRACE: BlogChatProgressTrace = {
  stages: [
    {
      stage: 'understanding_question',
      status: 'completed',
    },
    {
      stage: 'checking_sources',
      status: 'completed',
    },
  ],
  sources: [
    {
      title: 'About Me',
      url: '/ko/about',
      sourceCategory: 'profile',
    },
  ],
  elapsedMilliseconds: 1200,
  failed: false,
}

describe('BlogChatProgress', () => {
  it('진행 중에는 현재 단계와 사용 중인 근거를 펼쳐서 보여준다', () => {
    render(
      <BlogChatProgress
        locale="ko"
        trace={{
          ...COMPLETED_TRACE,
          stages: [
            {
              stage: 'understanding_question',
              status: 'completed',
            },
            {
              stage: 'checking_sources',
              status: 'active',
            },
          ],
          elapsedMilliseconds: null,
        }}
        messages={PROGRESS_MESSAGES}
        pending
      />,
    )

    expect(
      screen.getByRole('region', { name: PROGRESS_MESSAGES.title }),
    ).toBeInTheDocument()
    expect(screen.queryByText(PROGRESS_MESSAGES.title)).not.toBeInTheDocument()
    expect(screen.getByText('공개된 자료를 확인하고 있어요')).toHaveClass(
      'blog-chat-progress-active-text',
    )
    expect(document.querySelector('.lucide-loader-circle')).toHaveClass(
      'text-muted-foreground',
      'animate-spin',
    )
    expect(screen.getByText('About Me')).toBeInTheDocument()
  })

  it('완료 기록을 버튼으로 부드럽게 접고 펼친다', async () => {
    const user = userEvent.setup()

    render(
      <BlogChatProgress
        locale="ko"
        trace={COMPLETED_TRACE}
        messages={PROGRESS_MESSAGES}
        pending={false}
      />,
    )

    const toggleButton = screen.getByRole('button', {
      name: '답변 준비 완료 · 근거 1개 · 1.2s',
    })

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText('질문의 대상과 범위를 확인하고 있어요'),
    ).not.toBeInTheDocument()

    await user.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText('질문의 대상과 범위를 확인하고 있어요'),
    ).toBeInTheDocument()
  })
})
