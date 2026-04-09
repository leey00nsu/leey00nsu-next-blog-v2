import '@/shared/lib/load-node-environment'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import {
  buildGraphRagChunks,
  buildGraphRagEntities,
} from '@/features/chat/lib/graph-rag-entities'
import { buildGraphRagRelations } from '@/features/chat/lib/graph-rag-relations'
import {
  createChatRagIndexRun,
  failChatRagIndexRun,
  getChatRagDatabasePool,
  initializeChatRagDatabase,
  isChatRagDatabaseConfigured,
  replaceChatRagLocaleIndex,
  activateChatRagIndexRun,
} from '@/features/chat/model/chat-rag-database'
import {
  embedChatRagTexts,
  isChatRagEmbeddingConfigured,
} from '@/features/chat/model/chat-rag-embedding-provider'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { LOCALES } from '@/shared/config/constants'

interface ChatRagChunkEmbedding {
  chunkId: string
  embedding: number[]
}

function buildBlogEvidenceRecords(
  locale: ChatEvidenceRecord['locale'],
): ChatEvidenceRecord[] {
  return (GENERATED_BLOG_SEARCH_RECORDS[locale] ?? []).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
    }
  })
}

function buildChunkEmbeddingText(record: ChatEvidenceRecord): string {
  return [
    record.title,
    record.sectionTitle ?? '',
    record.excerpt,
    record.content,
    record.tags.join(' '),
    (record.searchTerms ?? []).join(' '),
  ]
    .filter(Boolean)
    .join('\n')
}

async function embedChunkRecords(
  records: ChatEvidenceRecord[],
): Promise<ChatRagChunkEmbedding[]> {
  const chunkEmbeddings: ChatRagChunkEmbedding[] = []

  for (
    let startIndex = 0;
    startIndex < records.length;
    startIndex += CHAT_RAG.EMBEDDING.MAXIMUM_BATCH_SIZE
  ) {
    const currentRecords = records.slice(
      startIndex,
      startIndex + CHAT_RAG.EMBEDDING.MAXIMUM_BATCH_SIZE,
    )
    const embeddings = await embedChatRagTexts(
      currentRecords.map((record) => buildChunkEmbeddingText(record)),
    )

    chunkEmbeddings.push(
      ...currentRecords.map((record, index) => {
        return {
          chunkId: record.id,
          embedding: embeddings[index] ?? [],
        }
      }),
    )
  }

  return chunkEmbeddings
}

async function main(): Promise<void> {
  if (!isChatRagEmbeddingConfigured()) {
    console.warn(
      'Skipped Chat RAG Postgres indexing because the embedding provider is not configured.',
    )

    return
  }

  if (!isChatRagDatabaseConfigured()) {
    console.warn(
      'Skipped Chat RAG Postgres indexing because BLOG_CHAT_RAG_DATABASE_URL is not configured.',
    )

    return
  }

  const databasePool = await getChatRagDatabasePool()

  await initializeChatRagDatabase(databasePool)

  const indexRun = await createChatRagIndexRun({
    databaseClient: databasePool,
    commitSha: process.env.GITHUB_SHA,
  })

  let totalChunkCount = 0

  try {
    for (const locale of LOCALES.SUPPORTED) {
      const records = [
        ...buildBlogEvidenceRecords(locale),
        ...(await getCuratedChatSources(locale)),
      ]
      const chunks = buildGraphRagChunks(records)
      const entities = buildGraphRagEntities(records)
      const relations = buildGraphRagRelations(chunks)
      const embeddings = await embedChunkRecords(records)

      await replaceChatRagLocaleIndex({
        databaseClient: databasePool,
        indexVersion: indexRun.indexVersion,
        locale,
        chunks,
        entities,
        relations,
        embeddings,
      })

      totalChunkCount += chunks.length
    }

    await activateChatRagIndexRun({
      databaseClient: databasePool,
      indexVersion: indexRun.indexVersion,
    })

    console.log(
      `✅ Indexed ${totalChunkCount} chunk(s) into Postgres Chat RAG. Active version: ${indexRun.indexVersion}`,
    )
  } catch (error) {
    await failChatRagIndexRun({
      databaseClient: databasePool,
      indexVersion: indexRun.indexVersion,
    })

    throw error
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main().catch((error) => {
  console.error('Failed to generate Postgres Chat RAG index:', error)
  process.exitCode = 1
})
