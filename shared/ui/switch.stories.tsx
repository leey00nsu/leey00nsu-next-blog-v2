import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './switch'
import { Label } from './label'

const meta: Meta<typeof Switch> = {
    title: 'shared/Switch',
    component: Switch,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof Switch>

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
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
    ),
}
