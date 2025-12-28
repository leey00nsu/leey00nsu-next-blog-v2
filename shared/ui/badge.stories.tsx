import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
    title: 'Shared/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'secondary', 'destructive', 'outline'],
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        children: '기본',
        variant: 'default',
    },
}

export const Secondary: Story = {
    args: {
        children: '보조',
        variant: 'secondary',
    },
}

export const Destructive: Story = {
    args: {
        children: '위험',
        variant: 'destructive',
    },
}

export const Outline: Story = {
    args: {
        children: '아웃라인',
        variant: 'outline',
    },
}

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                태그
            </>
        ),
    },
}

export const TagList: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge>React</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="outline">Next.js</Badge>
            <Badge variant="destructive">Deprecated</Badge>
        </div>
    ),
}
