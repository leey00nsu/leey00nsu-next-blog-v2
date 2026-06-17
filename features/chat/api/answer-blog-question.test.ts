import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const generateTextMock = vi.fn()

vi.mock('ai', () => {
  return {
    generateText: generateTextMock,
    Output: {
      object: ({ schema }: { schema: unknown }) => ({ schema }),
    },
  }
})

vi.mock('@ai-sdk/openai', () => {
  return {
    openai: vi.fn(() => 'mock-openai-model'),
  }
})

const BLOG_EVIDENCE_RECORD: ChatEvidenceRecord = {
  id: 'ko/blog/vercel/intro',
  locale: 'ko',
  slug: 'why-i-do-not-use-vercel-anymore',
  title: '내가 더 이상 Vercel 호스팅을 사용하지 않는 이유',
  url: '/ko/blog/why-i-do-not-use-vercel-anymore',
  excerpt: 'Vercel에서 Coolify로 옮긴 이야기',
  content:
    '정적 페이지나 Next.js의 경우에는 Vercel을 통해 배포를 하기도 하였습니다.',
  sectionTitle: null,
  tags: ['vercel', 'coolify'],
  sourceCategory: 'blog',
}

describe('answerBlogQuestion', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('작성자 질문에서 blog evidence의 1인칭 표현을 작성자 근거로 사용할 수 있도록 지시한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        answer: '이윤수는 Vercel을 사용해 본 경험이 있습니다.',
        usedCitationUrls: ['/ko/blog/why-i-do-not-use-vercel-anymore'],
        refusalReason: null,
      },
    })

    const { answerBlogQuestion } = await import('./answer-blog-question')

    await answerBlogQuestion({
      question: '이윤수가 Vercel을 써봤는지',
      matches: [BLOG_EVIDENCE_RECORD],
    })

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          'First-person statements in blog evidence describe the blog author.',
        ),
      }),
    )
  })
})
