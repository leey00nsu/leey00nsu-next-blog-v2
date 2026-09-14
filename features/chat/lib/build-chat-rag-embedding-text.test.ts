import { describe, expect, it } from 'vitest'
import { buildChatRagEmbeddingText } from '@/features/chat/lib/build-chat-rag-embedding-text'

describe('buildChatRagEmbeddingText', () => {
  it('제목, 섹션, 본문, 용어 목록 순서로 입력을 만든다', () => {
    expect(
      buildChatRagEmbeddingText({
        title: '데이터 시각화 회고',
        sectionTitle: '차트 종류',
        content: '라인 차트와 바 차트를 비교한다.',
        tags: ['차트 라이브러리'],
        searchTerms: ['nivo', 'recharts'],
      }),
    ).toBe(
      '데이터 시각화 회고\n차트 종류\n라인 차트와 바 차트를 비교한다.\n차트 라이브러리 nivo recharts',
    )
  })

  it('본문 앞부분의 사본인 excerpt는 입력에 넣지 않는다', () => {
    const embeddingText = buildChatRagEmbeddingText({
      title: '제목',
      sectionTitle: null,
      content: '본문 전체입니다.',
      tags: [],
      searchTerms: [],
    })

    expect(embeddingText).toBe('제목\n본문 전체입니다.')
  })

  it('제목과 섹션에 이미 있는 용어는 중복해서 넣지 않는다', () => {
    const embeddingText = buildChatRagEmbeddingText({
      title: 'Vercel 배포 전략',
      sectionTitle: null,
      content: '본문',
      tags: ['vercel', 'Vercel', '배포 전략', '프리뷰'],
      searchTerms: ['Vercel', '프리뷰'],
    })

    expect(embeddingText).toBe('Vercel 배포 전략\n본문\n프리뷰')
  })

  it('대소문자만 다른 용어는 한 번만 넣는다', () => {
    const embeddingText = buildChatRagEmbeddingText({
      title: '제목',
      sectionTitle: null,
      content: '본문',
      tags: ['TypeScript'],
      searchTerms: ['typescript', 'TYPESCRIPT', 'tsconfig'],
    })

    expect(embeddingText).toBe('제목\n본문\nTypeScript tsconfig')
  })

  it('없는 필드는 구분자 없이 건너뛴다', () => {
    expect(
      buildChatRagEmbeddingText({
        title: '  제목  ',
        sectionTitle: '   ',
        content: '  본문  ',
        tags: [],
        searchTerms: [],
      }),
    ).toBe('제목\n본문')
  })
})
