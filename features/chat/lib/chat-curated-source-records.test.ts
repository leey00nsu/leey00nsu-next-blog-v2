import { describe, expect, it } from 'vitest'
import { buildCuratedChatSourceRecords } from '@/features/chat/lib/chat-curated-source-records'

describe('buildCuratedChatSourceRecords', () => {
  it('intro와 heading section을 개별 evidence record로 분리한다', () => {
    const records = buildCuratedChatSourceRecords({
      idPrefix: 'ko/project/example',
      locale: 'ko',
      slug: 'example',
      title: 'Example',
      baseUrl: '/ko/projects/example',
      introContent: '예시 프로젝트 요약',
      markdownContent: [
        '프로젝트 시작 설명입니다.',
        '',
        '## 핵심 기능',
        '',
        '- 검색',
        '- 업로드',
        '',
        '## 기술 스택',
        '',
        '- Next.js',
        '- TypeScript',
      ].join('\n'),
      tags: ['project', 'next.js'],
      baseSearchPhrases: ['example', '예시 프로젝트'],
      sourceCategory: 'project',
    })

    expect(records).toHaveLength(3)
    expect(records[0]).toMatchObject({
      id: 'ko/project/example',
      url: '/ko/projects/example',
      sectionTitle: null,
      sourceCategory: 'project',
    })
    expect(records[1]).toMatchObject({
      id: 'ko/project/example/핵심-기능',
      url: '/ko/projects/example#핵심-기능',
      sectionTitle: '핵심 기능',
    })
    expect(records[2]).toMatchObject({
      id: 'ko/project/example/기술-스택',
      url: '/ko/projects/example#기술-스택',
      sectionTitle: '기술 스택',
    })
    expect(records[0]?.searchTerms).toEqual(
      expect.arrayContaining(['example', '예시 프로젝트']),
    )
  })
})
