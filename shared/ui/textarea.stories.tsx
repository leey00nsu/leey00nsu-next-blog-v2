import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './textarea'
import { Label } from './label'

const meta: Meta<typeof Textarea> = {
    title: 'shared/Textarea',
    component: Textarea,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Default: Story = {
    args: {
        placeholder: 'Type your message here.',
    },
    render: (args) => <Textarea {...args} className="w-[300px]" />,
}

export const Disabled: Story = {
    args: {
        placeholder: 'Disabled textarea',
        disabled: true,
    },
    render: (args) => <Textarea {...args} className="w-[300px]" />,
}

export const WithLabel: Story = {
    render: () => (
        <div className="grid w-[300px] gap-1.5">
            <Label htmlFor="message">Your message</Label>
            <Textarea placeholder="Type your message here." id="message" />
        </div>
    ),
}

export const WithText: Story = {
    render: () => (
        <div className="grid w-[300px] gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea placeholder="Tell us about yourself" id="bio" />
            <p className="text-muted-foreground text-sm">
                Your bio will be visible to other users.
            </p>
        </div>
    ),
}
