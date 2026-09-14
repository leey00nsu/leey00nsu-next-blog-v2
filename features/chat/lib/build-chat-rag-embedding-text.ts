export interface ChatRagEmbeddingTextSource {
  title: string
  sectionTitle: string | null
  content: string
  tags: string[]
  searchTerms: string[]
}

const CHAT_RAG_EMBEDDING_TEXT = {
  FIELD_SEPARATOR: '\n',
  TERM_SEPARATOR: ' ',
} as const

function normalizeComparisonText(text: string): string {
  return text.trim().toLowerCase()
}

function collectUniqueTerms(termValues: string[]): string[] {
  const termMap = new Map<string, string>()

  for (const termValue of termValues) {
    const trimmedTerm = termValue.trim()
    const normalizedTerm = normalizeComparisonText(trimmedTerm)

    if (!normalizedTerm || termMap.has(normalizedTerm)) {
      continue
    }

    termMap.set(normalizedTerm, trimmedTerm)
  }

  return [...termMap.values()]
}

/**
 * 청크 임베딩 입력 텍스트를 만든다.
 *
 * 임베딩 모델은 입력을 최대 토큰 길이까지만 읽고 뒤를 버린다. 그래서 순서가 곧 우선순위다.
 * 제목과 섹션 제목으로 문맥을 잡고, 본문을 먼저 채운 뒤, 남는 예산에 청크 전체 어휘를 담은
 * 용어 목록을 둔다. 본문이 짧아 예산이 남을 때만 용어 목록이 실제로 읽히므로, 본문을 밀어내지
 * 않으면서 짧은 청크의 어휘 신호를 보강한다.
 * excerpt는 같은 청크 content 앞부분의 사본이라 예산을 중복 사용하므로 넣지 않는다.
 */
export function buildChatRagEmbeddingText(
  source: ChatRagEmbeddingTextSource,
): string {
  const title = source.title.trim()
  const sectionTitle = source.sectionTitle?.trim() ?? ''
  const headerText = normalizeComparisonText([title, sectionTitle].join(' '))
  const termCloud = collectUniqueTerms([...source.tags, ...source.searchTerms])
    .filter((term) => {
      return !headerText.includes(normalizeComparisonText(term))
    })
    .join(CHAT_RAG_EMBEDDING_TEXT.TERM_SEPARATOR)
  const content = source.content.trim()

  return [title, sectionTitle, content, termCloud]
    .filter(Boolean)
    .join(CHAT_RAG_EMBEDDING_TEXT.FIELD_SEPARATOR)
}
