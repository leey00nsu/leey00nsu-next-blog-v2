import type { Meta, StoryObj } from '@storybook/react'
import type { BlogChatConversationItem } from '@/features/chat/model/use-blog-chat'
import koMessages from '@/messages/ko.json'
import { BlogChatWidgetView } from '@/widgets/chatbot/ui/blog-chat-widget'

const CHATBOT_MESSAGES = koMessages.chatbot
const MESSAGE_PLACEHOLDER_PATTERN = /\{(\w+)\}/g

function translate(
  key: string,
  values?: Record<string, string | number>,
): string {
  const resolvedValue = key.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue && typeof currentValue === 'object') {
      return (currentValue as Record<string, unknown>)[segment]
    }

    return null
  }, CHATBOT_MESSAGES)

  if (typeof resolvedValue !== 'string') {
    return key
  }

  return resolvedValue.replaceAll(
    MESSAGE_PLACEHOLDER_PATTERN,
    (_, valueKey: string) => {
      const nextValue = values?.[valueKey]
      return nextValue === undefined ? '' : String(nextValue)
    },
  )
}

const COMPLETED_CONVERSATION_ITEM: BlogChatConversationItem = {
  id: 'completed-conversation-item',
  question: '이윤수의 주력 기술 스택은 뭐야?',
  status: 'completed',
  response: {
    grounded: true,
    answer:
      '소개와 프로젝트 내용을 기준으로 보면 Next.js, TypeScript, Tailwind CSS를 중심으로 웹 서비스를 만들고, Prisma/PostgreSQL 같은 백엔드 저장소와 AI 도구를 함께 다루는 편입니다.',
    citations: [
      {
        title: 'About Me',
        url: '/ko/about',
        sectionTitle: '블로그 소개',
        sourceCategory: 'profile',
      },
      {
        title: 'Leesfield',
        url: '/ko/projects/leesfield#기술-스택',
        sectionTitle: '기술 스택',
        sourceCategory: 'project',
      },
    ],
    followUpSuggestions: [
      '프로젝트별 기술 스택도 알려줘',
      'AI 관련 경험은 어떤 게 있어?',
    ],
  },
}

const PENDING_CONVERSATION_ITEM: BlogChatConversationItem = {
  id: 'pending-conversation-item',
  question: '블로그 챗봇 구조를 설명해줘',
  status: 'pending',
}

const FAILED_CONVERSATION_ITEM: BlogChatConversationItem = {
  id: 'failed-conversation-item',
  question: '아주 긴 질문이 실패했을 때는 어떻게 보여?',
  status: 'failed',
  errorCode: 'request_failed',
}

const REFUSAL_CONVERSATION_ITEM: BlogChatConversationItem = {
  id: 'refusal-conversation-item',
  question: '비공개 회사 내부 정보를 알려줘',
  status: 'completed',
  response: {
    grounded: false,
    answer: '',
    citations: [],
    refusalReason: 'insufficient_evidence',
  },
}

const meta: Meta<typeof BlogChatWidgetView> = {
  title: 'widgets/chatbot/BlogChatWidget',
  component: BlogChatWidgetView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof BlogChatWidgetView>

export const Closed: Story = {
  args: {
    conversationItems: [],
    isLoading: false,
    isVisible: true,
    question: '',
    setQuestion: () => {},
    submitQuestion: async () => {},
    translate,
    initialOpen: false,
  },
}

export const Empty: Story = {
  args: {
    ...Closed.args,
    initialOpen: true,
  },
}

export const Answered: Story = {
  args: {
    ...Closed.args,
    conversationItems: [COMPLETED_CONVERSATION_ITEM],
    initialOpen: true,
    question: '다음 질문을 입력해볼게',
  },
}

export const Loading: Story = {
  args: {
    ...Closed.args,
    conversationItems: [PENDING_CONVERSATION_ITEM],
    isLoading: true,
    initialOpen: true,
  },
}

export const Failed: Story = {
  args: {
    ...Closed.args,
    conversationItems: [FAILED_CONVERSATION_ITEM],
    initialOpen: true,
  },
}

export const Refusal: Story = {
  args: {
    ...Closed.args,
    conversationItems: [REFUSAL_CONVERSATION_ITEM],
    initialOpen: true,
  },
}
