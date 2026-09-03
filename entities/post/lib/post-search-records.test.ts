import { describe, expect, it } from 'vitest'
import { buildPostSearchRecords } from './post-search-records'
import { POST_SEARCH } from '@/entities/post/config/constants'
import type { Post } from '@/entities/post/model/types'

const LONG_SECTION_SENTENCE_COUNT = 120

function createMockPost(content: string): Post {
  return {
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    description: '서버 상태 관리 정리',
    date: new Date('2024-01-01T00:00:00.000Z'),
    writer: 'leey00nsu',
    tags: ['react-query', 'tanstack-query'],
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content,
    width: 0,
    height: 0,
    isAnimated: false,
  }
}

describe('buildPostSearchRecords', () => {
  it('서론과 각 섹션을 분리해 anchor URL을 생성한다', () => {
    const post = createMockPost(`
도입부 문단입니다.

## React Query가 필요한 이유
서버 상태를 캐시하고 동기화합니다.

### staleTime 설정
불필요한 재요청을 줄입니다.
`)

    const result = buildPostSearchRecords({
      post,
      locale: 'ko',
    })

    expect(result).toHaveLength(3)
    expect(result[0].url).toBe('/ko/blog/react-query-guide')
    expect(result[0].sectionTitle).toBeNull()
    expect(result[1].url).toBe(
      '/ko/blog/react-query-guide#react-query가-필요한-이유',
    )
    expect(result[1].sectionTitle).toBe('React Query가 필요한 이유')
    expect(result[2].url).toBe('/ko/blog/react-query-guide#staletime-설정')
    expect(result[2].sectionTitle).toBe('staleTime 설정')
    expect(result[1].searchTerms).toEqual(
      expect.arrayContaining(['react query', 'tanstack query']),
    )
  })

  it('코드 펜스 안의 가짜 헤딩은 섹션으로 분리하지 않는다', () => {
    const post = createMockPost(`
\`\`\`md
## 코드 블록 안의 제목
\`\`\`

## 실제 섹션
실제 본문
`)

    const result = buildPostSearchRecords({
      post,
      locale: 'ko',
    })

    expect(result).toHaveLength(1)
    expect(result[0].sectionTitle).toBe('실제 섹션')
  })

  it('긴 섹션을 겹치는 하위 청크로 나누고 뒷부분을 보존한다', () => {
    const finalEvidenceText = '마지막 근거 문장입니다.'
    const longSectionBody = [
      ...Array.from(
        { length: LONG_SECTION_SENTENCE_COUNT },
        (_unusedValue, sentenceIndex) => `${sentenceIndex}번째 설명입니다.`,
      ),
      finalEvidenceText,
    ].join(' ')
    const post = createMockPost(`
## 긴 섹션
${longSectionBody}
`)

    const result = buildPostSearchRecords({
      post,
      locale: 'ko',
    })

    expect(result.length).toBeGreaterThan(1)
    expect(
      result.every((record) => {
        return record.content.length <= POST_SEARCH.CONTENT_MAX_LENGTH
      }),
    ).toBe(true)
    expect(result.at(-1)?.content).toContain(finalEvidenceText)
    expect(new Set(result.map((record) => record.id)).size).toBe(result.length)
    expect(
      result.every((record) => {
        return record.url === '/ko/blog/react-query-guide#긴-섹션'
      }),
    ).toBe(true)
  })

  it('문장 경계 뒤에 일반 공백이 더 있어도 문장 끝에서 하위 chunk를 나눈다', () => {
    const leadingText = '앞부분 '.repeat(200)
    const sentenceEnding = '여기서 첫 문장이 끝납니다.'
    const trailingText = '후속단어 '.repeat(100)
    const post = createMockPost(`
## 문장 경계
${leadingText}${sentenceEnding} ${trailingText}
`)

    const result = buildPostSearchRecords({ post, locale: 'ko' })

    expect(result.length).toBeGreaterThan(1)
    expect(result[0]?.content.endsWith(sentenceEnding)).toBe(true)
  })

  it('intro와 heading 및 하위 chunk 사이에 record ID 충돌이 발생하지 않는다', () => {
    const longSectionBody = '긴 섹션 문장입니다. '.repeat(
      LONG_SECTION_SENTENCE_COUNT,
    )
    const post = createMockPost(`
소개 본문입니다.

## Intro
${longSectionBody}

## Intro Part 2
별도 제목의 본문입니다.
`)

    const result = buildPostSearchRecords({ post, locale: 'ko' })

    expect(new Set(result.map((record) => record.id)).size).toBe(result.length)
    expect(
      result.some((record) => {
        return record.url === '/ko/blog/react-query-guide#intro'
      }),
    ).toBe(true)
    expect(
      result.some((record) => {
        return record.url === '/ko/blog/react-query-guide#intro-part-2'
      }),
    ).toBe(true)
    expect(
      result.find((record) => {
        return record.sectionTitle === 'Intro Part 2'
      })?.id,
    ).toBe('ko/react-query-guide/intro-part-2')
  })
})
