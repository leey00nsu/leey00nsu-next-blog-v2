import '@/shared/lib/load-node-environment'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES } from '@/features/chat/fixtures/chat-retrieval-corpus-evaluation'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { isChatRagDatabaseConfigured } from '@/features/chat/model/chat-rag-database'
import { isChatRagEmbeddingConfigured } from '@/features/chat/model/chat-rag-embedding-provider'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_RETRIEVAL_EVALUATION = {
  RECALL_MATCH_COUNTS: [1, 3],
  MINIMUM_RECALL_AT_ONE: 0.8,
  MINIMUM_RECALL_AT_THREE: 0.9,
  MINIMUM_MEAN_RECIPROCAL_RANK: 0.85,
  MINIMUM_REFUSAL_ACCURACY: 1,
  MINIMUM_LIVE_SEMANTIC_RELEVANT_MATCH_RATE: 0.8,
  LIVE_SEMANTIC_ENVIRONMENT_KEY: 'BLOG_CHAT_EVALUATE_LIVE_SEMANTIC',
} as const

interface ChatRetrievalEvaluationResult {
  id: string
  question: string
  matchUrls: string[]
  expectedMatchUrls: string[]
  recallAtOne: boolean | null
  recallAtThree: boolean | null
  reciprocalRank: number | null
  refusalCorrect: boolean | null
  semanticRetrievalAttempted: boolean
  semanticMatchUrls: string[]
}

function calcReciprocalRank(
  matchUrls: string[],
  expectedMatchUrls: string[],
): number {
  const firstRelevantMatchIndex = matchUrls.findIndex((matchUrl) => {
    return expectedMatchUrls.includes(matchUrl)
  })

  return firstRelevantMatchIndex === -1 ? 0 : 1 / (firstRelevantMatchIndex + 1)
}

function calcRate(values: boolean[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.filter(Boolean).length / values.length
}

function buildBlogEvidenceRecords(
  locale: SupportedLocale,
): ChatEvidenceRecord[] {
  return (GENERATED_BLOG_SEARCH_RECORDS[locale] ?? []).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
      evidenceTime: record.publishedAt
        ? { kind: 'published' as const, value: record.publishedAt }
        : undefined,
    }
  })
}

function assertLiveSemanticEvaluationConfigured(
  liveSemanticEvaluationEnabled: boolean,
): void {
  if (!liveSemanticEvaluationEnabled) {
    return
  }

  if (!isChatRagDatabaseConfigured() || !isChatRagEmbeddingConfigured()) {
    throw new Error(
      `${CHAT_RETRIEVAL_EVALUATION.LIVE_SEMANTIC_ENVIRONMENT_KEY}=true requires both the Chat RAG database and embedding provider configuration.`,
    )
  }
}

