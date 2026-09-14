import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { SupportedLocale } from '@/shared/config/constants'

export interface CorpusEvidenceRecords {
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
}

function buildBlogEvidenceRecords(
  locale: SupportedLocale,
): ChatEvidenceRecord[] {
  return (GENERATED_BLOG_SEARCH_RECORDS[locale] ?? []).map((record) => {
    return {
      ...record,
      evidenceTime: record.publishedAt
        ? { kind: 'published' as const, value: record.publishedAt }
        : null,
      sourceCategory: 'blog' as const,
    }
  })
}

/**
 * 평가와 인덱싱이 실제로 검색 대상으로 삼는 코퍼스를 그대로 모은다.
 *
 * 빌드가 만든 blog 검색 레코드와 curated source(소개/프로젝트/assistant 문서)를 함께 돌려주므로,
 * MDX나 생성 규칙이 바뀐 결과를 실제 입력으로 검사할 수 있다.
 */
export async function collectCorpusEvidenceRecords(
  locale: SupportedLocale,
): Promise<CorpusEvidenceRecords> {
  return {
    blogRecords: buildBlogEvidenceRecords(locale),
    curatedRecords: await getCuratedChatSources(locale),
  }
}
