import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import type {
  ChatEvidenceTime,
  ChatSourceCategory,
} from '@/features/chat/model/chat-evidence'
import type {
  GraphRagChunk,
  GraphRagEntity,
  GraphRagRelation,
} from '@/features/chat/model/graph-rag'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_RAG_DATABASE = {
  TABLES: {
    INDEX_VERSIONS: 'chat_rag_index_versions',
    ACTIVE_INDEX: 'chat_rag_active_index',
    CHUNKS: 'chat_rag_chunks',
    EMBEDDINGS: 'chat_rag_chunk_embeddings',
    ENTITIES: 'chat_rag_entities',
    RELATIONS: 'chat_rag_relations',
  },
  INDEX_STATUSES: {
    ACTIVE: 'active',
    BUILDING: 'building',
    FAILED: 'failed',
    STALE: 'stale',
  },
  ACTIVE_INDEX_SINGLETON_ID: 1,
  ACTIVE_INDEX_SINGLETON_ID_CONSTRAINT: 1,
} as const

export interface ChatRagSemanticCandidate extends GraphRagChunk {
  semanticSimilarity: number
}

export interface ChatRagLocaleSearchData {
  entities: GraphRagEntity[]
  relations: GraphRagRelation[]
  semanticCandidates: ChatRagSemanticCandidate[]
}

export interface ChatRagIndexRun {
  indexVersion: string
  status: (typeof CHAT_RAG_DATABASE.INDEX_STATUSES)[keyof typeof CHAT_RAG_DATABASE.INDEX_STATUSES]
  commitSha: string | null
  embeddingProvider: string
  embeddingModelId: string
  embeddingDimension: number | null
  chunkingVersion: string
}

interface ChatRagIndexConfigurationCheck {
  name: string
  indexedValue: unknown
  configuredValue: unknown
}

let chatRagDatabasePoolSingleton: Pool | null = null

function parseJsonArray<T>(jsonValue: unknown): T[] {
  if (Array.isArray(jsonValue)) {
    return jsonValue as T[]
  }

  if (typeof jsonValue !== 'string') {
    return []
  }

  return JSON.parse(jsonValue) as T[]
}

function buildVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

function normalizeBooleanEnvironmentValue(
  environmentValue: string | undefined,
): boolean {
  return environmentValue === 'true'
}

function normalizeDatabaseTimestamp(timestampValue: unknown): string | null {
  if (timestampValue instanceof Date) {
    return timestampValue.toISOString()
  }

  return typeof timestampValue === 'string' ? timestampValue : null
}

function mapEvidenceTime(
  row: Record<string, unknown>,
): ChatEvidenceTime | null {
  const value = normalizeDatabaseTimestamp(row.evidence_time_value)
  const kind = row.evidence_time_kind

  if (
    !value ||
    (kind !== 'published' &&
      kind !== 'updated' &&
      kind !== 'project_started' &&
      kind !== 'project_ended')
  ) {
    return null
  }

  return { kind, value }
}

function buildChatRagDatabasePool(): Pool {
  return new Pool({
    connectionString: CHAT_RAG.DATABASE.URL,
    ssl: CHAT_RAG.DATABASE.SSL
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    max: CHAT_RAG.DATABASE.MAXIMUM_CONNECTIONS,
  })
}

function assertChatRagDatabaseConfigured(): void {
  if (!CHAT_RAG.DATABASE.URL) {
    throw new Error(
      'BLOG_CHAT_RAG_DATABASE_URL is required to use Postgres Chat RAG.',
    )
  }
}

