import type { Meta, StoryObj } from '@storybook/react'
import { RightSidebar } from './right-sidebar'
import { TocProvider } from '@/features/post/model/toc-context'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
    post: {
        toc: {
            title: 'Table of Contents',
        },
    },
}

const meta: Meta<typeof RightSidebar> = {
    title: 'widgets/RightSidebar',
    component: RightSidebar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: '/blog',
            },
        },
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="en" messages={messages}>
                <TocProvider>
                    <div className="flex h-screen">
                        <div className="flex-1 bg-muted p-4">
                            <p>Main content area</p>
                        </div>
                        <Story />
                    </div>
                </TocProvider>
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof RightSidebar>

export const Default: Story = {
    render: () => <RightSidebar />,
}
