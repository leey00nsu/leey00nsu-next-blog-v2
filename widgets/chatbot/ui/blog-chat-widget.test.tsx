import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import koMessages from '@/messages/ko.json'
import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'

const { usePathnameMock, useBlogChatMock } = vi.hoisted(() => {
  return {
    usePathnameMock: vi.fn(),
    useBlogChatMock: vi.fn(),
  }
})

const EXPECTED_INPUT_PLACEHOLDER_TEXT = '질문을 입력하세요'
const scrollIntoViewMock = vi.fn()
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView

interface MotionDivMockProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children?: ReactNode
  animate?: unknown
  exit?: unknown
  initial?: unknown
  layout?: unknown
  transition?: unknown
  variants?: unknown
}

interface MotionAnchorMockProps
  extends Omit<ComponentPropsWithoutRef<'a'>, 'children'> {
  children?: ReactNode
  href?: string
  animate?: unknown
  exit?: unknown
  initial?: unknown
  transition?: unknown
  variants?: unknown
}

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

vi.mock('motion/react', () => {
  return {
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    motion: {
      a: ({
        children,
        initial,
        animate,
        exit,
        variants,
        transition,
        ...properties
      }: MotionAnchorMockProps) => (
        <a data-testid="motion-anchor" {...properties}>
          {children}
        </a>
      ),
      div: ({
        children,
        initial,
        animate,
        exit,
        variants,
        transition,
        layout,
        ...properties
      }: MotionDivMockProps) => (
        <div data-testid="motion-div" {...properties}>
          {children}
        </div>
      ),
    },
    useReducedMotion: () => false,
  }
})

describe('BlogChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    useBlogChatMock.mockReturnValue({
      conversationItems: [],
      isLoading: false,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    })
  })

  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView
  })

  it('소개 페이지에서 챗봇 진입 버튼을 노출한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    expect(
      screen.getByRole('button', { name: koMessages.chatbot.open }),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('motion-div')).toHaveLength(1)
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

  it('기존 대화가 있으면 위젯을 열 때 최신 대화 위치로 바로 이동한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [
        {
          id: 'completed-item',
          question: '기존 질문',
          status: 'completed',
          response: {
            grounded: true,
            answer: '기존 답변',
            refusalReason: null,
            citations: [],
          },
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

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'end',
    })
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

  it('한글 조합 중 Enter 입력은 질문 제출로 처리하지 않는다', () => {
    const submitQuestion = vi.fn()

    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [],
      isLoading: false,
      question: '안녕하세요',
      setQuestion: vi.fn(),
      submitQuestion,
    })

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    fireEvent.keyDown(screen.getByLabelText(koMessages.chatbot.inputLabel), {
      key: 'Enter',
      keyCode: 229,
      shiftKey: false,
      which: 229,
    })

    expect(submitQuestion).not.toHaveBeenCalled()
  })

  it('조합 중이 아닐 때 Enter 입력은 질문을 제출한다', () => {
    const submitQuestion = vi.fn()

    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [],
      isLoading: false,
      question: '안녕하세요',
      setQuestion: vi.fn(),
      submitQuestion,
    })

    render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    fireEvent.keyDown(screen.getByLabelText(koMessages.chatbot.inputLabel), {
      key: 'Enter',
      shiftKey: false,
    })

    expect(submitQuestion).toHaveBeenCalledTimes(1)
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

  it('초기 대화 내역은 새 등장 애니메이션을 다시 재생하지 않는다', () => {
    usePathnameMock.mockReturnValue('/ko/about')
    useBlogChatMock.mockReturnValue({
      conversationItems: [
        {
          id: 'completed-item',
          question: '기존 질문',
          status: 'completed',
          response: {
            grounded: true,
            answer: '기존 답변',
            refusalReason: null,
            citations: [],
          },
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

    expect(screen.getByText('기존 질문')).toBeInTheDocument()
    expect(screen.getAllByTestId('motion-div')).toHaveLength(2)
  })

  it('새 대화 항목이 추가되면 해당 항목만 등장 애니메이션 래퍼로 렌더링한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    const currentChatState = {
      conversationItems: [] as Array<Record<string, unknown>>,
      isLoading: false,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    }

    useBlogChatMock.mockImplementation(() => currentChatState)

    const { rerender } = render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    expect(screen.getAllByTestId('motion-div')).toHaveLength(2)

    currentChatState.conversationItems = [
      {
        id: 'pending-item',
        question: '새 질문',
        status: 'pending',
      },
    ]

    rerender(<BlogChatWidget />)

    expect(screen.getByText('새 질문')).toBeInTheDocument()
    expect(screen.getAllByTestId('motion-div')).toHaveLength(3)
  })

  it('새 질문이 추가되면 최신 대화 위치로 부드럽게 이동한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    const currentChatState = {
      conversationItems: [] as Array<Record<string, unknown>>,
      isLoading: false,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    }

    useBlogChatMock.mockImplementation(() => currentChatState)

    const { rerender } = render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    scrollIntoViewMock.mockClear()

    currentChatState.conversationItems = [
      {
        id: 'pending-item',
        question: '새 질문',
        status: 'pending',
      },
    ]

    rerender(<BlogChatWidget />)

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'end',
    })
  })

  it('같은 질문에 응답이 도착하면 최신 대화 위치로 부드럽게 이동한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    const currentChatState = {
      conversationItems: [
        {
          id: 'pending-item',
          question: '새 질문',
          status: 'pending',
        },
      ] as Array<Record<string, unknown>>,
      isLoading: true,
      question: '',
      setQuestion: vi.fn(),
      submitQuestion: vi.fn(),
    }

    useBlogChatMock.mockImplementation(() => currentChatState)

    const { rerender } = render(<BlogChatWidget />)

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: koMessages.chatbot.open }),
      )
    })

    scrollIntoViewMock.mockClear()

    currentChatState.conversationItems = [
      {
        id: 'pending-item',
        question: '새 질문',
        status: 'completed',
        response: {
          grounded: true,
          answer: '응답 완료',
          refusalReason: null,
          citations: [],
        },
      },
    ]
    currentChatState.isLoading = false

    rerender(<BlogChatWidget />)

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'end',
    })
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