function mapChunkRowToGraphRagChunk(
  row: Record<string, unknown>,
): GraphRagChunk {
  return {
    id: String(row.id),
    locale: row.locale as SupportedLocale,
    slug: String(row.slug),
    title: String(row.title),
    url: String(row.url),
    excerpt: String(row.excerpt),
    content: String(row.content),
    sectionTitle:
      typeof row.section_title === 'string' ? row.section_title : null,
    tags: parseJsonArray<string>(row.tags_json),
    searchTerms: parseJsonArray<string>(row.search_terms_json),
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    evidenceTime: mapEvidenceTime(row),
    sourceCategory: row.source_category as GraphRagChunk['sourceCategory'],
    entityIds: parseJsonArray<string>(row.entity_ids_json),
  }
}

function mapEntityRowToGraphRagEntity(
  row: Record<string, unknown>,
): GraphRagEntity {
  return {
    id: String(row.id),
    locale: row.locale as SupportedLocale,
    name: String(row.name),
    normalizedName: String(row.normalized_name),
    kind: row.kind as GraphRagEntity['kind'],
    chunkIds: parseJsonArray<string>(row.chunk_ids_json),
  }
}

function mapRelationRowToGraphRagRelation(
  row: Record<string, unknown>,
): GraphRagRelation {
  return {
    id: String(row.id),
    locale: row.locale as SupportedLocale,
    sourceEntityId: String(row.source_entity_id),
    targetEntityId: String(row.target_entity_id),
    type: row.type as GraphRagRelation['type'],
    weight: Number(row.weight),
  }
}

function mapSemanticCandidateRow(
  row: Record<string, unknown>,
): ChatRagSemanticCandidate {
  return {
    ...mapChunkRowToGraphRagChunk(row),
    semanticSimilarity: Number(row.semantic_similarity),
  }
}

function buildChatRagIndexVersionId(commitSha?: string): string {
  const normalizedTimestamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replaceAll('T', '')
    .replaceAll('Z', '')
  const normalizedCommitSha = commitSha?.slice(0, 8) ?? 'manual'

  return `chat-rag-${normalizedTimestamp}-${normalizedCommitSha}-${randomUUID().slice(0, 8)}`
}

function isLegacyChatRagIndex(row: Record<string, unknown>): boolean {
  const indexMetadataValues = [
    row.embedding_provider,
    row.embedding_model_id,
    row.embedding_dimension,
    row.chunking_version,
  ]

  return indexMetadataValues.every((metadataValue) => {
    return metadataValue === null || metadataValue === undefined
  })
}

function assertActiveChatRagIndexConfiguration(params: {
  row: Record<string, unknown>
  questionEmbeddingDimension?: number
}): void {
  const configurationChecks: ChatRagIndexConfigurationCheck[] = [
    {
      name: 'embedding provider',
      indexedValue: params.row.embedding_provider,
      configuredValue: CHAT_RAG.EMBEDDING.PROVIDER,
    },
    {
      name: 'embedding model',
      indexedValue: params.row.embedding_model_id,
      configuredValue: CHAT_RAG.EMBEDDING.MODEL_ID,
    },
    {
      name: 'chunking version',
      indexedValue: params.row.chunking_version,
      configuredValue: CHAT_RAG.INDEX.CHUNKING_VERSION,
    },
  ]

  if (params.questionEmbeddingDimension !== undefined) {
    configurationChecks.push({
      name: 'embedding dimension',
      indexedValue: params.row.embedding_dimension,
      configuredValue: params.questionEmbeddingDimension,
    })
  }

  for (const configurationCheck of configurationChecks) {
    if (
      configurationCheck.indexedValue !== configurationCheck.configuredValue
    ) {
      throw new Error(
        `Active Chat RAG ${configurationCheck.name} does not match the current configuration. Rebuild the index before semantic retrieval.`,
      )
    }
  }
}

export function isChatRagDatabaseConfigured(): boolean {
  return Boolean(CHAT_RAG.DATABASE.URL)
}

export async function getChatRagDatabasePool(): Promise<Pool> {
  assertChatRagDatabaseConfigured()

  if (chatRagDatabasePoolSingleton) {
    return chatRagDatabasePoolSingleton
  }

  chatRagDatabasePoolSingleton = buildChatRagDatabasePool()

  return chatRagDatabasePoolSingleton
}

