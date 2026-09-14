import type { SupportedLocale } from '@/shared/config/constants'

export interface ChatRetrievalEvaluationCaseReference {
  id: string
  locale: SupportedLocale
  expectedMatchUrls: string[]
}

export interface ChatRetrievalCaseReferenceIssue {
  caseId: string
  expectedMatchUrl: string
}

/**
 * 평가 케이스가 가리키는 기대 근거가 지금 코퍼스에 실제로 있는지 확인한다.
 *
 * 문서가 개편되면 anchor가 사라져 케이스가 조용히 무효가 된다. 그때 "검색이 나빠졌다"와
 * "케이스가 낡았다"를 구분할 수 있도록, 없는 기대 근거를 따로 모아 돌려준다.
 */
export function collectChatRetrievalCaseReferenceIssues(params: {
  cases: ChatRetrievalEvaluationCaseReference[]
  corpusUrlsByLocale: Map<SupportedLocale, Set<string>>
}): ChatRetrievalCaseReferenceIssue[] {
  const issues: ChatRetrievalCaseReferenceIssue[] = []

  for (const evaluationCase of params.cases) {
    const corpusUrls = params.corpusUrlsByLocale.get(evaluationCase.locale)

    for (const expectedMatchUrl of evaluationCase.expectedMatchUrls) {
      if (!corpusUrls?.has(expectedMatchUrl)) {
        issues.push({
          caseId: evaluationCase.id,
          expectedMatchUrl,
        })
      }
    }
  }

  return issues
}

export function formatChatRetrievalCaseReferenceIssue(
  issue: ChatRetrievalCaseReferenceIssue,
): string {
  return `${issue.caseId}: 코퍼스에 없는 기대 근거 ${issue.expectedMatchUrl}`
}
