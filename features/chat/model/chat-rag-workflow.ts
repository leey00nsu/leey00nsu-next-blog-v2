import type Database from 'better-sqlite3'
import { cosineSimilarity } from 'ai'
import {
  Annotation,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import {
  getChatRagDatabase,
  selectChatRagLocaleIndex,
  type ChatRagLocaleIndex,
} from '@/features/chat/model/chat-rag-database'
import { embedChatRagQuestion } from '@/features/chat/model/chat-rag-embedding-provider'
import type { GraphRagChunk } from '@/features/chat/model/graph-rag'
import type { SupportedLocale } from '@/shared/config/constants'
import { collectSearchTerms } from '@/shared/lib/search-terms'

const CHAT_RAG_WORKFLOW_STATE = Annotation.Root({
  question: Annotation<string>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => '',
  }),
  currentPostSlug: Annotation<string | undefined>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => undefined,
  }),
  localeIndex: Annotation<ChatRagLocaleIndex>({
    reducer: (_previousValue, nextValue) => nextValue,
  }),
  questionEmbedding: Annotation<number[]>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => [],
  }),
  matches: Annotation<ChatEvidenceRecord[]>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => [],
  }),
  grounded: Annotation<boolean>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => false,
  }),
})

export interface ChatRagWorkflowResult {
  grounded: boolean
  matches: ChatEvidenceRecord[]
}