export async function initializeChatRagDatabase(
  databaseClient: Pool | PoolClient,
): Promise<void> {
  await databaseClient.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS} (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      commit_sha TEXT,
      embedding_provider TEXT,
      embedding_model_id TEXT,
      embedding_dimension INTEGER,
      chunking_version TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activated_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.ACTIVE_INDEX} (
      singleton_id SMALLINT PRIMARY KEY CHECK (singleton_id = ${CHAT_RAG_DATABASE.ACTIVE_INDEX_SINGLETON_ID_CONSTRAINT}),
      active_index_version TEXT NOT NULL REFERENCES ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.CHUNKS} (
      index_version TEXT NOT NULL REFERENCES ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      locale TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      section_title TEXT,
      tags_json JSONB NOT NULL,
      search_terms_json JSONB NOT NULL,
      published_at TIMESTAMPTZ,
      evidence_time_kind TEXT,
      evidence_time_value TIMESTAMPTZ,
      source_category TEXT NOT NULL,
      entity_ids_json JSONB NOT NULL,
      PRIMARY KEY (index_version, id)
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} (
      index_version TEXT NOT NULL REFERENCES ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}(id) ON DELETE CASCADE,
      chunk_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      embedding VECTOR NOT NULL,
      PRIMARY KEY (index_version, chunk_id),
      FOREIGN KEY (index_version, chunk_id) REFERENCES ${CHAT_RAG_DATABASE.TABLES.CHUNKS}(index_version, id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.ENTITIES} (
      index_version TEXT NOT NULL REFERENCES ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      locale TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      chunk_ids_json JSONB NOT NULL,
      PRIMARY KEY (index_version, id)
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.RELATIONS} (
      index_version TEXT NOT NULL REFERENCES ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      locale TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (index_version, id)
    );

    CREATE INDEX IF NOT EXISTS chat_rag_chunks_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.CHUNKS}(index_version, locale);

    CREATE INDEX IF NOT EXISTS chat_rag_entities_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.ENTITIES}(index_version, locale);

    CREATE INDEX IF NOT EXISTS chat_rag_relations_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.RELATIONS}(index_version, locale);

    CREATE INDEX IF NOT EXISTS chat_rag_embeddings_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS}(index_version, locale);

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.CHUNKS}
      ADD COLUMN IF NOT EXISTS evidence_time_kind TEXT;

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.CHUNKS}
      ADD COLUMN IF NOT EXISTS evidence_time_value TIMESTAMPTZ;

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      ADD COLUMN IF NOT EXISTS embedding_provider TEXT;

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      ADD COLUMN IF NOT EXISTS embedding_model_id TEXT;

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER;

    ALTER TABLE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      ADD COLUMN IF NOT EXISTS chunking_version TEXT;
  `)
}

export async function createChatRagIndexRun(params: {
  databaseClient: Pool | PoolClient
  commitSha?: string
}): Promise<ChatRagIndexRun> {
  const indexVersion = buildChatRagIndexVersionId(params.commitSha)

  await params.databaseClient.query(
    `
      INSERT INTO ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS} (
        id,
        status,
        commit_sha,
        embedding_provider,
        embedding_model_id,
        embedding_dimension,
        chunking_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      indexVersion,
      CHAT_RAG_DATABASE.INDEX_STATUSES.BUILDING,
      params.commitSha ?? null,
      CHAT_RAG.EMBEDDING.PROVIDER,
      CHAT_RAG.EMBEDDING.MODEL_ID,
      null,
      CHAT_RAG.INDEX.CHUNKING_VERSION,
    ],
  )

  return {
    indexVersion,
    status: CHAT_RAG_DATABASE.INDEX_STATUSES.BUILDING,
    commitSha: params.commitSha ?? null,
    embeddingProvider: CHAT_RAG.EMBEDDING.PROVIDER,
    embeddingModelId: CHAT_RAG.EMBEDDING.MODEL_ID,
    embeddingDimension: null,
    chunkingVersion: CHAT_RAG.INDEX.CHUNKING_VERSION,
  }
}

