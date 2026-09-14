import { describe, expect, it } from 'vitest'
import { buildCuratedChatSourceRecords } from '@/features/chat/lib/chat-curated-source-records'

describe('buildCuratedChatSourceRecords', () => {
  it.each(['ko', 'en'] as const)(
    '%s 긴 설명과 무관하게 공개 메타데이터를 독립된 인용 근거로 보존한다',
    (locale) => {
      const metadataContent = [
        'Atlas',
        'GitHub: https://github.com/example/atlas',
        'Demo: https://atlas.example.com/',
        'npm: https://www.npmjs.com/package/atlas',
      ].join('\n')
      const records = buildCuratedChatSourceRecords({
        idPrefix: `${locale}/project/atlas`,
        locale,
        slug: 'atlas',
        title: 'Atlas',
        baseUrl: `/${locale}/projects/atlas`,
        introContent: 'A long project description. '.repeat(100),
        metadataContent,
        markdownContent: '## Architecture\nImplementation details.',
        tags: ['project'],
        baseSearchPhrases: ['Atlas'],
        sourceCategory: 'project',
      })
      expect(
        records.find((record) => record.id.endsWith('/metadata')),
      ).toMatchObject({
        content: metadataContent,
        url: `/${locale}/projects/atlas`,
        sourceCategory: 'project',
      })
      expect(new Set(records.map((record) => record.id)).size).toBe(
        records.length,
      )
    },
  )

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
      evidenceTime: {
        kind: 'project_ended',
        value: '2026-04-01T00:00:00.000Z',
      },
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
    expect(
      records.every((record) => {
        return (
          record.evidenceTime?.kind === 'project_ended' &&
          record.evidenceTime.value === '2026-04-01T00:00:00.000Z' &&
          record.publishedAt === undefined
        )
      }),
    ).toBe(true)
  })
})
