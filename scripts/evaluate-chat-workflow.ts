import '@/shared/lib/load-node-environment'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import {
  getBlogChatAnswerModel,
  getBlogChatPlannerModel,
  getBlogChatRerankModel,
} from '@/features/chat/config/chat-models'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { buildChatEvidenceContext } from '@/features/chat/lib/build-chat-evidence-context'
import { isChatRagDatabaseConfigured } from '@/features/chat/model/chat-rag-database'
import { isChatRagEmbeddingConfigured } from '@/features/chat/model/chat-rag-embedding-provider'
import {
  BlogChatRequestSchema,
  type BlogChatModelDraft,
} from '@/features/chat/model/chat-schema'
import { runChatWorkflow } from '@/features/chat/model/chat-workflow'
import { collectCorpusEvidenceRecords } from '@/features/chat/model/collect-corpus-evidence-records'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'

const WORKFLOW_EVALUATION = {
  LOCALE: 'ko',
  LEEMAGE_URL: '/ko/projects/leemage#대용량-파일-업로드로-인한-서버-부하',
  CASES: [
    {
      id: 'leemage-upload',
      question: 'Leemage에서 Presigned URL을 사용한 이유가 뭐야?',
    },
    {
      id: 'latest-post-summary',
      question: '가장 최근에 게시한 블로그 글 한 편의 핵심 내용을 요약해줘.',
    },
    {
      id: 'unsupported-experience',
      question: '이윤수의 Kubernetes 클러스터 운영 경험을 설명해줘.',
    },
  ],
} as const

async function main(): Promise<void> {
  if (
    !process.env.OPENAI_API_KEY ||
    !isChatRagDatabaseConfigured() ||
    !isChatRagEmbeddingConfigured()
  ) {
    throw new Error(
      'Workflow evaluation requires OpenAI, the RAG database and the embedding provider.',
    )
  }
  getBlogChatPlannerModel()
  getBlogChatAnswerModel()
  getBlogChatRerankModel()
  const corpus = await collectCorpusEvidenceRecords(WORKFLOW_EVALUATION.LOCALE)
  const latestTimestamp = Math.max(
    ...corpus.blogRecords.map(
      (record) => Date.parse(record.publishedAt ?? '') || 0,
    ),
  )
  const latestUrls = new Set(
    corpus.blogRecords
      .filter(
        (record) => Date.parse(record.publishedAt ?? '') === latestTimestamp,
      )
      .map((record) => record.url),
  )
  if (latestUrls.size === 0)
    throw new Error('No dated blog records available for the latest-post case.')
  const results = []

  for (const evaluationCase of WORKFLOW_EVALUATION.CASES) {
    const startedAt = Date.now()
    const drafts: BlogChatModelDraft[] = []
    const contexts: string[] = []
    const result = await runChatWorkflow({
      request: BlogChatRequestSchema.parse({
        question: evaluationCase.question,
        locale: WORKFLOW_EVALUATION.LOCALE,
      }),
      dependencies: {
        // 검색·모델은 운영 경로를 사용하고 응답 캐시 읽기/쓰기만 제외한다.
        getCachedResponse: async () => null,
        setCachedResponse: async () => {},
        findSemanticResponse: async (): Promise<undefined> => {},
        storeSemanticResponse: async () => {},
        executeRetrievalPlan: (parameters) =>
          executeChatRetrievalPlan({ ...parameters, ...corpus }),
        answerQuestion: async (parameters) => {
          contexts.push(
            buildChatEvidenceContext({
              ...parameters,
              maximumRecordCount: BLOG_CHAT.PROMPT.MAXIMUM_CONTEXT_RECORD_COUNT,
              maximumCharacters: BLOG_CHAT.PROMPT.MAXIMUM_CONTEXT_CHARACTERS,
            }),
          )
          const answer = await answerBlogQuestion(parameters)
          if (answer.draftAnswer) drafts.push(answer.draftAnswer)
          return answer
        },
      },
    })
    const response = result.applicationResponse.response
    const matches = result.execution?.matches ?? []
    const failures: string[] = []
    if (result.cacheKind !== 'none') failures.push('unexpected_cache_hit')

    if (evaluationCase.id === 'unsupported-experience') {
      const isEvidenceRefusal =
        response.refusalReason === 'insufficient_search_match' ||
        response.refusalReason === 'insufficient_evidence'
      if (
        !isEvidenceRefusal ||
        response.grounded ||
        response.citations.length > 0
      )
        failures.push('unsupported_claim_not_refused')
      if (result.failureKind && result.failureKind !== 'ungrounded_answer')
        failures.push(result.failureKind)
    } else {
      if (result.failureKind) failures.push(result.failureKind)
      if (result.execution?.kind !== 'evidence' || drafts.length === 0)
        failures.push('generation_not_exercised')
      if (
        !response.grounded ||
        !response.answer.trim() ||
        response.refusalReason
      )
        failures.push('missing_grounded_answer')
      if (
        drafts.some((draft, index) =>
          draft.usedCitationUrls.some(
            (url) => !contexts[index]?.includes(`url=${url}\n`),
          ),
        )
      )
        failures.push('invalid_raw_citation')
      if (evaluationCase.id === 'leemage-upload') {
        if (
          !matches.some(
            (match) => match.url === WORKFLOW_EVALUATION.LEEMAGE_URL,
          ) ||
          !response.citations.some(
            (citation) => citation.url === WORKFLOW_EVALUATION.LEEMAGE_URL,
          )
        )
          failures.push('missing_upload_evidence')
      } else {
        if (
          result.retrievalPlan?.temporalStrategy !== 'single' ||
          result.retrievalPlan.temporalOrder !== 'latest'
        )
          failures.push('incorrect_temporal_plan')
        if (
          matches.length === 0 ||
          matches.some((match) => !latestUrls.has(match.url)) ||
          response.citations.length === 0 ||
          response.citations.some((citation) => !latestUrls.has(citation.url))
        )
          failures.push('incorrect_latest_document')
      }
    }
    const entry = {
      id: evaluationCase.id,
      passed: failures.length === 0,
      failures,
      durationMilliseconds: Date.now() - startedAt,
      retrievalPlan: result.retrievalPlan,
      matchUrls: matches.map((match) => match.url),
      drafts,
      response,
      evidenceContexts: contexts,
      graphPath: result.graphPath,
    }
    results.push(entry)
    console.log(JSON.stringify(entry, null, 2))
  }
  const passed = results.every((result) => result.passed)
  console.log(
    JSON.stringify({
      mode: 'live-workflow-without-response-cache',
      passed,
      totalCaseCount: results.length,
      note: 'Checks routing, retrieval and citation contracts. Review answer claims against the printed evidence; passing is not a semantic correctness guarantee.',
    }),
  )
  if (!passed) process.exitCode = 1
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main().catch((error) => {
  console.error('Failed to evaluate the chat workflow:', error)
  process.exitCode = 1
})
