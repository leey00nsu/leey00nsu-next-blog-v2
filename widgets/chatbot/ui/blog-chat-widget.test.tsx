import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'

const { usePathnameMock, useBlogChatMock } = vi.hoisted(() => {
  return {
    usePathnameMock: vi.fn(),
    useBlogChatMock: vi.fn(),
  }
})

vi.mock('next-intl', () => {
  return {
    useLocale: () => 'ko',
    useTranslations: () => {
      return (translationKey: string) => translationKey
    },
  }
})

vi.mock('next/navigation', () => {
  return {
    usePathname: usePathnameMock,
  }
})

vi.mock('@/features/chat/model/use-blog-chat', () => {
  return {
    useBlogChat: useBlogChatMock,
  }
})

describe('BlogChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useBlogChatMock.mockReturnValue({
      conversationItems: [],
      isLoading: false,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    })
  })

  it('소개 페이지에서 챗봇 진입 버튼을 노출한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument()
  })

  it('pending 대화 항목은 질문 버블과 assistant 스피너를 함께 보여준다', () => {
    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [
        {
          id: 'pending-item',
          question: '보낸 질문',
          status: 'pending',
        },
      ],
      isLoading: true,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    })

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'open' }))
    })

    expect(screen.getByText('보낸 질문')).toBeInTheDocument()
    expect(screen.getByText('sending')).toBeInTheDocument()
  })

  it('failed 대화 항목은 질문 버블 아래에 에러 문구를 보여준다', () => {
    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [
        {
          id: 'failed-item',
          question: '실패한 질문',
          status: 'failed',
          errorCode: 'request_failed',
        },
      ],
      isLoading: false,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    })

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'open' }))
    })

    expect(screen.getByText('실패한 질문')).toBeInTheDocument()
    expect(screen.getByText('errors.request_failed')).toBeInTheDocument()
  })
})
