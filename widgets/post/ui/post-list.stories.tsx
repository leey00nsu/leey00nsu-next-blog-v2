import type { Meta, StoryObj } from '@storybook/react'
import { PostList } from './post-list'
import type { Post } from '@/entities/post/model/types'

const createMockPost = (index: number): Post => ({
    slug: `post-${index}`,
    title: `Sample Post Title ${index}`,
    description: `This is a sample description for post ${index}. It contains some text to demonstrate how the card looks with content.`,
    date: new Date(2024, 0, 15 - index),
    writer: 'leey00nsu',
    tags: ['React', 'TypeScript', 'Next.js'].slice(0, (index % 3) + 1),
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content: '',
    width: 160,
    height: 160,
})

const mockPosts: Post[] = Array.from({ length: 5 }, (_, i) => createMockPost(i + 1))

const meta: Meta<typeof PostList> = {
    title: 'widgets/PostList',
    component: PostList,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        nextjs: {
            appDirectory: true,
        },
    },
}

export default meta
type Story = StoryObj<typeof PostList>

export const Default: Story = {
    args: {
        posts: mockPosts,
    },
    render: (args) => (
        <div className="w-[600px]">
            <PostList {...args} />
        </div>
    ),
}

export const SinglePost: Story = {
    args: {
        posts: [mockPosts[0]],
    },
    render: (args) => (
        <div className="w-[600px]">
            <PostList {...args} />
        </div>
    ),
}

export const Empty: Story = {
    args: {
        posts: [],
    },
    render: (args) => (
        <div className="w-[600px]">
            <PostList {...args} />
        </div>
    ),
}

export const ManyPosts: Story = {
    args: {
        posts: Array.from({ length: 10 }, (_, i) => createMockPost(i + 1)),
    },
    render: (args) => (
        <div className="w-[600px]">
            <PostList {...args} />
        </div>
    ),
}
