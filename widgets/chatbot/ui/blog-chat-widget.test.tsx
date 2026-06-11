import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import koMessages from '@/messages/ko.json'
import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'

const { usePathnameMock, leeChatProviderMock, leeChatWidgetMock } = vi.hoisted(
  () => {
    return {
      usePathnameMock: vi.fn(),
      leeChatProviderMock: vi.fn(),
      leeChatWidgetMock: vi.fn(),
    }
  },
)

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

vi.mock('lee-chat-sdk', () => {
  return {
    LEE_CHAT_TEXT_PRESETS: {
      ko: {
        title: '채팅',
        subtitle: '메시지를 보내주세요.',
        triggerLabel: '채팅 열기',
        placeholder: '메시지를 입력하세요',
        send: '보내기',
        sending: '전송 중',
        messageSending: '전송 중...',
        assistantLoading: '답변을 준비하고 있어요...',
        participantOnline: '온라인',
        participantTyping: '상대방이 입력 중이에요...',
        messageRead: '읽음',
        error: '메시지를 보내지 못했습니다. 다시 시도해주세요.',
        retry: '다시 시도',
      },
      en: {
        title: 'Chat',
        subtitle: 'Send us a message.',
        triggerLabel: 'Open chat',
        placeholder: 'Type your message',
        send: 'Send',
        sending: 'Sending',
        messageSending: 'Sending...',
        assistantLoading: 'Assistant is typing...',
        participantOnline: 'Online',
        participantTyping: 'Participant is typing...',
        messageRead: 'Read',
        error: 'Message failed. Please try again.',
        retry: 'Retry',
      },
    },
    LeeChatProvider: ({
      config,
      children,
    }: {
      config: Record<string, unknown>
      children?: ReactNode
    }) => {
      leeChatProviderMock(config)

      return <div data-testid="lee-chat-provider">{children}</div>
    },
    LeeChatWidget: (props: Record<string, unknown>) => {
      leeChatWidgetMock(props)

      return <div data-testid="lee-chat-widget" />
    },
  }
})

describe('BlogChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('소개 페이지에서는 SDK React 위젯을 렌더링한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    expect(screen.getByTestId('lee-chat-widget')).toBeInTheDocument()
    expect(leeChatProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'leey00nsu-next-blog',
        endpoint: '/api/chat',
        features: {
          attachments: false,
          realtime: false,
          operatorConsole: false,
        },
        messageStatus: {
          showSending: false,
        },
        persistence: 'localStorage',
      }),
    )
  })

  it('블로그 상세 페이지에서는 현재 글 slug를 SDK metadata로 전달한다', () => {
    usePathnameMock.mockReturnValue('/ko/blog/building-ai-chat-for-my-blog')

    render(<BlogChatWidget />)

    expect(leeChatProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: expect.objectContaining({
          id: 'blog-chat:ko',
          kind: 'assistant',
          metadata: {
            locale: 'ko',
            currentPostSlug: 'building-ai-chat-for-my-blog',
          },
        }),
        metadata: {
          locale: 'ko',
          currentPostSlug: 'building-ai-chat-for-my-blog',
        },
      }),
    )
  })

  it('챗봇 대상 경로가 아니면 SDK 위젯을 렌더링하지 않는다', () => {
    usePathnameMock.mockReturnValue('/ko/projects')

    const { container } = render(<BlogChatWidget />)

    expect(container).toBeEmptyDOMElement()
    expect(leeChatProviderMock).not.toHaveBeenCalled()
  })

  it('SDK 위젯에 assistant loading/content/footer, submit 슬롯과 트리거 렌더러를 전달한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    expect(leeChatWidgetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        renderAssistantLoading: expect.any(Function),
        renderAssistantContent: expect.any(Function),
        renderMessageFooter: expect.any(Function),
        renderSubmitContent: expect.any(Function),
        renderTrigger: expect.any(Function),
      }),
    )
  })

  it('assistant loading 슬롯에는 응답 생성 중 문구만 렌더링한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    const widgetProps = leeChatWidgetMock.mock.lastCall?.[0] as {
      renderAssistantLoading: () => ReactNode
    }

    render(widgetProps.renderAssistantLoading())

    expect(
      screen.getByText(koMessages.chatbot.sending),
    ).toBeInTheDocument()
  })

  it('submit 슬롯은 대기 중에는 전송 아이콘을 렌더링한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    const widgetProps = leeChatWidgetMock.mock.lastCall?.[0] as {
      renderSubmitContent: (params: {
        isSubmitting: boolean
        isUploading: boolean
        defaultContent: ReactNode
      }) => ReactNode
    }
    const { container } = render(
      widgetProps.renderSubmitContent({
        isSubmitting: false,
        isUploading: false,
        defaultContent: koMessages.chatbot.send,
      }),
    )

    expect(container.querySelector('.lucide-send')).toBeInTheDocument()
    expect(container.querySelector('.lucide-loader-circle')).toBeNull()
    expect(screen.queryByText(koMessages.chatbot.send)).not.toBeInTheDocument()
  })

  it('submit 슬롯은 전송 중에는 스피너를 렌더링한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    const widgetProps = leeChatWidgetMock.mock.lastCall?.[0] as {
      renderSubmitContent: (params: {
        isSubmitting: boolean
        isUploading: boolean
        defaultContent: ReactNode
      }) => ReactNode
    }
    const { container } = render(
      widgetProps.renderSubmitContent({
        isSubmitting: true,
        isUploading: false,
        defaultContent: koMessages.chatbot.send,
      }),
    )

    expect(container.querySelector('.lucide-loader-circle')).toHaveClass(
      'animate-spin',
    )
    expect(container.querySelector('.lucide-send')).toBeNull()
  })
})
