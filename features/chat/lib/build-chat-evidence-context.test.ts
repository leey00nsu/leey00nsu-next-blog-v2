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
  it('예산 안의 근거는 질문 단어 빈도와 무관하게 전체 내용을 보존한다', () => {
    const content =
      '측정 결과는 다음과 같다.\n\n| 항목 | 값 |\n| --- | --- |\n| 지연 | 7.25 |\n\n제약 때문에 이전했다. 따라서 운영 부담이 줄었다.'
    const context = buildChatEvidenceContext({
      question: '측정 결과를 설명해줘',
      matches: [buildEvidenceRecord('measurement', content)],
      maximumRecordCount: 1,
      maximumCharacters: 2000,
    })
    expect(context).toContain(content)
  })
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

  it('예산보다 긴 표에서는 질문과 가까운 행을 남기고 머리글을 유지한다', () => {
    const tableRows = Array.from({ length: 40 }, (_, index) => {
      return `| 모델 ${index} | 짧은 입력 ${index}자 | ${index * 10}초 | 0.1${index} |`
    })
    const content = [
      '측정 조건을 설명합니다.',
      '| 모델 | 입력 | 응답 시간 | RTF |',
      '| --- | --- | --- | --- |',
      ...tableRows.slice(0, 38),
      '| Audio8 | 문단, 400자 | 101.32초 | 4.452 |',
      '| Supertonic | 문단, 400자 | 13.87초 | 0.452 |',
    ].join('\n')
    const context = buildChatEvidenceContext({
      question: '문단을 생성했을 때 응답 시간은 얼마였어?',
      matches: [buildEvidenceRecord('measurement', content)],
      maximumRecordCount: 1,
      maximumCharacters: 800,
    })

    expect(context).toContain('| 모델 | 입력 | 응답 시간 | RTF |')
    expect(context).toContain('| Supertonic | 문단, 400자 | 13.87초 | 0.452 |')
    expect(context).toContain('| Audio8 | 문단, 400자 | 101.32초 | 4.452 |')
    expect(context).toContain('| … |')
    expect(context.length).toBeLessThanOrEqual(800)
    for (const line of context.split('\n')) {
      if (line.startsWith('|') && line !== '| … |') {
        expect(line.endsWith('|')).toBe(true)
      }
    }
  })

  it('쓰지 않은 예산은 뒤 항목이 이어받아 균등 분배보다 많은 내용을 남긴다', () => {
    const context = buildChatEvidenceContext({
      question: '운영 비용을 어떻게 줄였어?',
      matches: [
        buildEvidenceRecord('short', '짧은 근거입니다.'),
        buildEvidenceRecord(
          'long',
          `운영 비용을 줄인 방법은 다음과 같습니다. ${'자세한 설명입니다. '.repeat(200)}`,
        ),
      ],
      maximumRecordCount: 2,
      maximumCharacters: 1200,
    })

    expect(context).toContain('짧은 근거입니다.')
    expect(context.length).toBeGreaterThan(1100)
    expect(context.length).toBeLessThanOrEqual(1200)
  })
})
