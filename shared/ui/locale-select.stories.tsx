import type { Meta, StoryObj } from '@storybook/react'
import { LocaleSelect } from './locale-select'
import { NextIntlClientProvider } from 'next-intl'

const messages = {}

const meta: Meta<typeof LocaleSelect> = {
    title: 'shared/LocaleSelect',
    component: LocaleSelect,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: '/blog',
            },
        },
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="ko" messages={messages}>
                <Story />
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof LocaleSelect>

export const Default: Story = {
    args: {},
}

export const WithClassName: Story = {
    args: {
        className: 'rounded-full',
    },
}
