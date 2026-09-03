import { describe, expect, it } from 'vitest'
import {
  buildGraphRagChunks,
  buildGraphRagEntities,
} from '@/features/chat/lib/graph-rag-entities'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const CHAT_EVIDENCE_RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/blog/lee-spec-kit',
    locale: 'ko',
    slug: 'lee-spec-kit',
    title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다',
    url: '/ko/blog/lee-spec-kit',
    excerpt: '문서 구조와 하네스를 강조합니다.',
    content: 'AI 협업에서 하네스와 문서 구조를 중요하게 봅니다.',
    sectionTitle: null,
    tags: ['lee-spec-kit', 'ai'],
    searchTerms: ['하네스', '문서 구조'],
    evidenceTime: {
      kind: 'published',
      value: '2026-03-20T00:00:00.000Z',
    },
    sourceCategory: 'blog',
  },
]

describe('buildGraphRagEntities', () => {
  it('title, tag, term 기반 엔티티를 생성한다', () => {
    const entities = buildGraphRagEntities(CHAT_EVIDENCE_RECORDS)

    expect(
      entities.some((entity) => {
        return entity.normalizedName === 'lee-spec-kit'
      }),
    ).toBe(true)
    expect(
      entities.some((entity) => {
        return entity.normalizedName === '하네스'
      }),
    ).toBe(true)
  })

  it('chunk는 entityIds를 포함한다', () => {
    const chunks = buildGraphRagChunks(CHAT_EVIDENCE_RECORDS)

    expect(chunks[0]?.entityIds.length).toBeGreaterThan(0)
    expect(chunks[0]?.evidenceTime).toEqual({
      kind: 'published',
      value: '2026-03-20T00:00:00.000Z',
    })
  })

  it('서로 다른 source가 같은 chunk ID를 사용하면 index 생성을 중단한다', () => {
    const duplicateRecord = {
      ...CHAT_EVIDENCE_RECORDS[0],
      sourceCategory: 'profile' as const,
    }

    expect(() => {
      buildGraphRagChunks([...CHAT_EVIDENCE_RECORDS, duplicateRecord])
    }).toThrow('Duplicate Chat RAG chunk ID')
  })
})
