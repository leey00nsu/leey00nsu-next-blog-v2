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
  it.each([0, 1, 20, 180, 400, 900])(
    '메타데이터보다 작은 예산을 포함해 %i자 한도를 넘지 않는다',
    (maximumCharacters) => {
      const context = buildChatEvidenceContext({
        question: '자주빛 시료 보관 조건',
        matches: [
          buildEvidenceRecord(
            'storage',
            '자주빛 시료는 밀봉합니다. '.repeat(80),
          ),
          buildEvidenceRecord(
            'transport',
            '시료 보관 온도는 일정하게 유지합니다.',
          ),
        ],
        maximumRecordCount: 2,
        maximumCharacters,
      })
      expect(context.length).toBeLessThanOrEqual(maximumCharacters)
    },
  )

  it('반복되는 제품명과 긴 로그 사이에서도 별도 원인 구간을 보존한다', () => {
    const introduction = 'Nebula 장치는 Nebula 모듈로 Nebula 기록을 전송합니다.'
    const cause = '검증기 지원이 중단되어 대형 관측 기록의 검사가 실패했습니다.'
    const context = buildChatEvidenceContext({
      question: 'Nebula 장치의 검증기 지원 중단 문제는?',
      matches: [
        buildEvidenceRecord(
          'observatory',
          [
            introduction,
            '```text\n' + 'Nebula transport trace\n'.repeat(80) + '```',
            cause,
          ].join('\n\n'),
        ),
      ],
      maximumRecordCount: 1,
      maximumCharacters: 400,
    })

    expect(context).toContain(cause)
    expect(context).toContain(introduction)
    expect(context.indexOf(introduction)).toBeLessThan(context.indexOf(cause))
    expect(
      context.slice(context.indexOf(introduction), context.indexOf(cause)),
    ).toContain('…')
    expect(context.length).toBeLessThanOrEqual(400)
  })

  it('이름이 반복되는 앞부분보다 뒤쪽의 질문 조건을 보존한다', () => {
    const condition =
      '시료 보관은 길수록 좋지 않으며 건조한 용기에 6시간 이내로 제한합니다.'
    const context = buildChatEvidenceContext({
      question: 'Nebula 시료 보관은 길수록 좋은가?',
      matches: [
        buildEvidenceRecord(
          'specimen',
          [
            'Nebula 시료는 Nebula 장치로 Nebula 실험실에서 측정합니다.',
            '장치 설치와 전원 연결 절차를 설명합니다. '.repeat(80),
            condition,
          ].join('\n\n'),
        ),
      ],
      maximumRecordCount: 1,
      maximumCharacters: 350,
    })

    expect(context).toContain(condition)
    expect(context.length).toBeLessThanOrEqual(350)
  })

  it('단일 표의 뒤쪽 관련 행도 온전히 보존한다', () => {
    const targetRow = '| 자주빛 시료 | 37시간 |'
    const content = [
      '| 시료 | 보관 |',
      '| --- | --- |',
      ...Array.from(
        { length: 60 },
        (_, index) => `| 무색 시료 ${index} | 2시간 |`,
      ),
      targetRow,
    ].join('\n')
    const context = buildChatEvidenceContext({
      question: '자주빛 시료의 보관 시간',
      matches: [buildEvidenceRecord('samples', content)],
      maximumRecordCount: 1,
      maximumCharacters: 400,
    })

    expect(context).toContain('| 시료 | 보관 |\n| --- | --- |')
    expect(context).toContain(targetRow)
    expect(context.length).toBeLessThanOrEqual(400)
  })

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
