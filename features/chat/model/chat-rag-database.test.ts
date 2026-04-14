import { describe, expect, it } from 'vitest'
import { selectChatRagLocaleSearchData } from '@/features/chat/model/chat-rag-database'

describe('selectChatRagLocaleSearchData', () => {
  it('Postgres JSONB 배열 응답을 그대로 파싱한다', async () => {
    const queryMock = async (queryText: string) => {
      if (queryText.includes('SELECT active_index_version')) {
        return {
          rows: [
            {
              active_index_version: 'chat-rag-test-index',
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
    })

    expect(result.entities[0]?.chunkIds).toEqual(['ko/nivo-chart/nivo'])
    expect(result.semanticCandidates[0]?.tags).toEqual([
      'react',
      'nivo',
      'chart',
    ])
    expect(result.semanticCandidates[0]?.entityIds).toEqual(['ko:term:nivo'])
  })
})