export async function replaceChatRagLocaleIndex(params: {
  databaseClient: Pool | PoolClient
  indexVersion: string
  locale: SupportedLocale
  chunks: GraphRagChunk[]
  entities: GraphRagEntity[]
  relations: GraphRagRelation[]
  embeddings: Array<{
    chunkId: string
    embedding: number[]
  }>
}): Promise<void> {
  await params.databaseClient.query(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.RELATIONS} WHERE index_version = $1 AND locale = $2`,
    [params.indexVersion, params.locale],
  )
  await params.databaseClient.query(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.ENTITIES} WHERE index_version = $1 AND locale = $2`,
    [params.indexVersion, params.locale],
  )
  await params.databaseClient.query(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} WHERE index_version = $1 AND locale = $2`,
    [params.indexVersion, params.locale],
  )
  await params.databaseClient.query(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.CHUNKS} WHERE index_version = $1 AND locale = $2`,
    [params.indexVersion, params.locale],
  )

  for (const chunk of params.chunks) {
    await params.databaseClient.query(
      `
        INSERT INTO ${CHAT_RAG_DATABASE.TABLES.CHUNKS} (
          index_version,
          id,
          locale,
          slug,
          title,
          url,
          excerpt,
          content,
          section_title,
          tags_json,
          search_terms_json,
          published_at,
          evidence_time_kind,
          evidence_time_value,
          source_category,
          entity_ids_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16::jsonb
        )
      `,
      [
        params.indexVersion,
        chunk.id,
        chunk.locale,
        chunk.slug,
        chunk.title,
        chunk.url,
        chunk.excerpt,
        chunk.content,
        chunk.sectionTitle,
        JSON.stringify(chunk.tags),
        JSON.stringify(chunk.searchTerms),
        chunk.publishedAt ?? null,
        chunk.evidenceTime?.kind ?? null,
        chunk.evidenceTime?.value ?? null,
        chunk.sourceCategory,
        JSON.stringify(chunk.entityIds),
      ],
    )
  }

  for (const embedding of params.embeddings) {
    await params.databaseClient.query(
      `
        INSERT INTO ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} (
          index_version,
          chunk_id,
          locale,
          embedding
        ) VALUES (
          $1, $2, $3, $4::vector
        )
      `,
      [
        params.indexVersion,
        embedding.chunkId,
        params.locale,
        buildVectorLiteral(embedding.embedding),
      ],
    )
  }

  for (const entity of params.entities) {
    await params.databaseClient.query(
      `
        INSERT INTO ${CHAT_RAG_DATABASE.TABLES.ENTITIES} (
          index_version,
          id,
          locale,
          name,
          normalized_name,
          kind,
          chunk_ids_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb
        )
      `,
      [
        params.indexVersion,
        entity.id,
        entity.locale,
        entity.name,
        entity.normalizedName,
        entity.kind,
        JSON.stringify(entity.chunkIds),
      ],
    )
  }

  for (const relation of params.relations) {
    await params.databaseClient.query(
      `
        INSERT INTO ${CHAT_RAG_DATABASE.TABLES.RELATIONS} (
          index_version,
          id,
          locale,
          source_entity_id,
          target_entity_id,
          type,
          weight
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `,
      [
        params.indexVersion,
        relation.id,
        relation.locale,
        relation.sourceEntityId,
        relation.targetEntityId,
        relation.type,
        relation.weight,
      ],
    )
  }
}

