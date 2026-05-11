import type { Meta, StoryObj } from '@storybook/react'
import { NextIntlClientProvider } from 'next-intl'
import type { Post } from '@/entities/post/model/types'
import { TocProvider } from '@/features/post/model/toc-context'
import { PostDetailView } from '@/widgets/post/ui/post-detail-view'
import koMessages from '@/messages/ko.json'
import { ThemeProvider } from '@/shared/ui/theme-provider'
import { getTableOfContents } from '@/shared/lib/toc'

const POST: Post = {
  slug: 'storybook-post',
  title: 'Storybook에서 확인하는 게시글 상세',
  description:
    '게시글 상세 화면의 제목, 태그, 목차, 본문, 댓글 영역을 함께 확인하기 위한 샘플입니다.',
  date: new Date('2025-01-15T00:00:00.000Z'),
  writer: 'leey00nsu',
  tags: ['Next.js', 'MDX', 'Storybook'],
  section: 'blog',
  series: null,
  thumbnail: '/public/posts/building-ai-chat-for-my-blog/blog-chatbot-development-stages.webp',
  draft: false,
  content: `
## 시작하며

본문 렌더링은 MDX 콘텐츠, 태그, 모바일 목차가 함께 배치되는지 확인하는 것이 중요합니다.

## 코드 예시

\`\`\`tsx title="example.tsx"
export function Example() {
  return <p>Storybook</p>
}
\`\`\`

## 마무리

실제 게시글과 비슷한 길이의 콘텐츠를 넣어 레이아웃 흐름을 확인합니다.
`,
  width: 1200,
  height: 630,
}

const meta: Meta<typeof PostDetailView> = {
  title: 'widgets/post/PostDetail',
  component: PostDetailView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/ko/blog/storybook-post',
      },
    },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TocProvider>
            <div className="w-[760px]">
              <Story />
            </div>
          </TocProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PostDetailView>

export const Default: Story = {
  args: {
    post: POST,
    locale: 'ko',
    headings: getTableOfContents(POST.content),
    showComments: false,
  },
  render: (args) => (
    <PostDetailView {...args}>
      <h2 id="시작하며">시작하며</h2>
      <p>
        본문 렌더링은 MDX 콘텐츠, 태그, 모바일 목차가 함께 배치되는지
        확인하는 것이 중요합니다.
      </p>
      <h2 id="코드-예시">코드 예시</h2>
      <figure className="overflow-hidden rounded-lg bg-[#24292e]">
        <figcaption className="px-4 py-2 text-amber-50">
          example.tsx
        </figcaption>
        <pre className="m-0 overflow-x-auto px-4 py-3 text-sm text-amber-50">
          <code>{`export function Example() {
  return <p>Storybook</p>
}`}</code>
        </pre>
      </figure>
      <h2 id="마무리">마무리</h2>
      <p>실제 게시글과 비슷한 길이의 콘텐츠를 넣어 레이아웃 흐름을 확인합니다.</p>
    </PostDetailView>
  ),
}
