import { describe, expect, it } from 'vitest'
import { buildChatQueryTemplates } from '@/shared/config/chat-query-templates'
import {
  buildPostChatSemanticEntry,
  buildProfileChatSemanticEntry,
  buildProjectChatSemanticEntry,
  buildSemanticSearchTerms,
  getSemanticSearchTerms,
} from '@/shared/lib/chat-semantic-map'

describe('chat semantic map', () => {
  it('의도별 템플릿으로 profile name 질의를 생성한다', () => {
    const result = buildChatQueryTemplates({
      locale: 'en',
      queryIntent: 'profile.name',
      subjectTerms: ['author'],
    })

    expect(result).toEqual(
      expect.arrayContaining(['what is the author name', 'who is the author']),
    )
  })

  it('의도별 템플릿으로 project tech stack 질의를 생성한다', () => {
    const result = buildChatQueryTemplates({
      locale: 'en',
      queryIntent: 'project.tech-stack',
      subjectTerms: ['typescript', 'next.js'],
    })

    expect(result).toEqual(
      expect.arrayContaining([
        'which project uses typescript',
        'which project uses next.js',
      ]),
    )
  })

  it('about mdx에서 이름과 author 질의를 기계적으로 생성한다', () => {
    const entry = buildProfileChatSemanticEntry({
      locale: 'en',
      slug: 'about',
      title: 'About Me',
      description: 'About this blog',
      content: '# Yoonsu Lee\n\nI build reliable products.',
    })

    expect(entry.entityNames).toContain('yoonsu lee')
    expect(entry.aliases).toEqual(
      expect.arrayContaining(['author', 'blog owner', 'name']),
    )
    expect(entry.faqQueries).toEqual(
      expect.arrayContaining(['what is his name', 'who is the author']),
    )
  })

  it('project mdx에서 tech stack 기반 질의를 생성한다', () => {
    const entry = buildProjectChatSemanticEntry({
      locale: 'en',
      slug: 'lee-spec-kit',
      title: 'lee-spec-kit',
      summary: 'CLI to generate a project docs structure for AI-assisted development',
      keyFeatures: ['Spec-driven development workflow templates'],
      techStacks: ['Node.js', 'TypeScript'],
    })

    expect(entry.faqQueries).toEqual(
      expect.arrayContaining([
        'what is lee spec kit',
        'which project uses typescript',
      ]),
    )
  })

  it('semantic entry는 검색용 search terms로 변환된다', () => {
    const entry = buildPostChatSemanticEntry({
      locale: 'en',
      slug: 'why-use-react-query',
      title: 'Why Use React Query',
      description: 'Why React Query matters',
      tags: ['react-query', 'tanstack-query'],
    })

    const searchTerms = buildSemanticSearchTerms(entry)

    expect(searchTerms).toEqual(
      expect.arrayContaining([
        'what is why use react query',
        'react query',
        'tanstack query',
      ]),
    )
  })

  it('ko 프로필 검색어는 en profile semantic fallback도 함께 포함한다', () => {
    const searchTerms = getSemanticSearchTerms({
      locale: 'ko',
      slug: 'about',
      sourceCategory: 'profile',
    })

    expect(searchTerms).toEqual(
      expect.arrayContaining(['what is his name', 'who is the author']),
    )
  })
})
