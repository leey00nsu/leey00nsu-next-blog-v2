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

  it('긴 문서에서는 질문과 관련된 뒤쪽 문장을 우선 포함한다', () => {
    const context = buildChatEvidenceContext({
      question: 'Vercel을 더 이상 사용하지 않는 이유는?',
      matches: [
        buildEvidenceRecord(
          'vercel',
          [
            '기존 배포 구조를 설명합니다.',
            '일반적인 호스팅의 장점을 설명합니다.',
            '관련 없는 배경입니다.'.repeat(100),
            'Vercel은 높은 트래픽과 고급 기능의 비용을 고려해야 했습니다.',
            '컨테이너 기반 프로젝트를 함께 운영하려고 셀프 호스팅으로 옮겼습니다.',
          ].join(' '),
        ),
      ],
      maximumRecordCount: 1,
      maximumCharacters: 500,
    })

    expect(context).toContain('Vercel은 높은 트래픽')
    expect(context.length).toBeLessThanOrEqual(500)
  })
})
