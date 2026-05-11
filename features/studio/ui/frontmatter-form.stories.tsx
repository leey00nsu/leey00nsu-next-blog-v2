import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import koMessages from '@/messages/ko.json'

const meta: Meta<typeof FrontmatterForm> = {
  title: 'features/FrontmatterForm',
  component: FrontmatterForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <div className="w-[720px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof FrontmatterForm>

export const Default: Story = {
  args: {
    initial: {
      slug: 'sample-post',
      title: '샘플 게시글',
      description: 'Storybook에서 frontmatter 입력 폼을 확인하기 위한 예시입니다.',
      writer: 'leey00nsu',
      section: 'blog',
      series: '',
      date: '2026-05-11',
      thumbnail: null,
      draft: false,
      tags: ['Next.js', 'Storybook'],
    },
    suggestionTags: ['Next.js', 'React', 'Storybook', 'AI'],
  },
}

export const WithThumbnailChoices: Story = {
  args: {
    initial: {
      slug: 'sample-post',
      title: '썸네일이 있는 게시글',
      description: '본문 이미지 중 하나를 썸네일로 선택하는 상태입니다.',
      writer: 'leey00nsu',
      section: 'blog',
      series: '',
      date: '2026-05-11',
      thumbnail: '/public/logo.webp',
      draft: false,
      tags: ['Studio'],
    },
    thumbnailChoices: [
      {
        path: '/public/logo.webp',
        previewUrl: '/logo.webp',
      },
    ],
    suggestionTags: ['Studio', 'MDX', 'Editor'],
  },
}

