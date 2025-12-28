import type { Meta, StoryObj } from '@storybook/react'
import { DefaultThumbnail } from './default-thumbnail'
import type { Post } from '@/entities/post/model/types'

const mockPost: Post = {
    slug: 'sample-post',
    title: 'Sample Post Title',
    description: 'This is a sample post description',
    date: new Date('2024-01-01'),
    writer: 'Author',
    tags: ['react', 'typescript'],
    section: 'blog',
    locale: 'ko',
}

const meta: Meta<typeof DefaultThumbnail> = {
    title: 'entities/DefaultThumbnail',
    component: DefaultThumbnail,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof DefaultThumbnail>

export const Default: Story = {
    args: {
        post: mockPost,
    },
    render: (args) => (
        <div className="h-40 w-40">
            <DefaultThumbnail {...args} />
        </div>
    ),
}

export const LongTitle: Story = {
    args: {
        post: {
            ...mockPost,
            title: 'This is a very long post title that should wrap nicely',
        },
    },
    render: (args) => (
        <div className="h-40 w-40">
            <DefaultThumbnail {...args} />
        </div>
    ),
}

export const WithCustomClass: Story = {
    args: {
        post: mockPost,
        className: 'rounded-lg',
    },
    render: (args) => (
        <div className="h-40 w-40 overflow-hidden rounded-lg">
            <DefaultThumbnail {...args} />
        </div>
    ),
}
