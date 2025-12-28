import type { Meta, StoryObj } from '@storybook/react'
import { Logo } from './logo'

const meta: Meta<typeof Logo> = {
    title: 'shared/Logo',
    component: Logo,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        nextjs: {
            appDirectory: true,
        },
    },
}

export default meta
type Story = StoryObj<typeof Logo>

export const Default: Story = {
    args: {},
}

export const CustomHref: Story = {
    args: {
        href: '/',
    },
}

export const WithClassName: Story = {
    args: {
        className: 'opacity-50',
    },
}
