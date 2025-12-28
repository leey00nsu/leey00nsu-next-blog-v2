import type { Meta, StoryObj } from '@storybook/react'
import { Toc } from './toc'
import { NextIntlClientProvider } from 'next-intl'
import type { TocHeading } from '@/shared/lib/toc'

const messages = {
    post: {
        toc: {
            title: 'Table of Contents',
        },
    },
}

const mockHeadings: TocHeading[] = [
    { depth: 2, text: 'Introduction', slug: 'introduction' },
    { depth: 2, text: 'Getting Started', slug: 'getting-started' },
    { depth: 3, text: 'Installation', slug: 'installation' },
    { depth: 3, text: 'Configuration', slug: 'configuration' },
    { depth: 2, text: 'Usage', slug: 'usage' },
    { depth: 3, text: 'Basic Example', slug: 'basic-example' },
    { depth: 3, text: 'Advanced Example', slug: 'advanced-example' },
    { depth: 2, text: 'API Reference', slug: 'api-reference' },
    { depth: 2, text: 'Conclusion', slug: 'conclusion' },
]

const meta: Meta<typeof Toc> = {
    title: 'features/Toc',
    component: Toc,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="en" messages={messages}>
                <div className="w-[250px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof Toc>

export const Default: Story = {
    args: {
        headings: mockHeadings,
    },
}

export const ShallowHeadings: Story = {
    args: {
        headings: [
            { depth: 2, text: 'Section 1', slug: 'section-1' },
            { depth: 2, text: 'Section 2', slug: 'section-2' },
            { depth: 2, text: 'Section 3', slug: 'section-3' },
        ],
    },
}

export const DeepNesting: Story = {
    args: {
        headings: [
            { depth: 2, text: 'Chapter 1', slug: 'chapter-1' },
            { depth: 3, text: 'Section 1.1', slug: 'section-1-1' },
            { depth: 4, text: 'Subsection 1.1.1', slug: 'subsection-1-1-1' },
            { depth: 4, text: 'Subsection 1.1.2', slug: 'subsection-1-1-2' },
            { depth: 3, text: 'Section 1.2', slug: 'section-1-2' },
            { depth: 2, text: 'Chapter 2', slug: 'chapter-2' },
        ],
    },
}

export const Empty: Story = {
    args: {
        headings: [],
    },
}

export const SingleHeading: Story = {
    args: {
        headings: [{ depth: 2, text: 'Only Section', slug: 'only-section' }],
    },
}
