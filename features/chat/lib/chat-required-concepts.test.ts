import { describe, expect, it } from 'vitest'
import {
  normalizeChatConcepts,
  partitionChatConceptsByRequirement,
  selectEvidenceCoveringRequiredConcepts,
} from '@/features/chat/lib/chat-required-concepts'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

function createEvidenceRecord(params: {
  id: string
  content: string
}): ChatEvidenceRecord {
  return {
    id: params.id,
    locale: 'ko',
    slug: params.id,
    title: params.id,
    url: `/ko/${params.id}`,
    excerpt: params.content,
    content: params.content,
    sectionTitle: null,
    tags: [],
    searchTerms: [],
    sourceCategory: 'blog',
  }
}

describe('normalizeChatConcepts', () => {
  it('등록된 한국어 alias를 canonical 개념으로 정규화한다', () => {
    expect(
      normalizeChatConcepts({
        concepts: ['버셀', 'Vercel'],
        locale: 'ko',
      }),
    ).toEqual(['vercel'])
  })
})

describe('partitionChatConceptsByRequirement', () => {
  it('제품명은 필수로 유지하고 추상적인 질문 의도는 선택 개념으로 내린다', () => {
    expect(
      partitionChatConceptsByRequirement({
        requiredConcepts: ['Vercel', '사용을 중단한 이유', '경력'],
        optionalConcepts: ['배포'],
      }),
    ).toEqual({
      requiredConcepts: ['Vercel'],
      optionalConcepts: ['배포', '사용을 중단한 이유', '경력'],
    })
  })
})

describe('selectEvidenceCoveringRequiredConcepts', () => {
  it('각 필수 개념을 서로 다른 근거가 충족할 수 있다', () => {
    const vercelRecord = createEvidenceRecord({
      id: 'vercel',
      content: 'Vercel 배포 경험을 정리했습니다.',
    })
    const cloudflareRecord = createEvidenceRecord({
      id: 'cloudflare',
      content: 'Cloudflare Pages도 함께 비교했습니다.',
    })
    const generalRecord = createEvidenceRecord({
      id: 'general',
      content: '프로필 소개입니다.',
    })

    const result = selectEvidenceCoveringRequiredConcepts({
      matches: [generalRecord, vercelRecord, cloudflareRecord],
      requiredConcepts: ['Vercel', 'Cloudflare'],
      locale: 'ko',
    })

    expect(result.map((match) => match.id)).toEqual([
      'vercel',
      'cloudflare',
      'general',
    ])
  })

  it('필수 개념 하나라도 근거가 없으면 빈 결과를 반환한다', () => {
    const result = selectEvidenceCoveringRequiredConcepts({
      matches: [
        createEvidenceRecord({
          id: 'vercel',
          content: 'Vercel 사용 경험입니다.',
        }),
      ],
      requiredConcepts: ['Vercel', 'Cloudflare'],
      locale: 'ko',
    })

    expect(result).toEqual([])
  })

  it('필수 개념이 없으면 기존 순서를 유지한다', () => {
    const firstRecord = createEvidenceRecord({
      id: 'first',
      content: '첫 번째 근거',
    })
    const secondRecord = createEvidenceRecord({
      id: 'second',
      content: '두 번째 근거',
    })

    expect(
      selectEvidenceCoveringRequiredConcepts({
        matches: [firstRecord, secondRecord],
        requiredConcepts: [],
        locale: 'ko',
      }),
    ).toEqual([firstRecord, secondRecord])
  })
})
