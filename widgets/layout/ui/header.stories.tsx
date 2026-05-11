import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { Header } from '@/widgets/layout/ui/header'
import koMessages from '@/messages/ko.json'
import enMessages from '@/messages/en.json'

const meta: Meta<typeof Header> = {
  title: 'widgets/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Korean: Story = {
  args: {
    locale: 'ko',
  },
  render: (args) => (
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      <Header {...args} />
    </NextIntlClientProvider>
  ),
}

export const English: Story = {
  args: {
    locale: 'en',
  },
  render: (args) => (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <Header {...args} />
    </NextIntlClientProvider>
  ),
}

