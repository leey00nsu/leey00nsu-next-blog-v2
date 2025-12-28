import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './checkbox'
import { Label } from './label'

const meta: Meta<typeof Checkbox> = {
    title: 'shared/Checkbox',
    component: Checkbox,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
    args: {},
}

export const Checked: Story = {
    args: {
        defaultChecked: true,
    },
}

export const Disabled: Story = {
    args: {
        disabled: true,
    },
}

export const DisabledChecked: Story = {
    args: {
        disabled: true,
        defaultChecked: true,
    },
}

export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    ),
}
