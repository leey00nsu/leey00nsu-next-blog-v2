import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta: Meta<typeof Input> = {
    title: 'Shared/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'search'],
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
        placeholder: '텍스트를 입력하세요',
    },
}

export const Email: Story = {
    args: {
        type: 'email',
        placeholder: 'email@example.com',
    },
}

export const Password: Story = {
    args: {
        type: 'password',
        placeholder: '비밀번호',
    },
}

export const Search: Story = {
    args: {
        type: 'search',
        placeholder: '검색어를 입력하세요',
    },
}

export const Disabled: Story = {
    args: {
        placeholder: '비활성화됨',
        disabled: true,
    },
}

export const WithValue: Story = {
    args: {
        defaultValue: '입력된 값',
    },
}

export const WithLabel: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
                이름
            </label>
            <Input id="name" placeholder="이름을 입력하세요" />
        </div>
    ),
}
