import type { Meta, StoryObj } from '@storybook/react'
import { PostCard } from './post-card'
import type { Post } from '@/entities/post/model/types'

const mockPost: Post = {
    slug: 'sample-post',
    title: 'Building a Modern Blog with Next.js',
    description:
        'Learn how to build a modern blog using Next.js, TypeScript, and Tailwind CSS. This guide covers everything from setup to deployment.',
    date: new Date('2024-01-15'),
    writer: 'leey00nsu',
    tags: ['react', 'typescript', 'nextjs'],
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content: '',
    width: 160,
    height: 160,
}

const meta: Meta<typeof PostCard> = {
    title: 'entities/PostCard',
    component: PostCard,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof PostCard>

export const Default: Story = {
    args: {
        post: mockPost,
    },
    render: (args) => (
        <div className="w-[500px]">
            <PostCard {...args} />
        </div>
    ),
}

export const WithThumbnail: Story = {
    args: {
        post: {
            ...mockPost,
            thumbnail: '/logo.png',
        },
    },
    render: (args) => (
        <div className="w-[500px]">
            <PostCard {...args} />
        </div>
    ),
}

export const LongDescription: Story = {
    args: {
        post: {
            ...mockPost,
            description:
                'This is a very long description that should be truncated after three lines. It contains a lot of text to demonstrate how the component handles overflow and text truncation in a graceful manner.',
        },
    },
    render: (args) => (
        <div className="w-[500px]">
            <PostCard {...args} />
        </div>
    ),
}

export const ShortTitle: Story = {
    args: {
        post: {
            ...mockPost,
            title: 'Short',
            description: 'A brief post.',
        },
    },
    render: (args) => (
        <div className="w-[500px]">
            <PostCard {...args} />
        </div>
    ),
}
