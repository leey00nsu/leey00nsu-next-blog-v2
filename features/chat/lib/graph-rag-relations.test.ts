import { describe, expect, it } from 'vitest'
import { buildGraphRagChunks } from '@/features/chat/lib/graph-rag-entities'
import { buildGraphRagRelations } from '@/features/chat/lib/graph-rag-relations'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const CHAT_EVIDENCE_RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/blog/lee-spec-kit/intro',
    locale: 'ko',
    slug: 'lee-spec-kit',
    title: 'lee-spec-kit 만든 이유',
    url: '/ko/blog/lee-spec-kit',
    excerpt: '하네스와 문서 구조 이야기',
    content: '하네스와 문서 구조를 중요하게 봅니다.',
    sectionTitle: null,
    tags: ['lee-spec-kit', 'ai'],
    searchTerms: ['하네스'],
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/lee-spec-kit/conclusion',
    locale: 'ko',
    slug: 'lee-spec-kit',
    title: 'lee-spec-kit 만든 이유',
    url: '/ko/blog/lee-spec-kit#conclusion',
    excerpt: '문서 구조 재강조',
    content: '문서 구조가 협업 품질을 좌우합니다.',
    sectionTitle: '결론',
    tags: ['lee-spec-kit', 'ai'],
    searchTerms: ['문서 구조'],
    sourceCategory: 'blog',
  },
]

describe('buildGraphRagRelations', () => {
  it('같은 chunk의 엔티티들 사이에 co_occurs relation을 만든다', () => {
    const chunks = buildGraphRagChunks(CHAT_EVIDENCE_RECORDS)
    const relations = buildGraphRagRelations(chunks)

    expect(
      relations.some((relation) => {
        return relation.type === 'co_occurs'
      }),
    ).toBe(true)
  })

  it('같은 slug의 chunk들 사이에는 same_slug relation 가중치를 누적한다', () => {
    const chunks = buildGraphRagChunks(CHAT_EVIDENCE_RECORDS)
    const relations = buildGraphRagRelations(chunks)

    expect(
      relations.some((relation) => {
        return relation.type === 'same_slug'
      }),
    ).toBe(true)
  })
})
