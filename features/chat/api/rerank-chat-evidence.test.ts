import { afterEach, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import { rerankChatEvidence } from '@/features/chat/api/rerank-chat-evidence'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: (value: unknown) => value },
}))
vi.mock('@/features/chat/config/chat-models', () => ({
  getBlogChatRerankModel: () => 'test-model',
}))
afterEach(() => vi.unstubAllEnvs())

it('수집된 후보의 끝에 있는 근거도 모델에 전달하고 선택할 수 있다', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  const matches: ChatEvidenceRecord[] = Array.from({ length: 20 }, (_, index) => ({
    id: `candidate-${index}`,
    locale: 'ko',
    slug: `document-${index}`,
    title: `Document ${index}`,
    url: `/ko/blog/document-${index}`,
    excerpt: '설명',
    content: `본문 ${index}`,
    sectionTitle: null,
    tags: [],
    searchTerms: [],
    sourceCategory: 'blog',
  }))
  const lastMatch = matches.at(-1)!
  vi.mocked(generateText).mockResolvedValue({
    output: { rankedEvidenceIds: [lastMatch.id] },
  } as Awaited<ReturnType<typeof generateText>>)
  const result = await rerankChatEvidence({ question: '문서 찾기', matches })
  const prompt = vi.mocked(generateText).mock.calls[0][0].prompt
  for (const match of matches) expect(prompt).toContain(`id=${match.id}\n`)
  expect(result.matches[0].id).toBe(lastMatch.id)
  expect(result.applied).toBe(true)
})
