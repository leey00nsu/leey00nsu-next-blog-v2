import type { Meta, StoryObj } from '@storybook/react'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

const meta: Meta<typeof Avatar> = {
    title: 'shared/Avatar',
    component: Avatar,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    ),
}

export const WithFallback: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="/broken-image.jpg" alt="User" />
            <AvatarFallback>AB</AvatarFallback>
        </Avatar>
    ),
}

export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar className="size-6">
                <AvatarImage src="https://github.com/shadcn.png" alt="Small" />
                <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <Avatar className="size-8">
                <AvatarImage src="https://github.com/shadcn.png" alt="Default" />
                <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar className="size-12">
                <AvatarImage src="https://github.com/shadcn.png" alt="Large" />
                <AvatarFallback>LG</AvatarFallback>
            </Avatar>
            <Avatar className="size-16">
                <AvatarImage src="https://github.com/shadcn.png" alt="XLarge" />
                <AvatarFallback>XL</AvatarFallback>
            </Avatar>
        </div>
    ),
}
