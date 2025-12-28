import type { Meta, StoryObj } from '@storybook/react'
import { DownloadResumeButton } from './download-resume-button'
import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'sonner'

const messages = {
    pdf: {
        download: 'Download PDF',
        loading: 'Generating...',
        success: 'PDF downloaded successfully!',
        error: 'Failed to generate PDF',
    },
}

const meta: Meta<typeof DownloadResumeButton> = {
    title: 'features/DownloadResumeButton',
    component: DownloadResumeButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <NextIntlClientProvider locale="en" messages={messages}>
                <Story />
                <Toaster />
            </NextIntlClientProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof DownloadResumeButton>

export const Korean: Story = {
    args: {
        locale: 'ko',
    },
}

export const English: Story = {
    args: {
        locale: 'en',
    },
}
