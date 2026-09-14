import '@/shared/lib/load-node-environment'
import { rerankChatEvidence } from '@/features/chat/api/rerank-chat-evidence'
import { getBlogChatRerankModel } from '@/features/chat/config/chat-models'
import { CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES } from '@/features/chat/fixtures/chat-retrieval-corpus-evaluation'
import {
  evaluateChatRetrievalCase,
  summarizeChatRetrievalEvaluation,
  type ChatRetrievalCaseResult,
} from '@/features/chat/lib/chat-retrieval-evaluation-metrics'
import {
  collectChatRetrievalCaseReferenceIssues,
  formatChatRetrievalCaseReferenceIssue,
} from '@/features/chat/lib/validate-chat-retrieval-evaluation-cases'
import { isChatRagDatabaseConfigured } from '@/features/chat/model/chat-rag-database'
import { isChatRagEmbeddingConfigured } from '@/features/chat/model/chat-rag-embedding-provider'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import {
  collectCorpusEvidenceRecords,
  type CorpusEvidenceRecords,
} from '@/features/chat/model/collect-corpus-evidence-records'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

const CHAT_RETRIEVAL_EVALUATION = {
  // lexical 기준선은 vitest의 코퍼스 평가가 상시 검사한다. 이 스크립트는 활성 인덱스와
  // 임베딩 endpoint까지 포함한 hybrid 검색을 사람이 점검할 때 쓴다.
  MAXIMUM_FAILED_CASE_COUNT: 0,
  MINIMUM_LIVE_SEMANTIC_RELEVANT_MATCH_RATE: 0.8,
  LIVE_SEMANTIC_ENVIRONMENT_KEY: 'BLOG_CHAT_EVALUATE_LIVE_SEMANTIC',
} as const

interface LiveSemanticObservation {
  retrievalAttempted: boolean
  matchUrls: string[]
  rerankAttempted: boolean
  rerankApplied: boolean
}

interface ChatRetrievalEvaluationEntry {
  result: ChatRetrievalCaseResult
  liveSemanticObservation: LiveSemanticObservation
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
  if (!process.env.OPENAI_API_KEY)
    throw new Error('Live retrieval evaluation requires OPENAI_API_KEY.')
  getBlogChatRerankModel()
}

