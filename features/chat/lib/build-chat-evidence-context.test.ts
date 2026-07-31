import { describe, expect, it } from 'vitest'
import { buildChatEvidenceContext } from '@/features/chat/lib/build-chat-evidence-context'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

function buildEvidenceRecord(
  identifier: string,
  content: string,
): ChatEvidenceRecord {
  return {
    id: `ko/blog/${identifier}`,
    locale: 'ko',
    slug: identifier,
    title: identifier,
    url: `/ko/blog/${identifier}`,
    excerpt: `${identifier} excerpt`,
    content,
    sectionTitle: null,
    tags: [],
    searchTerms: [],
    sourceCategory: 'blog',
  }
}

describe('buildChatEvidenceContext', () => {
  it('앞선 긴 근거가 있어도 뒤의 핵심 근거를 컨텍스트에 포함한다', () => {
    const context = buildChatEvidenceContext({
      matches: [
        buildEvidenceRecord('first', '첫 번째 근거'.repeat(300)),
        buildEvidenceRecord('second', '두 번째 근거'.repeat(400)),
        {
          ...buildEvidenceRecord(
            'assistant-profile',
            '저는 이윤수 님의 챗봇입니다.',
          ),
          id: 'ko/assistant/assistant-profile',
          title: '블로그 챗봇 안내',
          url: '/ko/about',
          sourceCategory: 'assistant',
        },
      ],
      maximumRecordCount: 3,
      maximumCharacters: 2400,
    })

    expect(context).toContain('저는 이윤수 님의 챗봇입니다.')
    expect(context.length).toBeLessThanOrEqual(2400)
  })
})