interface RankedGraphRagChunk extends GraphRagChunk {
  score: number
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function buildChunkSearchText(chunk: GraphRagChunk): string {
  return normalizeText(
    [
      chunk.title,
      chunk.excerpt,
      chunk.content,
      chunk.sectionTitle ?? '',
      chunk.tags.join(' '),
      chunk.searchTerms.join(' '),
    ].join(' '),
  )
}

function buildLexicalScore(
  chunk: GraphRagChunk,
  questionTerms: string[],
): number {
  const chunkSearchText = buildChunkSearchText(chunk)

  return questionTerms.reduce((score, questionTerm) => {
    if (questionTerm.length < CHAT_RAG.SEARCH.MINIMUM_EMBEDDING_TOKEN_LENGTH) {
      return score
    }

    return chunkSearchText.includes(questionTerm)
      ? score + CHAT_RAG.SEARCH.LEXICAL_MATCH_BOOST
      : score
  }, 0)
}

function buildMatchedEntityIds(
  localeIndex: ChatRagLocaleIndex,
  questionTerms: string[],
): Set<string> {
  return new Set(
    localeIndex.entities
      .filter((entity) => {
        return questionTerms.some((questionTerm) => {
          return (
            entity.normalizedName.includes(questionTerm) ||
            questionTerm.includes(entity.normalizedName)
          )
        })
      })
      .map((entity) => entity.id),
  )
}

function buildRelatedEntityScoreMap(
  localeIndex: ChatRagLocaleIndex,
  matchedEntityIds: Set<string>,
): Map<string, number> {
  const relatedEntityScoreMap = new Map<string, number>()
  let relationHopCount = 0

  for (const relation of localeIndex.relations) {
    if (relationHopCount >= CHAT_RAG.SEARCH.MAXIMUM_RELATION_HOPS) {
      break
    }

    if (matchedEntityIds.has(relation.sourceEntityId)) {
      relatedEntityScoreMap.set(
        relation.targetEntityId,
        (relatedEntityScoreMap.get(relation.targetEntityId) ?? 0) +
          relation.weight * CHAT_RAG.SEARCH.RELATED_ENTITY_MATCH_BOOST,
      )
      relationHopCount += 1
    }

    if (matchedEntityIds.has(relation.targetEntityId)) {
      relatedEntityScoreMap.set(
        relation.sourceEntityId,
        (relatedEntityScoreMap.get(relation.sourceEntityId) ?? 0) +
          relation.weight * CHAT_RAG.SEARCH.RELATED_ENTITY_MATCH_BOOST,
      )
      relationHopCount += 1
    }
  }

  return relatedEntityScoreMap
}

function buildRankedChunks(params: {
  localeIndex: ChatRagLocaleIndex
  question: string
  questionEmbedding: number[]
  currentPostSlug?: string
}): RankedGraphRagChunk[] {
  const embeddingMap = new Map(
    params.localeIndex.embeddings.map((embedding) => {
      return [embedding.chunkId, embedding.embedding]
    }),
  )
  const questionTerms = collectSearchTerms({
    texts: [params.question],
  }).map((questionTerm) => normalizeText(questionTerm))
  const matchedEntityIds = buildMatchedEntityIds(
    params.localeIndex,
    questionTerms,
  )
  const relatedEntityScoreMap = buildRelatedEntityScoreMap(
    params.localeIndex,
    matchedEntityIds,
  )

  return params.localeIndex.chunks
    .map((chunk) => {
      const chunkEmbedding = embeddingMap.get(chunk.id)
      const semanticScore =
        chunkEmbedding && params.questionEmbedding.length > 0
          ? cosineSimilarity(params.questionEmbedding, chunkEmbedding)
          : 0
      const directEntityScore = chunk.entityIds.reduce((score, entityId) => {
        return matchedEntityIds.has(entityId)
          ? score + CHAT_RAG.SEARCH.DIRECT_ENTITY_MATCH_BOOST
          : score
      }, 0)
      const relatedEntityScore = chunk.entityIds.reduce((score, entityId) => {
        return score + (relatedEntityScoreMap.get(entityId) ?? 0)
      }, 0)
      const lexicalScore = buildLexicalScore(chunk, questionTerms)
      const currentPostScore =
        params.currentPostSlug && chunk.slug === params.currentPostSlug
          ? CHAT_RAG.SEARCH.CURRENT_POST_MATCH_BOOST
          : 0

      return {
        ...chunk,
        score:
          semanticScore * CHAT_RAG.SEARCH.SEMANTIC_SCORE_MULTIPLIER +
          directEntityScore +
          relatedEntityScore +
          lexicalScore +
          currentPostScore,
      }
    })
    .filter((chunk) => {
      return chunk.score >= CHAT_RAG.SEARCH.MINIMUM_SIMILARITY_SCORE
    })
    .sort((leftChunk, rightChunk) => {
      return (
        rightChunk.score - leftChunk.score ||
        new Date(rightChunk.publishedAt ?? 0).getTime() -
          new Date(leftChunk.publishedAt ?? 0).getTime()
      )
    })
    .slice(0, CHAT_RAG.SEARCH.MAXIMUM_SEMANTIC_CANDIDATES)
}

function buildSelectedMatches(
  rankedChunks: RankedGraphRagChunk[],
): ChatEvidenceRecord[] {
  const uniqueChunkMap = new Map<string, RankedGraphRagChunk>()

  for (const rankedChunk of rankedChunks) {
    if (uniqueChunkMap.has(rankedChunk.slug)) {
      continue
    }

    uniqueChunkMap.set(rankedChunk.slug, rankedChunk)
  }

  return [...uniqueChunkMap.values()]
    .slice(0, CHAT_RAG.SEARCH.TOP_K)
    .map((chunk) => {
      return {
        id: chunk.id,
        locale: chunk.locale,
        slug: chunk.slug,
        title: chunk.title,
        url: chunk.url,
        excerpt: chunk.excerpt,
        content: chunk.content,
        sectionTitle: chunk.sectionTitle,
        tags: chunk.tags,
        publishedAt: chunk.publishedAt,
        searchTerms: chunk.searchTerms,
        sourceCategory: chunk.sourceCategory,
      }
    })
}

function buildChatRagWorkflow(params: {
  embedQuestion: (question: string) => Promise<number[]>
}) {
  return new StateGraph(CHAT_RAG_WORKFLOW_STATE)
    .addNode('embed-question', async (state) => {
      return {
        questionEmbedding: await params.embedQuestion(state.question),
      }
    })
    .addNode('rank-chunks', async (state) => {
      const rankedChunks = buildRankedChunks({
        localeIndex: state.localeIndex,
        question: state.question,
        questionEmbedding: state.questionEmbedding,
        currentPostSlug: state.currentPostSlug,
      })
      const matches = buildSelectedMatches(rankedChunks)

      return {
        grounded: matches.length > 0,
        matches,
      }
    })
    .addEdge(START, 'embed-question')
    .addEdge('embed-question', 'rank-chunks')
    .addEdge('rank-chunks', END)
    .compile()
}

export async function runChatRagWorkflow(params: {
  question: string
  locale: SupportedLocale
  currentPostSlug?: string
  database?: Database.Database
  embedQuestion?: (question: string) => Promise<number[]>
}): Promise<ChatRagWorkflowResult> {
  try {
    const database = params.database ?? getChatRagDatabase()
    const localeIndex = selectChatRagLocaleIndex({
      database,
      locale: params.locale,
    })

    if (
      localeIndex.chunks.length === 0 ||
      localeIndex.embeddings.length === 0
    ) {
      return {
        grounded: false,
        matches: [],
      }
    }

    const workflow = buildChatRagWorkflow({
      embedQuestion: params.embedQuestion ?? embedChatRagQuestion,
    })
    const result = await workflow.invoke({
      question: params.question,
      currentPostSlug: params.currentPostSlug,
      localeIndex,
    })

    return {
      grounded: result.grounded,
      matches: result.matches,
    }
  } catch {
    return {
      grounded: false,
      matches: [],
    }
  }
}
