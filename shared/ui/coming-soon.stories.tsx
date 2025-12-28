import type { Meta, StoryObj } from '@storybook/react'
import { ComingSoon } from './coming-soon'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
    about: {
        comingSoon: 'Coming Soon',
    },
}

const meta: Meta<typeof ComingSoon> = {
    title: 'shared/ComingSoon',
    component: ComingSoon,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
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
type Story = StoryObj<typeof ComingSoon>

export const Default: Story = {
    args: {},
}
