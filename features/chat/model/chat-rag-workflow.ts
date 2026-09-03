import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { Pool } from 'pg'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import { doesChatEvidenceMatchConcept } from '@/features/chat/lib/chat-required-concepts'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import {
  getChatRagDatabasePool,
  selectChatRagLocaleSearchData,
  type ChatRagLocaleSearchData,
  type ChatRagSemanticCandidate,
} from '@/features/chat/model/chat-rag-database'
import { embedChatRagQuestion } from '@/features/chat/model/chat-rag-embedding-provider'
import type {
  GraphRagEntity,
  GraphRagRelation,
} from '@/features/chat/model/graph-rag'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import type { SupportedLocale } from '@/shared/config/constants'
import { collectSearchTerms } from '@/shared/lib/search-terms'

const CHAT_RAG_WORKFLOW_STATE = Annotation.Root({
  question: Annotation<string>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => '',
  }),
  locale: Annotation<SupportedLocale>({
    reducer: (_previousValue, nextValue) => nextValue,
  }),
  currentPostSlug: Annotation<string | undefined>({
    reducer: (_previousValue, nextValue) => nextValue,
  }),
  retrievalPlan: Annotation<ChatRetrievalPlan | undefined>({
    reducer: (_previousValue, nextValue) => nextValue,
  }),
  questionEmbedding: Annotation<number[]>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => [],
  }),
  searchData: Annotation<ChatRagLocaleSearchData>({
    reducer: (_previousValue, nextValue) => nextValue,
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
  failureKind: 'workflow_error' | null
}

const CHAT_RAG_WORKFLOW_LOG = {
  FAILURE_MESSAGE: 'Chat RAG workflow failed.',
} as const

interface RankedGraphRagChunk extends ChatRagSemanticCandidate {
  score: number
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function buildChunkSearchText(chunk: ChatRagSemanticCandidate): string {
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
  chunk: ChatRagSemanticCandidate,
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
  entities: GraphRagEntity[],
  questionTerms: string[],
): Set<string> {
  return new Set(
    entities
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
  relations: GraphRagRelation[],
  matchedEntityIds: Set<string>,
): Map<string, number> {
  const relatedEntityScoreMap = new Map<string, number>()
  let relationHopCount = 0

  for (const relation of relations) {
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
  semanticCandidates: ChatRagSemanticCandidate[]
  entities: GraphRagEntity[]
  relations: GraphRagRelation[]
  question: string
  currentPostSlug?: string
}): RankedGraphRagChunk[] {
  const questionTerms = collectSearchTerms({
    texts: [params.question],
  }).map((questionTerm) => normalizeText(questionTerm))
  const matchedEntityIds = buildMatchedEntityIds(params.entities, questionTerms)
  const relatedEntityScoreMap = buildRelatedEntityScoreMap(
    params.relations,
    matchedEntityIds,
  )

  return params.semanticCandidates
    .filter((chunk) => {
      return (
        chunk.semanticSimilarity >= CHAT_RAG.SEARCH.MINIMUM_SIMILARITY_SCORE
      )
    })
    .map((chunk) => {
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
          chunk.semanticSimilarity * CHAT_RAG.SEARCH.SEMANTIC_SCORE_MULTIPLIER +
          directEntityScore +
          relatedEntityScore +
          lexicalScore +
          currentPostScore,
      }
    })
    .sort((leftChunk, rightChunk) => {
      return (
        rightChunk.score - leftChunk.score ||
        new Date(rightChunk.publishedAt ?? 0).getTime() -
          new Date(leftChunk.publishedAt ?? 0).getTime()
      )
    })
}

function buildSelectedMatches(
  rankedChunks: RankedGraphRagChunk[],
  requiredConcepts: string[],
): ChatEvidenceRecord[] {
  const slugMatchCountMap = new Map<string, number>()
  const selectedChunkIds = new Set<string>()

  for (const requiredConcept of requiredConcepts) {
    const requiredChunk = rankedChunks.find((rankedChunk) => {
      return doesChatEvidenceMatchConcept(rankedChunk, requiredConcept)
    })

    if (requiredChunk) {
      selectedChunkIds.add(requiredChunk.id)
    }
  }

  if (selectedChunkIds.size > CHAT_RAG.SEARCH.TOP_K) {
    return []
  }

  for (const rankedChunk of rankedChunks) {
    if (!selectedChunkIds.has(rankedChunk.id)) {
      continue
    }

    slugMatchCountMap.set(
      rankedChunk.slug,
      (slugMatchCountMap.get(rankedChunk.slug) ?? 0) + 1,
    )
  }

  for (const rankedChunk of rankedChunks) {
    if (selectedChunkIds.has(rankedChunk.id)) {
      continue
    }

    if (selectedChunkIds.size >= CHAT_RAG.SEARCH.TOP_K) {
      break
    }

    const slugMatchCount = slugMatchCountMap.get(rankedChunk.slug) ?? 0

    if (slugMatchCount >= CHAT_RAG.SEARCH.MAXIMUM_MATCHES_PER_SLUG) {
      continue
    }

    slugMatchCountMap.set(rankedChunk.slug, slugMatchCount + 1)
    selectedChunkIds.add(rankedChunk.id)
  }

  return rankedChunks
    .filter((rankedChunk) => {
      return selectedChunkIds.has(rankedChunk.id)
    })
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
        evidenceTime: chunk.evidenceTime,
        searchTerms: chunk.searchTerms,
        sourceCategory: chunk.sourceCategory,
      }
    })
}

