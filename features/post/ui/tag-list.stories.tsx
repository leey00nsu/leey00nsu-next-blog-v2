import type { Meta, StoryObj } from '@storybook/react'
import { TagList } from './tag-list'

const meta: Meta<typeof TagList> = {
    title: 'features/TagList',
    component: TagList,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof TagList>

export const Default: Story = {
    args: {
        tags: ['React', 'TypeScript', 'Next.js', 'Tailwind'],
    },
}

export const WithCounts: Story = {
    args: {
        tags: ['React', 'TypeScript', 'Next.js'],
        counts: {
            React: 15,
            TypeScript: 8,
            'Next.js': 12,
        },
    },
}

export const WithSelectedTags: Story = {
    args: {
        tags: ['React', 'TypeScript', 'Next.js', 'Tailwind'],
        selectedTags: ['React', 'Next.js'],
    },
}

export const WithLinks: Story = {
    args: {
        tags: ['React', 'TypeScript', 'Next.js'],
        hrefBuilder: (tag) => `/blog?tag=${tag}`,
    },
}

export const Empty: Story = {
    args: {
        tags: [],
    },
}

export const SingleTag: Story = {
    args: {
        tags: ['React'],
    },
}