export async function activateChatRagIndexRun(params: {
  databaseClient: PoolClient
  indexVersion: string
  embeddingDimension: number
}): Promise<void> {
  await params.databaseClient.query('BEGIN')

  try {
    await params.databaseClient.query(
      `
        UPDATE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
        SET status = CASE
          WHEN id = $1 THEN $2
          WHEN status = $2 THEN $3
          ELSE status
        END,
        activated_at = CASE
          WHEN id = $1 THEN NOW()
          ELSE activated_at
        END,
        embedding_dimension = CASE
          WHEN id = $1 THEN $4
          ELSE embedding_dimension
        END
      `,
      [
        params.indexVersion,
        CHAT_RAG_DATABASE.INDEX_STATUSES.ACTIVE,
        CHAT_RAG_DATABASE.INDEX_STATUSES.STALE,
        params.embeddingDimension,
      ],
    )

    await params.databaseClient.query(
      `
        INSERT INTO ${CHAT_RAG_DATABASE.TABLES.ACTIVE_INDEX} (
          singleton_id,
          active_index_version
        ) VALUES ($1, $2)
        ON CONFLICT (singleton_id)
        DO UPDATE SET active_index_version = EXCLUDED.active_index_version
      `,
      [CHAT_RAG_DATABASE.ACTIVE_INDEX_SINGLETON_ID, params.indexVersion],
    )

    await params.databaseClient.query(
      `
        DELETE FROM ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
        WHERE status IN ($1, $2)
          AND id <> $3
      `,
      [
        CHAT_RAG_DATABASE.INDEX_STATUSES.STALE,
        CHAT_RAG_DATABASE.INDEX_STATUSES.FAILED,
        params.indexVersion,
      ],
    )

    await params.databaseClient.query('COMMIT')
  } catch (error) {
    await params.databaseClient.query('ROLLBACK')
    throw error
  }
}

export async function failChatRagIndexRun(params: {
  databaseClient: Pool | PoolClient
  indexVersion: string
}): Promise<void> {
  await params.databaseClient.query(
    `
      UPDATE ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      SET status = $2
      WHERE id = $1
    `,
    [params.indexVersion, CHAT_RAG_DATABASE.INDEX_STATUSES.FAILED],
  )
}

export async function deleteChatRagIndexRunData(params: {
  databaseClient: Pool | PoolClient
  indexVersion: string
}): Promise<void> {
  await params.databaseClient.query(
    `
      DELETE FROM ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS}
      WHERE id = $1
    `,
    [params.indexVersion],
  )
}

export async function selectActiveChatRagIndexVersion(params: {
  databaseClient: Pool | PoolClient
  questionEmbeddingDimension?: number
}): Promise<string | null> {
  const activeIndexResult = await params.databaseClient.query(
    `
      SELECT
        active_index.active_index_version,
        index_versions.embedding_provider,
        index_versions.embedding_model_id,
        index_versions.embedding_dimension,
        index_versions.chunking_version
      FROM ${CHAT_RAG_DATABASE.TABLES.ACTIVE_INDEX} AS active_index
      INNER JOIN ${CHAT_RAG_DATABASE.TABLES.INDEX_VERSIONS} AS index_versions
        ON index_versions.id = active_index.active_index_version
      WHERE active_index.singleton_id = $1
    `,
    [CHAT_RAG_DATABASE.ACTIVE_INDEX_SINGLETON_ID],
  )

  const activeIndexRow = activeIndexResult.rows[0]

  if (activeIndexRow && isLegacyChatRagIndex(activeIndexRow)) {
    return null
  }

  if (activeIndexRow) {
    assertActiveChatRagIndexConfiguration({
      row: activeIndexRow,
      questionEmbeddingDimension: params.questionEmbeddingDimension,
    })
  }

  return typeof activeIndexRow?.active_index_version === 'string'
    ? activeIndexRow.active_index_version
    : null
}

