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

  it('SDK 위젯에 커스텀 메시지 렌더러와 트리거 렌더러를 전달한다', () => {
    usePathnameMock.mockReturnValue('/ko/about')

    render(<BlogChatWidget />)

    expect(leeChatWidgetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        renderMessage: expect.any(Function),
        renderTrigger: expect.any(Function),
      }),
    )
  })
})
