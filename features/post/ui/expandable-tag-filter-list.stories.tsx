import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { ExpandableTagFilterList } from '@/features/post/ui/expandable-tag-filter-list'
import koMessages from '@/messages/ko.json'

const TAGS = [
  'AI',
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Storybook',
  'PostgreSQL',
  'RAG',
  'Editor',
  'Automation',
  'Playwright',
  'MDX',
]

const COUNTS = Object.fromEntries(
  TAGS.map((tag, index) => [tag, TAGS.length - index]),
)

const meta: Meta<typeof ExpandableTagFilterList> = {
  title: 'features/ExpandableTagFilterList',
  component: ExpandableTagFilterList,
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
        <div className="w-[360px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ExpandableTagFilterList>

export const Default: Story = {
  args: {
    basePath: '/ko/blog',
    tags: TAGS,
    counts: COUNTS,
    selectedTags: [],
  },
}

export const WithSelectedTags: Story = {
  args: {
    basePath: '/ko/blog',
    tags: TAGS,
    counts: COUNTS,
    selectedTags: ['AI', 'Next.js'],
  },
}