function calcRate(values: boolean[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.filter(Boolean).length / values.length
}

function buildFailureReport(params: {
  result: ChatRetrievalCaseResult
  corpusUrls: Set<string> | undefined
}): Record<string, unknown> {
  const isCaseOutdated = params.result.expectedMatchUrls.some(
    (expectedMatchUrl) => {
      return !params.corpusUrls?.has(expectedMatchUrl)
    },
  )

  return {
    id: params.result.id,
    caseOutdated: isCaseOutdated,
    diagnosis: isCaseOutdated
      ? '기대 근거가 코퍼스에 없습니다. 문서 개편으로 케이스가 낡았는지 확인하세요.'
      : '기대 근거가 코퍼스에 있으나 상위 3건에 들지 못했습니다.',
    expectedMatchUrls: params.result.expectedMatchUrls,
    matchUrls: params.result.matchUrls,
  }
}

async function evaluateChatRetrieval(): Promise<void> {
  const liveSemanticEvaluationEnabled =
    process.env[CHAT_RETRIEVAL_EVALUATION.LIVE_SEMANTIC_ENVIRONMENT_KEY] ===
    'true'
  assertLiveSemanticEvaluationConfigured(liveSemanticEvaluationEnabled)

  const evaluationCases = CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.filter(
    (evaluationCase) => {
      return (
        liveSemanticEvaluationEnabled || !evaluationCase.requiresLiveSemantic
      )
    },
  )
  const skippedCaseIds = CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.filter(
    (evaluationCase) => {
      return (
        !liveSemanticEvaluationEnabled && evaluationCase.requiresLiveSemantic
      )
    },
  ).map((evaluationCase) => {
    return evaluationCase.id
  })
  const recordsByLocale = new Map<SupportedLocale, CorpusEvidenceRecords>()

  for (const locale of LOCALES.SUPPORTED) {
    recordsByLocale.set(locale, await collectCorpusEvidenceRecords(locale))
  }

  const corpusUrlsByLocale = new Map<SupportedLocale, Set<string>>()

  for (const [locale, corpusRecords] of recordsByLocale) {
    corpusUrlsByLocale.set(
      locale,
      new Set(
        [...corpusRecords.blogRecords, ...corpusRecords.curatedRecords].map(
          (record) => {
            return record.url
          },
        ),
      ),
    )
  }

  const caseReferenceIssues = collectChatRetrievalCaseReferenceIssues({
    cases: evaluationCases,
    corpusUrlsByLocale,
  })
  const entries: ChatRetrievalEvaluationEntry[] = []

  for (const evaluationCase of evaluationCases) {
    const corpusRecords = recordsByLocale.get(evaluationCase.locale)

    if (!corpusRecords) {
      throw new Error(
        `Missing evaluation records for locale ${evaluationCase.locale}.`,
      )
    }

    const liveSemanticObservation: LiveSemanticObservation = {
      retrievalAttempted: false,
      matchUrls: [],
      rerankAttempted: false,
      rerankApplied: false,
    }
    const execution = await executeChatRetrievalPlan({
      plan: evaluationCase.retrievalPlan,
      locale: evaluationCase.locale,
      blogRecords: corpusRecords.blogRecords,
      curatedRecords: corpusRecords.curatedRecords,
      // live 평가는 운영과 같은 호출 조건으로 모든 케이스의 리랭커를 검사한다.
      rerankMatches: liveSemanticEvaluationEnabled
        ? async (parameters) => {
            liveSemanticObservation.rerankAttempted = true
            const result = await rerankChatEvidence(parameters)
            liveSemanticObservation.rerankApplied = result.applied
            return result
          }
        : async ({ matches }) => {
            return { matches, applied: false }
          },
      retrieveSemanticMatches: liveSemanticEvaluationEnabled
        ? async ({ plan, locale, embedQuestion }) => {
            liveSemanticObservation.retrievalAttempted = true
            const semanticResult = await runChatRagWorkflow({
              question: plan.standaloneQuestion,
              locale,
              retrievalPlan: plan,
              embedQuestion,
            })

            if (semanticResult.failureKind) {
              throw new Error('Live Chat RAG semantic retrieval failed.')
            }

            liveSemanticObservation.matchUrls = semanticResult.matches.map(
              (match) => {
                return match.url
              },
            )

            return semanticResult.matches
          }
        : async () => [],
    })

    entries.push({
      result: evaluateChatRetrievalCase({
        id: evaluationCase.id,
        refused: execution.kind === 'refusal',
        matchUrls: execution.matches.map((match) => {
          return match.url
        }),
        expectedMatchUrls: evaluationCase.expectedMatchUrls,
        expectRefusal: Boolean(evaluationCase.expectRefusal),
      }),
      liveSemanticObservation,
    })
  }

  const results = entries.map((entry) => {
    return entry.result
  })
  const summary = summarizeChatRetrievalEvaluation({
    results,
    maximumFailedCaseCount: CHAT_RETRIEVAL_EVALUATION.MAXIMUM_FAILED_CASE_COUNT,
  })
  const positiveEntries = entries.filter((entry) => {
    return entry.result.reciprocalRank !== null
  })
  const semanticRelevantMatchRate = calcRate(
    positiveEntries.map((entry) => {
      return entry.result.expectedMatchUrls.some((expectedMatchUrl) => {
        return entry.liveSemanticObservation.matchUrls.includes(
          expectedMatchUrl,
        )
      })
    }),
  )
  const semanticMatchRate = calcRate(
    positiveEntries.map((entry) => {
      return entry.liveSemanticObservation.matchUrls.length > 0
    }),
  )
  const semanticRetrievalCoverage = calcRate(
    positiveEntries.map((entry) => {
      return entry.liveSemanticObservation.retrievalAttempted
    }),
  )
  const liveSemanticEvaluationPassed =
    !liveSemanticEvaluationEnabled ||
    (semanticRetrievalCoverage === 1 &&
      semanticRelevantMatchRate >=
        CHAT_RETRIEVAL_EVALUATION.MINIMUM_LIVE_SEMANTIC_RELEVANT_MATCH_RATE)
  const rerankFailures = entries
    .filter((entry) => {
      const requiresRerank = evaluationCases.find(
        (evaluationCase) => evaluationCase.id === entry.result.id,
      )?.requiresRerank
      return (
        liveSemanticEvaluationEnabled &&
        (requiresRerank || entry.liveSemanticObservation.rerankAttempted) &&
        !entry.liveSemanticObservation.rerankApplied
      )
    })
    .map((entry) => entry.result.id)
  const evaluationPassed =
    summary.passed &&
    liveSemanticEvaluationPassed &&
    rerankFailures.length === 0 &&
    caseReferenceIssues.length === 0

  console.log(
    JSON.stringify(
      {
        mode: liveSemanticEvaluationEnabled
          ? 'live-hybrid-corpus'
          : 'lexical-corpus',
        skippedCaseIds,
        rerankFailures,
        results: entries,
        caseReferenceIssues: caseReferenceIssues.map((issue) => {
          return formatChatRetrievalCaseReferenceIssue(issue)
        }),
        summary: {
          ...summary,
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
        failures: results
          .filter((result) => {
            return summary.failedCaseIds.includes(result.id)
          })
          .map((result) => {
            return buildFailureReport({
              result,
              corpusUrls: corpusUrlsByLocale.get(
                evaluationCases.find((evaluationCase) => {
                  return evaluationCase.id === result.id
                })?.locale ?? LOCALES.DEFAULT,
              ),
            })
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