export async function selectChatRagLocaleSearchData(params: {
  databaseClient: Pool | PoolClient
  locale: SupportedLocale
  questionEmbedding: number[]
  maximumSemanticCandidates: number
  sourceCategory?: ChatSourceCategory | null
  slug?: string | null
}): Promise<ChatRagLocaleSearchData> {
  const activeIndexVersion = await selectActiveChatRagIndexVersion({
    databaseClient: params.databaseClient,
    questionEmbeddingDimension:
      params.questionEmbedding.length > 0
        ? params.questionEmbedding.length
        : undefined,
  })

  if (!activeIndexVersion) {
    return {
      entities: [],
      relations: [],
      semanticCandidates: [],
    }
  }

  const entityResult = await params.databaseClient.query(
    `
      SELECT id, locale, name, normalized_name, kind, chunk_ids_json
      FROM ${CHAT_RAG_DATABASE.TABLES.ENTITIES}
      WHERE index_version = $1 AND locale = $2
    `,
    [activeIndexVersion, params.locale],
  )
  const relationResult = await params.databaseClient.query(
    `
      SELECT id, locale, source_entity_id, target_entity_id, type, weight::float8 AS weight
      FROM ${CHAT_RAG_DATABASE.TABLES.RELATIONS}
      WHERE index_version = $1 AND locale = $2
    `,
    [activeIndexVersion, params.locale],
  )

  if (params.questionEmbedding.length === 0) {
    return {
      entities: entityResult.rows.map((row) => {
        return mapEntityRowToGraphRagEntity(row)
      }),
      relations: relationResult.rows.map((row) => {
        return mapRelationRowToGraphRagRelation(row)
      }),
      semanticCandidates: [],
    }
  }

  const semanticFilterClauses: string[] = []
  const semanticFilterValues: Array<string | number> = [
    activeIndexVersion,
    params.locale,
    buildVectorLiteral(params.questionEmbedding),
    params.maximumSemanticCandidates,
  ]

  if (params.sourceCategory) {
    semanticFilterValues.push(params.sourceCategory)
    semanticFilterClauses.push(
      `AND chunks.source_category = $${semanticFilterValues.length}`,
    )
  }

  if (params.slug) {
    semanticFilterValues.push(params.slug)
    semanticFilterClauses.push(
      `AND chunks.slug = $${semanticFilterValues.length}`,
    )
  }

  const semanticCandidateResult = await params.databaseClient.query(
    `
      SELECT
        chunks.id,
        chunks.locale,
        chunks.slug,
        chunks.title,
        chunks.url,
        chunks.excerpt,
        chunks.content,
        chunks.section_title,
        chunks.tags_json,
        chunks.search_terms_json,
        chunks.published_at,
        chunks.evidence_time_kind,
        chunks.evidence_time_value,
        chunks.source_category,
        chunks.entity_ids_json,
        GREATEST(0, 1 - (embeddings.embedding <=> $3::vector))::float8 AS semantic_similarity
      FROM ${CHAT_RAG_DATABASE.TABLES.CHUNKS} AS chunks
      INNER JOIN ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} AS embeddings
        ON embeddings.index_version = chunks.index_version
        AND embeddings.chunk_id = chunks.id
      WHERE chunks.index_version = $1
        AND chunks.locale = $2
        ${semanticFilterClauses.join('\n        ')}
      ORDER BY embeddings.embedding <=> $3::vector ASC
      LIMIT $4
    `,
    semanticFilterValues,
  )

  return {
    entities: entityResult.rows.map((row) => {
      return mapEntityRowToGraphRagEntity(row)
    }),
    relations: relationResult.rows.map((row) => {
      return mapRelationRowToGraphRagRelation(row)
    }),
    semanticCandidates: semanticCandidateResult.rows.map((row) => {
      return mapSemanticCandidateRow(row)
    }),
  }
}

export function getChatRagDatabaseSslEnabled(): boolean {
  return normalizeBooleanEnvironmentValue(
    process.env.BLOG_CHAT_RAG_DATABASE_SSL,
  )
}
