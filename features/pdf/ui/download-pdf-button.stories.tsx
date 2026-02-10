import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'sonner'
import { PDF } from '@/shared/config/constants'
import { DownloadPdfButton } from '@/features/pdf/ui/download-pdf-button'

const messages = {
  pdf: {
    downloadResume: 'Download Resume PDF',
    downloadPortfolio: 'Download Portfolio PDF',
    loading: 'Preparing...',
    successResume: 'Your resume PDF download has started.',
    successPortfolio: 'Your portfolio PDF download has started.',
    errorResume: 'Unable to generate resume PDF.',
    errorPortfolio: 'Unable to generate portfolio PDF.',
  },
}

const meta: Meta<typeof DownloadPdfButton> = {
  title: 'features/DownloadPdfButton',
  component: DownloadPdfButton,
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
type Story = StoryObj<typeof DownloadPdfButton>

export const ResumeKorean: Story = {
  args: {
    locale: 'ko',
    documentKind: PDF.DOCUMENT_KIND.RESUME,
  },
}

export const PortfolioEnglish: Story = {
  args: {
    locale: 'en',
    documentKind: PDF.DOCUMENT_KIND.PORTFOLIO,
  },
}
