import { describe, expect, it } from 'vitest'
import {
  doesChatEvidenceMatchConcept,
  normalizeChatConcepts,
  partitionChatConceptsByRequirement,
  selectEnforceableChatConcepts,
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

describe('doesChatEvidenceMatchConcept', () => {
  it('붙여 만든 복합 개념은 구성 요소가 모두 있으면 충족한다', () => {
    const record = createEvidenceRecord({
      id: 'supertonic',
      content: 'Supertonic으로 만든 Voice Cloning 목소리를 등록했습니다.',
    })

    expect(doesChatEvidenceMatchConcept(record, 'Supertonic Voice Cloning')).toBe(
      true,
    )
  })

  it('구성 요소 일부만 있으면 복합 개념을 충족하지 않는다', () => {
    const record = createEvidenceRecord({
      id: 'supabase',
      content: 'Supabase를 셀프 호스팅으로 옮겼습니다.',
    })

    expect(doesChatEvidenceMatchConcept(record, 'Supabase Cloud')).toBe(false)
  })
})

describe('selectEnforceableChatConcepts', () => {
  const supertonicRecord = createEvidenceRecord({
    id: 'supertonic',
    content: 'Supertonic Voice Cloning 목소리를 등록했습니다.',
  })
  const supabaseRecord = createEvidenceRecord({
    id: 'supabase',
    content: 'Supabase를 셀프 호스팅으로 옮겼습니다.',
  })
  const cloudflareRecord = createEvidenceRecord({
    id: 'cloudflare',
    content: '영상은 Cloudflare R2로 옮겼습니다.',
  })

  it('말뭉치가 아는 개념은 필수로 유지한다', () => {
    expect(
      selectEnforceableChatConcepts({
        concepts: ['Supertonic Voice Cloning', 'Supabase Cloud'],
        records: [supertonicRecord, supabaseRecord],
      }),
    ).toEqual(['Supertonic Voice Cloning'])
  })

  it('낱말은 있지만 한 근거에 모여 있지 않은 표현은 선택 개념으로 내린다', () => {
    expect(
      selectEnforceableChatConcepts({
        concepts: ['Supabase Cloud'],
        records: [supabaseRecord, cloudflareRecord],
      }),
    ).toEqual([])
  })

  it('낱말 하나가 말뭉치에 아예 없으면 그 표현은 필수로 남긴다', () => {
    expect(
      selectEnforceableChatConcepts({
        concepts: ['Supabase Cloud'],
        records: [supabaseRecord],
      }),
    ).toEqual(['Supabase Cloud'])
  })

  it('말뭉치가 전혀 모르는 개념은 필수로 남겨 근거 없는 답변을 막는다', () => {
    expect(
      selectEnforceableChatConcepts({
        concepts: ['Kubernetes'],
        records: [supertonicRecord, supabaseRecord, cloudflareRecord],
      }),
    ).toEqual(['Kubernetes'])
  })

  it('아는 개념과 모르는 개념이 섞이면 모르는 개념만 내린다', () => {
    expect(
      selectEnforceableChatConcepts({
        concepts: ['Vercel', 'Kubernetes'],
        records: [
          createEvidenceRecord({
            id: 'vercel',
            content: 'Vercel 호스팅을 그만두고 Coolify로 옮겼습니다.',
          }),
        ],
      }),
    ).toEqual(['Vercel'])
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
  it('붙여 쓴 복합 개념도 구성 요소를 가진 근거로 확인한다', () => {
    const voiceBuilderRecord = createEvidenceRecord({
      id: 'voice-builder',
      content:
        'Supertonic Voice Builder 종료 공지 이후 custom voice 생성 경로가 끊겼습니다.',
    })
    const otherRecord = createEvidenceRecord({
      id: 'other',
      content: '다른 내용입니다.',
    })

    expect(
      selectEvidenceCoveringRequiredConcepts({
        matches: [otherRecord, voiceBuilderRecord],
        requiredConcepts: ['Supertonic Voice Builder'],
        locale: 'ko',
      }),
    ).toHaveLength(2)
  })

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
