import type { Meta, StoryObj } from '@storybook/react'
import { LeftSidebar } from './left-sidebar'

const meta: Meta<typeof LeftSidebar> = {
    title: 'widgets/LeftSidebar',
    component: LeftSidebar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
}

export default meta
type Story = StoryObj<typeof LeftSidebar>

export const Default: Story = {
    render: () => (
        <div className="flex h-screen">
            <LeftSidebar />
            <div className="flex-1 bg-muted p-4">
                <p>Main content area</p>
            </div>
        </div>
    ),
}
