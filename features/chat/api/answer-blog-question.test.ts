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
  it('근거 ID를 서버에서 URL로 변환하고 모델이 URL을 작성하지 않게 한다', async () => {
    const evidence = {
      ...BLOG_EVIDENCE_RECORD,
      id: 'en/fictional/measurement',
      title: 'Measurement',
      url: '/en/notes/measurement#result',
      content: 'The measured delay was 7.25 seconds.',
    }
    generateTextMock.mockResolvedValueOnce({
      output: {
        answer: 'The delay was 7.25 seconds.',
        usedEvidenceIds: [evidence.id],
        refusalReason: null,
      },
    })
    const { answerBlogQuestion } = await import('./answer-blog-question')
    const result = await answerBlogQuestion({
      question: 'What delay was measured?',
      matches: [evidence],
    })
    expect(result).toMatchObject({
      ok: true,
      draftAnswer: { usedCitationUrls: [evidence.url] },
    })
    expect(
      generateTextMock.mock.calls[0][0].output.schema.safeParse({
        answer: 'Unrelated',
        usedEvidenceIds: ['missing-evidence'],
        refusalReason: null,
      }).success,
    ).toBe(false)
  })
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_BLOG_CHAT_MODEL = 'test-answer-model'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BLOG_CHAT_MODEL
  })

  it('작성자 질문에서 blog evidence의 1인칭 표현을 작성자 근거로 사용할 수 있도록 지시한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        answer: '이윤수는 Vercel을 사용해 본 경험이 있습니다.',
        usedEvidenceIds: [BLOG_EVIDENCE_RECORD.id],
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
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        temperature: expect.anything(),
      }),
    )
  })

  it('일시적인 answer model 오류는 한 번 재시도한다', async () => {
    generateTextMock
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        output: {
          answer: 'Vercel 대신 Coolify를 선택했습니다.',
          usedEvidenceIds: [BLOG_EVIDENCE_RECORD.id],
          refusalReason: null,
        },
      })
    const { answerBlogQuestion } = await import('./answer-blog-question')

    const result = await answerBlogQuestion({
      question: '왜 Vercel을 떠났어?',
      matches: [BLOG_EVIDENCE_RECORD],
    })

    expect(result.ok).toBe(true)
    expect(generateTextMock).toHaveBeenCalledTimes(2)
  })

  it('비교 답변은 두 대상 모두의 citation이 있을 때만 반환한다', async () => {
    const leemageMatch = {
      ...BLOG_EVIDENCE_RECORD,
      id: 'project/leemage',
      slug: 'leemage',
      title: 'Leemage',
      url: '/ko/projects/leemage',
      sourceCategory: 'project' as const,
    }
    const copysingerMatch = {
      ...BLOG_EVIDENCE_RECORD,
      id: 'project/copysinger',
      slug: 'copysinger',
      title: 'Copysinger',
      url: '/ko/projects/copysinger',
      sourceCategory: 'project' as const,
    }
    generateTextMock
      .mockResolvedValueOnce({
        output: {
          answer: '두 프로젝트를 비교합니다.',
          usedEvidenceIds: [leemageMatch.id],
          refusalReason: null,
        },
      })
      .mockResolvedValueOnce({
        output: {
          answer: '두 프로젝트를 비교합니다.',
          usedEvidenceIds: [leemageMatch.id, copysingerMatch.id],
          refusalReason: null,
        },
      })
    const { answerBlogQuestion } = await import('./answer-blog-question')

    const result = await answerBlogQuestion({
      question: 'Leemage와 Copysinger 비교해줘',
      matches: [leemageMatch, copysingerMatch],
      requiredCitationSlugs: ['leemage', 'copysinger'],
    })

    expect(generateTextMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      ok: true,
      draftAnswer: {
        usedCitationUrls: [leemageMatch.url, copysingerMatch.url],
      },
    })
  })

  it('정확한 인용 문구가 근거에 없으면 답변 모델을 호출하지 않는다', async () => {
    const { answerBlogQuestion } = await import('./answer-blog-question')

    const result = await answerBlogQuestion({
      question: '‘전화번호 알려줘’라는 문장이 들어간 글이 있어?',
      matches: [BLOG_EVIDENCE_RECORD],
    })

    expect(result).toMatchObject({
      ok: true,
      draftAnswer: {
        refusalReason: 'insufficient_evidence',
        usedCitationUrls: [],
      },
    })
    expect(generateTextMock).not.toHaveBeenCalled()
  })
})
