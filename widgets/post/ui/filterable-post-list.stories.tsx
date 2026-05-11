import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import type { Post } from '@/entities/post/model/types'
import koMessages from '@/messages/ko.json'
import { FilterablePostList } from '@/widgets/post/ui/filterable-post-list'

function createMockPost(index: number, tags: string[]): Post {
  return {
    slug: `filterable-post-${index}`,
    title: `Filterable Post ${index}`,
    description:
      'A post list item used to verify filtering and list rendering in Storybook.',
    date: new Date(2025, 0, index),
    writer: 'leey00nsu',
    tags,
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content: '',
    width: 160,
    height: 160,
  }
}

const POSTS: Post[] = [
  createMockPost(1, ['AI', 'Next.js']),
  createMockPost(2, ['React', 'TypeScript']),
  createMockPost(3, ['AI', 'RAG']),
  createMockPost(4, ['Storybook']),
]

const meta: Meta<typeof FilterablePostList> = {
  title: 'widgets/FilterablePostList',
  component: FilterablePostList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof FilterablePostList>

export const Default: Story = {
  args: {
    posts: POSTS,
    locale: 'ko',
  },
  render: (args) => (
    <div className="w-[640px]">
      <FilterablePostList {...args} />
    </div>
  ),
}

export const Empty: Story = {
  args: {
    posts: [],
    locale: 'ko',
  },
  render: (args) => (
    <div className="w-[640px]">
      <FilterablePostList {...args} />
    </div>
  ),
}
