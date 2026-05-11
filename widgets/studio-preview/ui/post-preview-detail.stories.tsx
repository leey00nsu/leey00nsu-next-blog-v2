import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import { PostPreviewDetail } from '@/widgets/studio-preview/ui/post-preview-detail'
import koMessages from '@/messages/ko.json'

const meta: Meta<typeof PostPreviewDetail> = {
  title: 'widgets/studio-preview/PostPreviewDetail',
  component: PostPreviewDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <div className="w-[760px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PostPreviewDetail>

export const Default: Story = {
  args: {
    post: {
      title: '스튜디오 미리보기 게시글',
      description: '저장 전 게시글이 실제 본문 레이아웃으로 보이는지 확인합니다.',
      writer: 'leey00nsu',
      date: '2025-01-15',
      tags: ['Studio', 'MDX', 'Preview'],
      content: `
## 미리보기

스튜디오에서 작성 중인 글은 저장 전에도 실제 게시글과 비슷한 형태로 확인할 수 있어야 합니다.

## 체크 포인트

- 경고 배너가 상단에 표시됩니다.
- 제목과 태그가 본문 위에 배치됩니다.
- MDX 본문이 렌더링됩니다.
`,
    },
  },
}

export const EmptyTitle: Story = {
  args: {
    post: {
      title: '',
      description: '',
      writer: '',
      date: '',
      tags: [],
      content: '',
    },
  },
}
