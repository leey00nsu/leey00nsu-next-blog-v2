import { GRAPH_RAG } from '@/features/chat/config/graph-rag'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type {
  GraphRagChunk,
  GraphRagEntity,
  GraphRagEntityKind,
} from '@/features/chat/model/graph-rag'
import { collectSearchTerms } from '@/shared/lib/search-terms'

const GRAPH_RAG_ENTITY_PREFIX = {
  TITLE: 'title',
  TAG: 'tag',
  TERM: 'term',
} as const

function normalizeEntityName(name: string): string {
  return name.trim().toLowerCase()
}

function buildEntityId(
  locale: ChatEvidenceRecord['locale'],
  kind: GraphRagEntityKind,
  normalizedName: string,
): string {
  return `${locale}:${kind}:${normalizedName}`
}

function collectChunkEntityCandidates(
  record: ChatEvidenceRecord,
): Array<{ name: string; kind: GraphRagEntityKind }> {
  const termCandidates = collectSearchTerms({
    texts: [record.title, record.sectionTitle ?? '', record.excerpt],
    phrases: [...record.tags, ...(record.searchTerms ?? [])],
  })

  return [
    {
      name: record.title,
      kind: GRAPH_RAG_ENTITY_PREFIX.TITLE,
    },
    ...record.tags.map((tag) => {
      return {
        name: tag,
        kind: GRAPH_RAG_ENTITY_PREFIX.TAG,
      }
    }),
    ...termCandidates
      .slice(0, GRAPH_RAG.CHUNK_ENTITY_LIMIT)
      .map((termCandidate) => {
        return {
          name: termCandidate,
          kind: GRAPH_RAG_ENTITY_PREFIX.TERM,
        }
      }),
  ]
}

export function buildGraphRagChunks(
  records: ChatEvidenceRecord[],
): GraphRagChunk[] {
  return records.map((record) => {
    const entityIds = [
      ...new Set(
        collectChunkEntityCandidates(record).map((entityCandidate) => {
          return buildEntityId(
            record.locale,
            entityCandidate.kind,
            normalizeEntityName(entityCandidate.name),
          )
        }),
      ),
    ]

    return {
      id: record.id,
      locale: record.locale,
      slug: record.slug,
      title: record.title,
      url: record.url,
      excerpt: record.excerpt,
      content: record.content,
      sectionTitle: record.sectionTitle,
      tags: record.tags,
      searchTerms: record.searchTerms ?? [],
      publishedAt: record.publishedAt ?? null,
      sourceCategory: record.sourceCategory,
      entityIds,
    }
  })
}

export function buildGraphRagEntities(
  records: ChatEvidenceRecord[],
): GraphRagEntity[] {
  const entityMap = new Map<string, GraphRagEntity>()

  for (const record of records) {
    for (const entityCandidate of collectChunkEntityCandidates(record)) {
      const normalizedName = normalizeEntityName(entityCandidate.name)

      if (!normalizedName) {
        continue
      }

      const entityId = buildEntityId(
        record.locale,
        entityCandidate.kind,
        normalizedName,
      )
      const existingEntity = entityMap.get(entityId)

      if (!existingEntity) {
        entityMap.set(entityId, {
          id: entityId,
          locale: record.locale,
          name: entityCandidate.name,
          normalizedName,
          kind: entityCandidate.kind,
          chunkIds: [record.id],
        })
        continue
      }

      if (!existingEntity.chunkIds.includes(record.id)) {
        existingEntity.chunkIds.push(record.id)
      }
    }
  }

  return [...entityMap.values()]
}