function buildChatRagWorkflow(params: {
  embedQuestion: (question: string) => Promise<number[]>
  selectSearchData: (params: {
    locale: SupportedLocale
    questionEmbedding: number[]
    retrievalPlan?: ChatRetrievalPlan
  }) => Promise<ChatRagLocaleSearchData>
}) {
  return new StateGraph(CHAT_RAG_WORKFLOW_STATE)
    .addNode('embed-question', async (state) => {
      return {
        questionEmbedding: await params.embedQuestion(state.question),
      }
    })
    .addNode('load-search-data', async (state) => {
      return {
        searchData: await params.selectSearchData({
          locale: state.locale,
          questionEmbedding: state.questionEmbedding,
          retrievalPlan: state.retrievalPlan,
        }),
      }
    })
    .addNode('rank-chunks', async (state) => {
      const rankedChunks = buildRankedChunks({
        semanticCandidates: state.searchData.semanticCandidates,
        entities: state.searchData.entities,
        relations: state.searchData.relations,
        question: state.question,
        currentPostSlug: state.currentPostSlug,
      })
      const matches = buildSelectedMatches(
        rankedChunks,
        state.retrievalPlan?.requiredConcepts ?? [],
      )

      return {
        grounded: matches.length > 0,
        matches,
      }
    })
    .addEdge(START, 'embed-question')
    .addEdge('embed-question', 'load-search-data')
    .addEdge('load-search-data', 'rank-chunks')
    .addEdge('rank-chunks', END)
    .compile()
}

export async function runChatRagWorkflow(params: {
  question: string
  locale: SupportedLocale
  currentPostSlug?: string
  retrievalPlan?: ChatRetrievalPlan
  databasePool?: Pool
  embedQuestion?: (question: string) => Promise<number[]>
  selectSearchData?: (params: {
    locale: SupportedLocale
    questionEmbedding: number[]
    retrievalPlan?: ChatRetrievalPlan
  }) => Promise<ChatRagLocaleSearchData>
}): Promise<ChatRagWorkflowResult> {
  try {
    const databasePool =
      params.selectSearchData || params.databasePool
        ? params.databasePool
        : await getChatRagDatabasePool()
    const workflow = buildChatRagWorkflow({
      embedQuestion: params.embedQuestion ?? embedChatRagQuestion,
      selectSearchData:
        params.selectSearchData ??
        (async ({ locale, questionEmbedding, retrievalPlan }) => {
          if (!databasePool) {
            return {
              entities: [],
              relations: [],
              semanticCandidates: [],
            }
          }

          const planSourceCategory =
            retrievalPlan?.sourceStrategy === 'only' &&
            retrievalPlan.sourceCategories.length === 1
              ? retrievalPlan.sourceCategories[0]
              : undefined
          const planTarget =
            retrievalPlan?.canonicalTargets.length === 1
              ? retrievalPlan.canonicalTargets[0]
              : undefined

          return selectChatRagLocaleSearchData({
            databaseClient: databasePool,
            locale,
            questionEmbedding,
            maximumSemanticCandidates:
              CHAT_RAG.SEARCH.MAXIMUM_SEMANTIC_CANDIDATES,
            sourceCategory: planSourceCategory,
            slug: planTarget?.slug,
          })
        }),
    })
    const result = await workflow.invoke({
      question: params.question,
      locale: params.locale,
      currentPostSlug: params.currentPostSlug,
      retrievalPlan: params.retrievalPlan,
    })

    return {
      grounded: result.grounded,
      matches: result.matches,
      failureKind: null,
    }
  } catch (error) {
    console.error(CHAT_RAG_WORKFLOW_LOG.FAILURE_MESSAGE, error)

    return {
      grounded: false,
      matches: [],
      failureKind: 'workflow_error',
    }
  }
}
