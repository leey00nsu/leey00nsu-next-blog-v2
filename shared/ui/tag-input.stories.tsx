import type { Meta, StoryObj } from '@storybook/react'
import { TagInput } from './tag-input'
import { useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
    tagInput: {
        placeholder: 'Add a tag...',
        remove: 'Remove {tag}',
    },
}

function TagInputDemo({
    initialTags = [],
    suggestions = [],
}: {
    initialTags?: string[]
    suggestions?: string[]
}) {
    const [tags, setTags] = useState<string[]>(initialTags)
    return (
        <NextIntlClientProvider locale="en" messages={messages}>
            <TagInput
                value={tags}
                onChange={setTags}
                suggestions={suggestions}
                placeholder="Add a tag..."
            />
        </NextIntlClientProvider>
    )
}

const meta: Meta<typeof TagInput> = {
    title: 'shared/TagInput',
    component: TagInput,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof TagInput>

export const Default: Story = {
    render: () => <TagInputDemo />,
}

export const WithInitialTags: Story = {
    render: () => <TagInputDemo initialTags={['React', 'TypeScript', 'Next.js']} />,
}

export const WithSuggestions: Story = {
    render: () => (
        <TagInputDemo
            initialTags={['React']}
            suggestions={['TypeScript', 'JavaScript', 'Next.js', 'Tailwind', 'CSS']}
        />
    ),
}
