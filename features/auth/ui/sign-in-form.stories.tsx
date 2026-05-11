import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { SignInForm } from '@/features/auth/ui/sign-in-form'
import koMessages from '@/messages/ko.json'

const meta: Meta<typeof SignInForm> = {
  title: 'features/SignInForm',
  component: SignInForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SignInForm>

export const Default: Story = {
  args: {
    allowedUsername: 'leey00nsu',
    callbackUrl: '/ko/studio',
  },
}

export const EmptyAllowedUser: Story = {
  args: {
    allowedUsername: '',
    callbackUrl: '/ko/studio',
  },
}

