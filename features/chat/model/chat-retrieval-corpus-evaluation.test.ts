import { describe, expect, it } from 'vitest'
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
import {
  collectCorpusEvidenceRecords,
  type CorpusEvidenceRecords,
} from '@/features/chat/model/collect-corpus-evidence-records'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

const MAXIMUM_FAILED_CASE_COUNT = 0

const LEXICAL_EVALUATION_CASES = CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.filter(
  (evaluationCase) => {
    // lexical 경로로 도달할 수 없거나 리랭커가 있어야 하는 케이스는 결정적 검사에서 뺀다.
    return (
      !evaluationCase.requiresLiveSemantic && !evaluationCase.requiresRerank
    )
  },
)

const corpusRecordCache = new Map<SupportedLocale, CorpusEvidenceRecords>()

async function getCachedCorpusRecords(
  locale: SupportedLocale,
): Promise<CorpusEvidenceRecords> {
  const cachedRecords = corpusRecordCache.get(locale)

  if (cachedRecords) {
    return cachedRecords
  }

  const corpusRecords = await collectCorpusEvidenceRecords(locale)
  corpusRecordCache.set(locale, corpusRecords)

  return corpusRecords
}

async function collectCorpusUrlMap(): Promise<
  Map<SupportedLocale, Set<string>>
> {
  const corpusUrlMap = new Map<SupportedLocale, Set<string>>()

  for (const locale of LOCALES.SUPPORTED) {
    const { blogRecords, curatedRecords } = await getCachedCorpusRecords(locale)
    const recordUrls = [...blogRecords, ...curatedRecords].map((record) => {
      return record.url
    })

    corpusUrlMap.set(locale, new Set(recordUrls))
  }

  return corpusUrlMap
}

function formatFailedCase(params: {
  result: ChatRetrievalCaseResult
  corpusUrls: Set<string> | undefined
}): string {
  const isCaseOutdated = params.result.expectedMatchUrls.some(
    (expectedMatchUrl) => {
      return !params.corpusUrls?.has(expectedMatchUrl)
    },
  )
  const diagnosis = isCaseOutdated
    ? '케이스 무효: 기대 근거가 코퍼스에 없음 → 케이스를 갱신해야 함'
    : '검색 회귀: 기대 근거가 코퍼스에 있으나 상위 3건에 들지 못함'

  return [
    params.result.id,
    diagnosis,
    `기대: ${JSON.stringify(params.result.expectedMatchUrls)}`,
    `실제: ${JSON.stringify(params.result.matchUrls)}`,
  ].join('\n  ')
}

describe('chat retrieval corpus evaluation', () => {
  it('평가 케이스의 기대 근거가 현재 코퍼스에 존재한다', async () => {
    const corpusUrlMap = await collectCorpusUrlMap()
    const issues = collectChatRetrievalCaseReferenceIssues({
      cases: CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES,
      corpusUrlsByLocale: corpusUrlMap,
    })

    expect(
      issues.map((issue) => {
        return formatChatRetrievalCaseReferenceIssue(issue)
      }),
    ).toEqual([])
  })

  it('lexical 검색이 모든 평가 케이스에서 기대 근거를 답변 후보로 넘긴다', async () => {
    const corpusUrlMap = await collectCorpusUrlMap()
    const results: ChatRetrievalCaseResult[] = []

    for (const evaluationCase of LEXICAL_EVALUATION_CASES) {
      const { blogRecords, curatedRecords } = await getCachedCorpusRecords(
        evaluationCase.locale,
      )
      const execution = await executeChatRetrievalPlan({
        plan: evaluationCase.retrievalPlan,
        locale: evaluationCase.locale,
        blogRecords,
        curatedRecords,
        retrieveSemanticMatches: async () => [],
        rerankMatches: async ({ matches }) => {
          return { matches, applied: false }
        },
      })

      results.push(
        evaluateChatRetrievalCase({
          id: evaluationCase.id,
          refused: execution.kind === 'refusal',
          matchUrls: execution.matches.map((match) => {
            return match.url
          }),
          expectedMatchUrls: evaluationCase.expectedMatchUrls,
          expectRefusal: Boolean(evaluationCase.expectRefusal),
        }),
      )
    }

    const summary = summarizeChatRetrievalEvaluation({
      results,
      maximumFailedCaseCount: MAXIMUM_FAILED_CASE_COUNT,
    })
    const failedCaseMessages = results
      .filter((result) => {
        return summary.failedCaseIds.includes(result.id)
      })
      .map((result) => {
        return formatFailedCase({
          result,
          corpusUrls: corpusUrlMap.get(
            LEXICAL_EVALUATION_CASES.find((evaluationCase) => {
              return evaluationCase.id === result.id
            })?.locale ?? LOCALES.DEFAULT,
          ),
        })
      })

    expect(failedCaseMessages).toEqual([])
    expect(summary.rankingPassed).toBe(true)
  })
})
