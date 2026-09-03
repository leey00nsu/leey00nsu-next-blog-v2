import { describe, expect, it } from 'vitest'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import {
  activateChatRagIndexRun,
  selectActiveChatRagIndexVersion,
  selectChatRagLocaleSearchData,
} from '@/features/chat/model/chat-rag-database'

describe('selectChatRagLocaleSearchData', () => {
  it('Postgres JSONB 배열 응답을 그대로 파싱한다', async () => {
    const queryTexts: string[] = []
    const queryMock = async (queryText: string) => {
      queryTexts.push(queryText)

      if (queryText.includes('FROM chat_rag_active_index')) {
        return {
          rows: [
            {
              active_index_version: 'chat-rag-test-index',
              embedding_provider: CHAT_RAG.EMBEDDING.PROVIDER,
              embedding_model_id: CHAT_RAG.EMBEDDING.MODEL_ID,
              embedding_dimension: 3,
              chunking_version: CHAT_RAG.INDEX.CHUNKING_VERSION,
            },
          ],
        }
      }

      if (queryText.includes('FROM chat_rag_entities')) {
        return {
          rows: [
            {
              id: 'ko:term:nivo',
              locale: 'ko',
              name: 'nivo',
              normalized_name: 'nivo',
              kind: 'term',
              chunk_ids_json: ['ko/nivo-chart/nivo'],
            },
          ],
        }
      }

      if (queryText.includes('FROM chat_rag_relations')) {
        return {
          rows: [
            {
              id: 'ko:co_occurs:nivo:react',
              locale: 'ko',
              source_entity_id: 'ko:term:nivo',
              target_entity_id: 'ko:term:react',
              type: 'co_occurs',
              weight: 1,
            },
          ],
        }
      }

      return {
        rows: [
          {
            id: 'ko/nivo-chart/nivo',
            locale: 'ko',
            slug: 'nivo-chart',
            title: 'nivo chart로 데이터 시각화하기',
            url: '/ko/blog/nivo-chart#nivo',
            excerpt: 'nivo 소개',
            content: 'nivo는 React에서 사용하는 차트 라이브러리입니다.',
            section_title: 'nivo?',
            tags_json: ['react', 'nivo', 'chart'],
            search_terms_json: ['nivo', 'what is nivo'],
            published_at: '2023-08-07T00:00:00.000Z',
            evidence_time_kind: 'published',
            evidence_time_value: '2023-08-07T00:00:00.000Z',
            source_category: 'blog',
            entity_ids_json: ['ko:term:nivo'],
            semantic_similarity: 0.91,
          },
        ],
      }
    }

    const result = await selectChatRagLocaleSearchData({
      databaseClient: {
        query: queryMock,
      } as never,
      locale: 'ko',
      questionEmbedding: [0.1, 0.2, 0.3],
      maximumSemanticCandidates: 8,
      sourceCategory: 'blog',
      slug: 'nivo-chart',
    })

    expect(result.entities[0]?.chunkIds).toEqual(['ko/nivo-chart/nivo'])
    expect(result.semanticCandidates[0]?.tags).toEqual([
      'react',
      'nivo',
      'chart',
    ])
    expect(result.semanticCandidates[0]?.entityIds).toEqual(['ko:term:nivo'])
    expect(result.semanticCandidates[0]?.evidenceTime).toEqual({
      kind: 'published',
      value: '2023-08-07T00:00:00.000Z',
    })
    expect(queryTexts.at(-1)).toContain('AND chunks.source_category = $5')
    expect(queryTexts.at(-1)).toContain('AND chunks.slug = $6')
  })

  it('현재 설정과 embedding model이 다른 활성 index를 거부한다', async () => {
    const databaseClient = {
      query: async () => {
        return {
          rows: [
            {
              active_index_version: 'chat-rag-old-model-index',
              embedding_provider: CHAT_RAG.EMBEDDING.PROVIDER,
              embedding_model_id: 'different-embedding-model',
              chunking_version: CHAT_RAG.INDEX.CHUNKING_VERSION,
            },
          ],
        }
      },
    } as never

    await expect(
      selectActiveChatRagIndexVersion({ databaseClient }),
    ).rejects.toThrow('embedding model')
  })

  it('metadata가 없는 기존 활성 index는 semantic 검색에서 제외한다', async () => {
    const databaseClient = {
      query: async () => {
        return {
          rows: [
            {
              active_index_version: 'chat-rag-legacy-index',
              embedding_provider: null,
              embedding_model_id: null,
              embedding_dimension: null,
              chunking_version: null,
            },
          ],
        }
      },
    } as never

    await expect(
      selectActiveChatRagIndexVersion({ databaseClient }),
    ).resolves.toBeNull()
  })

  it('질문 embedding과 차원이 다른 활성 index를 거부한다', async () => {
    const databaseClient = {
      query: async () => {
        return {
          rows: [
            {
              active_index_version: 'chat-rag-different-dimension-index',
              embedding_provider: CHAT_RAG.EMBEDDING.PROVIDER,
              embedding_model_id: CHAT_RAG.EMBEDDING.MODEL_ID,
              embedding_dimension: 384,
              chunking_version: CHAT_RAG.INDEX.CHUNKING_VERSION,
            },
          ],
        }
      },
    } as never

    await expect(
      selectActiveChatRagIndexVersion({
        databaseClient,
        questionEmbeddingDimension: 768,
      }),
    ).rejects.toThrow('embedding dimension')
  })

  it('활성화하는 index에 검증된 embedding 차원을 기록한다', async () => {
    const queries: Array<{ queryText: string; values?: unknown[] }> = []
    const databaseClient = {
      query: async (queryText: string, values?: unknown[]) => {
        queries.push({ queryText, values })

        return { rows: [] }
      },
    } as never

    await activateChatRagIndexRun({
      databaseClient,
      indexVersion: 'chat-rag-new-index',
      embeddingDimension: 384,
    })

    const activationQuery = queries.find(({ queryText }) => {
      return queryText.includes('embedding_dimension = CASE')
    })

    expect(activationQuery?.values).toEqual([
      'chat-rag-new-index',
      'active',
      'stale',
      384,
    ])
    expect(queries.at(-1)?.queryText).toBe('COMMIT')
  })
})
