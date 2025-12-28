import type { Meta, StoryObj } from '@storybook/react'
import { TagFilterBar } from './tag-filter-bar'
import type { Post } from '@/entities/post/model/types'

const createMockPost = (tags: string[]): Post => ({
    slug: `post-${Math.random().toString(36).slice(2)}`,
    title: 'Sample Post',
    description: 'Sample description',
    date: new Date(),
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
    createMockPost(['React', 'TypeScript']),
    createMockPost(['React', 'Next.js']),
    createMockPost(['TypeScript', 'Node.js']),
    createMockPost(['React', 'TypeScript', 'Next.js']),
    createMockPost(['JavaScript']),
    createMockPost(['React']),
    createMockPost(['TypeScript']),
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
