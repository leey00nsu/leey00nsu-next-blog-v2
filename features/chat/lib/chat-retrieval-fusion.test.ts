import { describe, expect, it } from 'vitest'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

function buildChatEvidenceRecord(
  overrides: Partial<ChatEvidenceRecord>,
): ChatEvidenceRecord {
  return {
    id: 'ko/default',
    locale: 'ko',
    slug: 'default',
    title: 'default',
    url: '/ko/default',
    excerpt: 'default excerpt',
    content: 'default content',
    sectionTitle: null,
    tags: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    searchTerms: [],
    sourceCategory: 'blog',
    ...overrides,
  }
}

describe('fuseChatRetrievalMatches', () => {
  it('lexical과 semantic에 모두 등장한 후보를 우선 정렬한다', () => {
    const overlappedMatch = buildChatEvidenceRecord({
      id: 'ko/project/leesfield/overview',
      slug: 'leesfield',
      title: 'Leesfield',
      url: '/ko/projects/leesfield#overview',
      sourceCategory: 'project',
    })
    const lexicalOnlyMatch = buildChatEvidenceRecord({
      id: 'ko/blog/leesfield-story',
      slug: 'leesfield-story',
      title: 'Leesfield 제작기',
      url: '/ko/blog/leesfield-story',
      sourceCategory: 'blog',
    })
    const semanticOnlyMatch = buildChatEvidenceRecord({
      id: 'ko/about/profile',
      slug: 'about',
      title: 'About Me',
      url: '/ko/about',
      sourceCategory: 'profile',
    })

    const fusedMatches = fuseChatRetrievalMatches({
      lexicalMatches: [overlappedMatch, lexicalOnlyMatch],
      semanticMatches: [overlappedMatch, semanticOnlyMatch],
    })

    expect(fusedMatches.map((match) => match.url)).toEqual([
      '/ko/projects/leesfield#overview',
      '/ko/blog/leesfield-story',
      '/ko/about',
    ])
  })

  it('preferred source category와 current post boost를 함께 반영한다', () => {
    const currentPostMatch = buildChatEvidenceRecord({
      id: 'ko/blog/current-post',
      slug: 'current-post',
      title: '현재 글',
      url: '/ko/blog/current-post',
      sourceCategory: 'blog',
    })
    const projectMatch = buildChatEvidenceRecord({
      id: 'ko/project/lee-spec-kit',
      slug: 'lee-spec-kit',
      title: 'lee-spec-kit',
      url: '/ko/projects/lee-spec-kit',
      sourceCategory: 'project',
    })

    const fusedMatches = fuseChatRetrievalMatches({
      lexicalMatches: [currentPostMatch],
      semanticMatches: [projectMatch],
      preferredSourceCategories: ['project'],
      currentPostSlug: 'current-post',
    })

    expect(fusedMatches.map((match) => match.url)).toEqual([
      '/ko/projects/lee-spec-kit',
      '/ko/blog/current-post',
    ])
  })
})
