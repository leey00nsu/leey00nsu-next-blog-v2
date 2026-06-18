import { describe, expect, it } from 'vitest'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'

const CANDIDATES: ChatEntityCandidate[] = [
  {
    entityId: 'project/lee-spec-kit',
    kind: 'project',
    slug: 'lee-spec-kit',
    title: 'lee-spec-kit',
    aliases: ['lee spec kit'],
    searchTerms: ['AI', 'specification'],
    sourceCategory: 'project',
  },
  {
    entityId: 'project/leemage',
    kind: 'project',
    slug: 'leemage',
    title: 'Leemage',
    aliases: ['lee mage'],
    searchTerms: ['Presigned URL', 'image'],
    sourceCategory: 'project',
  },
  {
    entityId: 'profile/about',
    kind: 'profile',
    slug: 'about',
    title: '이윤수',
    aliases: ['이윤수', '블로그 주인', '작성자'],
    searchTerms: [],
    sourceCategory: 'profile',
  },
]

describe('matchChatEntityCandidates', () => {
  it.each([
    ['lee-spec-kit을 왜 만들었어?', 'project/lee-spec-kit'],
    [
      'Leemage에서 Presigned URL을 사용한 이유가 뭐야?',
      'project/leemage',
    ],
  ])('%s에서 canonical candidate를 찾는다', (question, entityId) => {
    const matches = matchChatEntityCandidates({
      question,
      candidates: CANDIDATES,
    })

    expect(matches.map((candidate) => candidate.entityId)).toEqual([entityId])
  })

  it('broad search term만 일치하는 질문은 project target으로 확정하지 않는다', () => {
    const matches = matchChatEntityCandidates({
      question: '최근 프로젝트에서 AI를 어떻게 활용하고 있어?',
      candidates: CANDIDATES,
    })

    expect(matches).toEqual([])
  })

  it('대명사는 매칭하지 않고 명시적인 owner 역할은 profile로 매칭한다', () => {
    expect(
      matchChatEntityCandidates({
        question: '이 사람 Vercel 써봤어?',
        candidates: CANDIDATES,
      }),
    ).toEqual([])
    expect(
      matchChatEntityCandidates({
        question: '블로그 주인',
        candidates: CANDIDATES,
      }).map((candidate) => candidate.entityId),
    ).toEqual(['profile/about'])
  })
})
