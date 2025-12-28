import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
    title: 'Shared/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
        disabled: {
            control: 'boolean',
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        children: '버튼',
        variant: 'default',
    },
}

export const Destructive: Story = {
    args: {
        children: '삭제',
        variant: 'destructive',
    },
}

export const Outline: Story = {
    args: {
        children: '아웃라인',
        variant: 'outline',
    },
}

export const Secondary: Story = {
    args: {
        children: '보조',
        variant: 'secondary',
    },
}

export const Ghost: Story = {
    args: {
        children: '고스트',
        variant: 'ghost',
    },
}

export const Link: Story = {
    args: {
        children: '링크',
        variant: 'link',
    },
}

export const Small: Story = {
    args: {
        children: '작은 버튼',
        size: 'sm',
    },
}

export const Large: Story = {
    args: {
        children: '큰 버튼',
        size: 'lg',
    },
}

export const Disabled: Story = {
    args: {
        children: '비활성화',
        disabled: true,
    },
}

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
                다음
            </>
        ),
    },
}
