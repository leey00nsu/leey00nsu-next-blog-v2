import type { Meta, StoryObj } from '@storybook/react'
import koMessages from '@/messages/ko.json'
import { BlogChatWidgetView } from '@/widgets/chatbot/ui/blog-chat-widget'

function translate(key: string): string {
  const resolvedValue = key.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue && typeof currentValue === 'object') {
      return (currentValue as Record<string, unknown>)[segment]
    }

    return null
  }, koMessages.chatbot)

  return typeof resolvedValue === 'string' ? resolvedValue : key
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

export const Default: Story = {
  args: {
    locale: 'ko',
    translate,
  },
}

export const BlogPostContext: Story = {
  args: {
    locale: 'ko',
    currentPostSlug: 'building-ai-chat-for-my-blog',
    translate,
  },
}
