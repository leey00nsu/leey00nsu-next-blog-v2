import type { Meta, StoryObj } from '@storybook/react'
import { Footer } from './footer'

const meta: Meta<typeof Footer> = {
    title: 'widgets/Footer',
    component: Footer,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
}

export default meta
type Story = StoryObj<typeof Footer>

export const Default: Story = {
    render: () => (
        <div className="flex min-h-[200px] flex-col justify-end">
            <Footer />
        </div>
    ),
}
