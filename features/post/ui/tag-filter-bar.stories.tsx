import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { TagFilterBar } from './tag-filter-bar'
import type { Post } from '@/entities/post/model/types'
import koMessages from '@/messages/ko.json'

const MOCK_POST_DATE = new Date('2025-01-01T00:00:00.000Z')

const createMockPost = (index: number, tags: string[]): Post => ({
    slug: `post-${index}`,
    title: 'Sample Post',
    description: 'Sample description',
    date: MOCK_POST_DATE,
    writer: 'Author',
    tags,
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content: '',
    width: 160,
    height: 160,
})

const mockPosts: Post[] = [
    createMockPost(1, ['React', 'TypeScript']),
    createMockPost(2, ['React', 'Next.js']),
    createMockPost(3, ['TypeScript', 'Node.js']),
    createMockPost(4, ['React', 'TypeScript', 'Next.js']),
    createMockPost(5, ['JavaScript']),
    createMockPost(6, ['React']),
    createMockPost(7, ['TypeScript']),
]

const meta: Meta<typeof TagFilterBar> = {
    title: 'features/TagFilterBar',
    component: TagFilterBar,
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
type Story = StoryObj<typeof TagFilterBar>

export const Default: Story = {
    args: {
        posts: mockPosts,
        selectedTags: [],
    },
}

export const WithSelectedTags: Story = {
    args: {
        posts: mockPosts,
        selectedTags: ['React', 'TypeScript'],
    },
}

export const SingleTagSelected: Story = {
    args: {
        posts: mockPosts,
        selectedTags: ['Next.js'],
    },
}

export const EmptyPosts: Story = {
    args: {
        posts: [],
        selectedTags: [],
    },
}