async function evaluateChatRetrieval(): Promise<void> {
  const liveSemanticEvaluationEnabled =
    process.env[CHAT_RETRIEVAL_EVALUATION.LIVE_SEMANTIC_ENVIRONMENT_KEY] ===
    'true'
  assertLiveSemanticEvaluationConfigured(liveSemanticEvaluationEnabled)

  const recordsByLocale = new Map<
    SupportedLocale,
    {
      blogRecords: ChatEvidenceRecord[]
      curatedRecords: ChatEvidenceRecord[]
    }
  >()

  for (const evaluationCase of CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES) {
    if (recordsByLocale.has(evaluationCase.locale)) {
      continue
    }

    recordsByLocale.set(evaluationCase.locale, {
      blogRecords: buildBlogEvidenceRecords(evaluationCase.locale),
      curatedRecords: await getCuratedChatSources(evaluationCase.locale),
    })
  }

  const results = await Promise.all(
    CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.map(
      async (evaluationCase): Promise<ChatRetrievalEvaluationResult> => {
        const records = recordsByLocale.get(evaluationCase.locale)

        if (!records) {
          throw new Error(
            `Missing evaluation records for locale ${evaluationCase.locale}.`,
          )
        }

        let semanticRetrievalAttempted = false
        let semanticMatchUrls: string[] = []

        const execution = await executeChatRetrievalPlan({
          plan: evaluationCase.retrievalPlan,
          locale: evaluationCase.locale,
          blogRecords: records.blogRecords,
          curatedRecords: records.curatedRecords,
          retrieveSemanticMatches: liveSemanticEvaluationEnabled
            ? async ({ plan, locale, embedQuestion }) => {
                semanticRetrievalAttempted = true
                const semanticResult = await runChatRagWorkflow({
                  question: plan.standaloneQuestion,
                  locale,
                  retrievalPlan: plan,
                  embedQuestion,
                })

                if (semanticResult.failureKind) {
                  throw new Error('Live Chat RAG semantic retrieval failed.')
                }

                semanticMatchUrls = semanticResult.matches.map((match) => {
                  return match.url
                })

                return semanticResult.matches
              }
            : async () => [],
        })
        const matchUrls = execution.matches.map((match) => match.url)

        if (evaluationCase.expectRefusal) {
          return {
            id: evaluationCase.id,
            question: evaluationCase.retrievalPlan.standaloneQuestion,
            matchUrls,
            expectedMatchUrls: [],
            recallAtOne: null,
            recallAtThree: null,
            reciprocalRank: null,
            refusalCorrect: execution.kind === 'refusal',
            semanticRetrievalAttempted,
            semanticMatchUrls,
          }
        }

        const recalls = CHAT_RETRIEVAL_EVALUATION.RECALL_MATCH_COUNTS.map(
          (maximumMatchCount) => {
            return evaluationCase.expectedMatchUrls.some((expectedMatchUrl) => {
              return matchUrls
                .slice(0, maximumMatchCount)
                .includes(expectedMatchUrl)
            })
          },
        )

        return {
          id: evaluationCase.id,
          question: evaluationCase.retrievalPlan.standaloneQuestion,
          matchUrls,
          expectedMatchUrls: evaluationCase.expectedMatchUrls,
          recallAtOne: recalls[0] ?? false,
          recallAtThree: recalls[1] ?? false,
          reciprocalRank: calcReciprocalRank(
            matchUrls,
            evaluationCase.expectedMatchUrls,
          ),
          refusalCorrect: null,
          semanticRetrievalAttempted,
          semanticMatchUrls,
        }
      },
    ),
  )
  const positiveResults = results.filter((result) => {
    return result.reciprocalRank !== null
  })
  const refusalResults = results.filter((result) => {
    return result.refusalCorrect !== null
  })
  const recallAtOne = calcRate(
    positiveResults.map((result) => result.recallAtOne ?? false),
  )
  const recallAtThree = calcRate(
    positiveResults.map((result) => result.recallAtThree ?? false),
  )
  const meanReciprocalRank =
    positiveResults.reduce((sum, result) => {
      return sum + (result.reciprocalRank ?? 0)
    }, 0) / positiveResults.length
  const refusalAccuracy = calcRate(
    refusalResults.map((result) => result.refusalCorrect ?? false),
  )
  const semanticRetrievalCoverage = calcRate(
    positiveResults.map((result) => result.semanticRetrievalAttempted),
  )
  const semanticMatchRate = calcRate(
    positiveResults.map((result) => result.semanticMatchUrls.length > 0),
  )
  const semanticRelevantMatchRate = calcRate(
    positiveResults.map((result) => {
      return result.expectedMatchUrls.some((expectedMatchUrl) => {
        return result.semanticMatchUrls.includes(expectedMatchUrl)
      })
    }),
  )
  const liveSemanticEvaluationPassed =
    !liveSemanticEvaluationEnabled ||
    (semanticRetrievalCoverage === 1 &&
      semanticRelevantMatchRate >=
        CHAT_RETRIEVAL_EVALUATION.MINIMUM_LIVE_SEMANTIC_RELEVANT_MATCH_RATE)
  const evaluationPassed =
    recallAtOne >= CHAT_RETRIEVAL_EVALUATION.MINIMUM_RECALL_AT_ONE &&
    recallAtThree >= CHAT_RETRIEVAL_EVALUATION.MINIMUM_RECALL_AT_THREE &&
    meanReciprocalRank >=
      CHAT_RETRIEVAL_EVALUATION.MINIMUM_MEAN_RECIPROCAL_RANK &&
    refusalAccuracy >= CHAT_RETRIEVAL_EVALUATION.MINIMUM_REFUSAL_ACCURACY &&
    liveSemanticEvaluationPassed

  console.log(
    JSON.stringify(
      {
        mode: liveSemanticEvaluationEnabled
          ? 'live-hybrid-corpus'
          : 'lexical-corpus',
        summary: {
          totalCaseCount: results.length,
          positiveCaseCount: positiveResults.length,
          refusalCaseCount: refusalResults.length,
          recallAtOne,
          recallAtThree,
          meanReciprocalRank,
          refusalAccuracy,
          semanticRetrievalCoverage: liveSemanticEvaluationEnabled
            ? semanticRetrievalCoverage
            : null,
          semanticMatchRate: liveSemanticEvaluationEnabled
            ? semanticMatchRate
            : null,
          semanticRelevantMatchRate: liveSemanticEvaluationEnabled
            ? semanticRelevantMatchRate
            : null,
          passed: evaluationPassed,
        },
        failures: results.filter((result) => {
          return (
            result.recallAtOne === false ||
            result.recallAtThree === false ||
            result.refusalCorrect === false ||
            (liveSemanticEvaluationEnabled &&
              result.reciprocalRank !== null &&
              (!result.semanticRetrievalAttempted ||
                !result.expectedMatchUrls.some((expectedMatchUrl) => {
                  return result.semanticMatchUrls.includes(expectedMatchUrl)
                })))
          )
        }),
      },
      null,
      2,
    ),
  )

  if (!evaluationPassed) {
    process.exitCode = 1
  }
}

// tsx loads this package as CommonJS, where top-level await is unavailable.
// eslint-disable-next-line unicorn/prefer-top-level-await
void evaluateChatRetrieval().catch((error) => {
  console.error('Failed to evaluate Chat RAG retrieval:', error)
  process.exitCode = 1
})
