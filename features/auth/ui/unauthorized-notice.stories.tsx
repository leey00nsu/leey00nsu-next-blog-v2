import type { Meta, StoryObj } from '@storybook/react'
import { UnauthorizedNotice } from './unauthorized-notice'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
    auth: {
        unauthorized: {
            message: 'You are not authorized to access this page.',
            backToHome: 'Back to Home',
        },
    },
}

const meta: Meta<typeof UnauthorizedNotice> = {
    title: 'features/UnauthorizedNotice',
    component: UnauthorizedNotice,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="en" messages={messages}>
                <Story />
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof UnauthorizedNotice>

export const Default: Story = {
    args: {},
}
