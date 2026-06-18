import { describe, expect, it } from 'vitest'
import { buildChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/project/leemage',
    locale: 'ko',
    slug: 'leemage',
    title: 'Leemage',
    url: '/ko/projects/leemage',
    excerpt: '이미지 서비스',
    content: 'Presigned URL을 사용하는 이미지 서비스',
    sectionTitle: null,
    tags: ['project', 'image'],
    searchTerms: ['Leemage', 'lee mage', 'Presigned URL'],
    sourceCategory: 'project',
  },
  {
    id: 'ko/project/leemage/storage',
    locale: 'ko',
    slug: 'leemage',
    title: 'Leemage',
    url: '/ko/projects/leemage#storage',
    excerpt: '저장소 설계',
    content: '저장소 설계',
    sectionTitle: 'Storage',
    tags: ['project'],
    searchTerms: ['S3'],
    sourceCategory: 'project',
  },
  {
    id: 'ko/about/profile',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/ko/about',
    excerpt: '이윤수 소개',
    content: '이윤수 소개',
    sectionTitle: null,
    tags: ['profile'],
    searchTerms: ['이윤수', '블로그 주인'],
    sourceCategory: 'profile',
  },
]

describe('buildChatEntityCandidates', () => {
  it('같은 source와 slug의 근거를 하나의 canonical candidate로 합친다', () => {
    const candidates = buildChatEntityCandidates({ records: RECORDS })

    expect(candidates).toContainEqual({
      entityId: 'project/leemage',
      kind: 'project',
      slug: 'leemage',
      title: 'Leemage',
      aliases: expect.arrayContaining(['Leemage', 'lee mage']),
      searchTerms: expect.arrayContaining(['Presigned URL', 'S3']),
      sourceCategory: 'project',
    })
    expect(
      candidates.filter((candidate) => candidate.entityId === 'project/leemage'),
    ).toHaveLength(1)
  })

  it('profile source를 canonical profile candidate로 만든다', () => {
    const candidates = buildChatEntityCandidates({ records: RECORDS })

    expect(candidates).toContainEqual(
      expect.objectContaining({
        entityId: 'profile/about',
        kind: 'profile',
        slug: 'about',
      }),
    )
  })
})
