import type { Meta, StoryObj } from '@storybook/react'
import { ThemeToggle } from './theme-toggle'

const meta: Meta<typeof ThemeToggle> = {
    title: 'shared/ThemeToggle',
    component: ThemeToggle,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Default: Story = {
    args: {},
}

export const WithClassName: Story = {
    args: {
        className: 'rounded-full',
    },
}
