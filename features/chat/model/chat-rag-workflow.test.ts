import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { initializeChatRagDatabase, replaceChatRagLocaleIndex } from '@/features/chat/model/chat-rag-database'
import type {
  GraphRagChunk,
  GraphRagEntity,
  GraphRagRelation,
} from '@/features/chat/model/graph-rag'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'

function buildGraphRagChunk(
  overrides: Partial<GraphRagChunk>,
): GraphRagChunk {
  return {
    id: 'ko/blog/default',
    locale: 'ko',
    slug: 'default',
    title: 'default',
    url: '/ko/blog/default',
    excerpt: 'default excerpt',
    content: 'default content',
    sectionTitle: null,
    tags: [],
    searchTerms: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    sourceCategory: 'blog',
    entityIds: [],
    ...overrides,
  }
}

function buildGraphRagEntity(
  overrides: Partial<GraphRagEntity>,
): GraphRagEntity {
  return {
    id: 'ko:term:default',
    locale: 'ko',
    name: 'default',
    normalizedName: 'default',
    kind: 'term',
    chunkIds: [],
    ...overrides,
  }
}

function buildGraphRagRelation(
  overrides: Partial<GraphRagRelation>,
): GraphRagRelation {
  return {
    id: 'ko:co_occurs:default:default',
    locale: 'ko',
    sourceEntityId: 'ko:term:default',
    targetEntityId: 'ko:term:other',
    type: 'co_occurs',
    weight: 1,
    ...overrides,
  }
}

describe('runChatRagWorkflow', () => {
  let database: Database.Database

  beforeEach(() => {
    database = new Database(':memory:')
    initializeChatRagDatabase(database)
  })

  it('영문 이름 질문을 profile chunk로 연결한다', async () => {
    const profileChunk = buildGraphRagChunk({
      id: 'en/about/profile',
      locale: 'en',
      slug: 'about',
      title: 'Yoonsu Lee',
      url: '/en/about',
      excerpt: 'Yoonsu Lee is a frontend developer.',
      content: 'Yoonsu Lee is a frontend developer who writes this blog.',
      sourceCategory: 'profile',
      entityIds: ['en:title:yoonsu lee'],
    })
    const profileEntity = buildGraphRagEntity({
      id: 'en:title:yoonsu lee',
      locale: 'en',
      name: 'Yoonsu Lee',
      normalizedName: 'yoonsu lee',
      kind: 'title',
      chunkIds: [profileChunk.id],
    })

    replaceChatRagLocaleIndex({
      database,
      locale: 'en',
      chunks: [profileChunk],
      entities: [profileEntity],
      relations: [],
      embeddings: [{ chunkId: profileChunk.id, embedding: [0, 1] }],
    })

    const result = await runChatRagWorkflow({
      question: 'what is his name',
      locale: 'en',
      database,
      embedQuestion: async () => [0, 1],
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('about')
  })

  it('공통 철학 질문에서 semantic 후보와 relation 확장을 함께 사용한다', async () => {
    const structureChunk = buildGraphRagChunk({
      id: 'ko/blog/lee-spec-kit',
      slug: 'lee-spec-kit',
      title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다',
      url: '/ko/blog/lee-spec-kit',
      excerpt: '문서 구조와 하네스를 강조합니다.',
      content: '문서 구조와 하네스를 통해 개발 흐름을 정리합니다.',
      tags: ['ai'],
      searchTerms: ['문서 구조', '하네스'],
      entityIds: ['ko:term:문서 구조', 'ko:term:하네스'],
    })
    const reuseChunk = buildGraphRagChunk({
      id: 'ko/blog/leemage',
      slug: 'leemage-case-study',
      title: '비용 문제에서 시작해 파일 관리 플랫폼이 된 Leemage 제작기',
      url: '/ko/blog/leemage-case-study',
      excerpt: '재사용성과 비용 통제를 다룹니다.',
      content: '재사용성과 비용 통제를 함께 다룹니다.',
      tags: ['leemage'],
      searchTerms: ['재사용성', '비용 통제'],
      entityIds: ['ko:term:재사용성'],
    })
    const entities = [
      buildGraphRagEntity({
        id: 'ko:term:문서 구조',
        name: '문서 구조',
        normalizedName: '문서 구조',
        chunkIds: [structureChunk.id],
      }),
      buildGraphRagEntity({
        id: 'ko:term:하네스',
        name: '하네스',
        normalizedName: '하네스',
        chunkIds: [structureChunk.id],
      }),
      buildGraphRagEntity({
        id: 'ko:term:재사용성',
        name: '재사용성',
        normalizedName: '재사용성',
        chunkIds: [reuseChunk.id],
      }),
    ]
    const relations = [
      buildGraphRagRelation({
        id: 'ko:co_occurs:ko:term:하네스:ko:term:재사용성',
        sourceEntityId: 'ko:term:하네스',
        targetEntityId: 'ko:term:재사용성',
      }),
    ]

    replaceChatRagLocaleIndex({
      database,
      locale: 'ko',
      chunks: [structureChunk, reuseChunk],
      entities,
      relations,
      embeddings: [
        { chunkId: structureChunk.id, embedding: [1, 0] },
        { chunkId: reuseChunk.id, embedding: [0.5, 0.5] },
      ],
    })

    const result = await runChatRagWorkflow({
      question: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
      locale: 'ko',
      database,
      embedQuestion: async () => [1, 0],
    })

    expect(result.grounded).toBe(true)
    expect(
      result.matches.some((match) => {
        return match.slug === 'lee-spec-kit'
      }),
    ).toBe(true)
    expect(
      result.matches.some((match) => {
        return match.slug === 'leemage-case-study'
      }),
    ).toBe(true)
  })
})
