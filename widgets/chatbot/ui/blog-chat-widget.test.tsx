import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import koMessages from '@/messages/ko.json'
import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'

const { usePathnameMock, useBlogChatMock } = vi.hoisted(() => {
  return {
    usePathnameMock: vi.fn(),
    useBlogChatMock: vi.fn(),
  }
})

const EXPECTED_INPUT_PLACEHOLDER_TEXT = '질문을 입력하세요'

function resolveChatbotTranslationMessage(translationKey: string): string {
  const translationPathSegments = translationKey.split('.')
  let resolvedTranslationValue: unknown = koMessages.chatbot

  for (const translationPathSegment of translationPathSegments) {
    if (
      typeof resolvedTranslationValue !== 'object' ||
      resolvedTranslationValue === null ||
      !(translationPathSegment in resolvedTranslationValue)
    ) {
      return translationKey
    }

    resolvedTranslationValue = (
      resolvedTranslationValue as Record<string, unknown>
    )[translationPathSegment]
  }

  return typeof resolvedTranslationValue === 'string'
    ? resolvedTranslationValue
    : translationKey
}

vi.mock('next-intl', () => {
  return {
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => {
      return (translationKey: string) => {
        if (namespace !== 'chatbot') {
          return translationKey
        }

        return resolveChatbotTranslationMessage(translationKey)
      }
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

    expect(
      screen.getByRole('button', { name: koMessages.chatbot.open }),
    ).toBeInTheDocument()
  })

  it('열린 위젯 헤더에는 안내 문구 한 줄만 노출한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    expect(screen.getByText(koMessages.chatbot.subtitle)).toBeInTheDocument()
    expect(screen.queryByText('disclaimer')).not.toBeInTheDocument()
  })

  it('입력창 placeholder는 간단한 질문 안내 문구를 사용한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    expect(
      screen.getByPlaceholderText(EXPECTED_INPUT_PLACEHOLDER_TEXT),
    ).toBeInTheDocument()
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
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    expect(screen.getByText('보낸 질문')).toBeInTheDocument()
    expect(screen.getByText(koMessages.chatbot.sending)).toBeInTheDocument()
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
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    expect(screen.getByText('실패한 질문')).toBeInTheDocument()
    expect(
      screen.getByText(koMessages.chatbot.errors.request_failed),
    ).toBeInTheDocument()
  })
})
