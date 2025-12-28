import type { Meta, StoryObj } from '@storybook/react'
import { ShareButton } from './share-button'
import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'sonner'

const messages = {
    post: {
        share: {
            copied: 'Link copied to clipboard!',
        },
    },
}

const meta: Meta<typeof ShareButton> = {
    title: 'features/ShareButton',
    component: ShareButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="en" messages={messages}>
                <Story />
                <Toaster />
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof ShareButton>

export const Default: Story = {
    args: {},
}
