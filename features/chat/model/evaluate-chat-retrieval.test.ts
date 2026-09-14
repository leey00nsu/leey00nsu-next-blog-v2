import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES } from '@/features/chat/fixtures/chat-retrieval-corpus-evaluation'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import { collectCorpusEvidenceRecords } from '@/features/chat/model/collect-corpus-evidence-records'
import { evaluateChatRetrieval } from '@/features/chat/model/evaluate-chat-retrieval'

vi.mock('@/features/chat/model/chat-rag-workflow', () => ({
  runChatRagWorkflow: vi.fn(),
}))
vi.mock('@/features/chat/model/chat-rag-database', () => ({
  isChatRagDatabaseConfigured: () => true,
}))
vi.mock('@/features/chat/model/chat-rag-embedding-provider', () => ({
  isChatRagEmbeddingConfigured: () => true,
}))
vi.mock('@/features/chat/config/chat-models', () => ({
  getBlogChatRerankModel: () => 'test-model',
}))
vi.mock('@/features/chat/api/rerank-chat-evidence', () => ({
  rerankChatEvidence: async ({ matches }: { matches: unknown[] }) => ({
    matches,
    applied: true,
  }),
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('evaluateChatRetrieval', () => {
  it('두 semantic 실행이 실패하면 lexical이 전건 성공해도 후보 검증은 실패한다', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const corpus = [
      ...Object.values(await collectCorpusEvidenceRecords('ko')).flat(),
      ...Object.values(await collectCorpusEvidenceRecords('en')).flat(),
    ]
    const failedCases = CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.slice(0, 2)
    vi.mocked(runChatRagWorkflow).mockImplementation(async ({ question }) => {
      if (question === failedCases[0].retrievalPlan.standaloneQuestion) {
        return { grounded: false, matches: [], failureKind: 'workflow_error' }
      }
      if (question === failedCases[1].retrievalPlan.standaloneQuestion)
        throw new Error('endpoint unavailable')
      const evaluationCase = CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES.find(
        (entry) => entry.retrievalPlan.standaloneQuestion === question,
      )
      return {
        grounded: true,
        matches: corpus.filter((record) =>
          evaluationCase?.expectedMatchUrls.includes(record.url),
        ),
        failureKind: null,
      }
    })

    await expect(
      evaluateChatRetrieval({
        liveSemanticEvaluationEnabled: true,
        indexVersion: 'candidate',
      }),
    ).resolves.toBe(false)
    const report = JSON.parse(String(log.mock.calls[0][0]))
    expect(report.semanticFailures).toEqual(
      failedCases.map((entry) => entry.id),
    )
    expect(report.summary.semanticRelevantMatchRate).toBe(0.8)
    expect(report.summary.failedCaseIds).toEqual([])
    expect(report.summary.rankingPassed).toBe(true)
    expect(
      report.results
        .slice(0, 2)
        .every(
          (entry: { result: { recallAtThree: boolean } }) =>
            entry.result.recallAtThree,
        ),
    ).toBe(true)
  })
})
