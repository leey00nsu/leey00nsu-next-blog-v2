import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
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
    publishedAt:
      typeof row.published_at === 'string' ? row.published_at : null,
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
        commit_sha
      ) VALUES ($1, $2, $3)
    `,
    [
      indexVersion,
      CHAT_RAG_DATABASE.INDEX_STATUSES.BUILDING,
      params.commitSha ?? null,
    ],
  )

  return {
    indexVersion,
    status: CHAT_RAG_DATABASE.INDEX_STATUSES.BUILDING,
    commitSha: params.commitSha ?? null,
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
          source_category,
          entity_ids_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10::jsonb, $11::jsonb, $12, $13, $14::jsonb
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
  databaseClient: Pool | PoolClient
  indexVersion: string
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
        END
      `,
      [
        params.indexVersion,
        CHAT_RAG_DATABASE.INDEX_STATUSES.ACTIVE,
        CHAT_RAG_DATABASE.INDEX_STATUSES.STALE,
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
      [
        CHAT_RAG_DATABASE.ACTIVE_INDEX_SINGLETON_ID,
        params.indexVersion,
      ],
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
}): Promise<string | null> {
  const activeIndexResult = await params.databaseClient.query(
    `
      SELECT active_index_version
      FROM ${CHAT_RAG_DATABASE.TABLES.ACTIVE_INDEX}
      WHERE singleton_id = $1
    `,
    [CHAT_RAG_DATABASE.ACTIVE_INDEX_SINGLETON_ID],
  )

  const activeIndexRow = activeIndexResult.rows[0]

  return typeof activeIndexRow?.active_index_version === 'string'
    ? activeIndexRow.active_index_version
    : null
}

export async function selectChatRagLocaleSearchData(params: {
  databaseClient: Pool | PoolClient
  locale: SupportedLocale
  questionEmbedding: number[]
  maximumSemanticCandidates: number
}): Promise<ChatRagLocaleSearchData> {
  const activeIndexVersion = await selectActiveChatRagIndexVersion({
    databaseClient: params.databaseClient,
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
        chunks.source_category,
        chunks.entity_ids_json,
        GREATEST(0, 1 - (embeddings.embedding <=> $3::vector))::float8 AS semantic_similarity
      FROM ${CHAT_RAG_DATABASE.TABLES.CHUNKS} AS chunks
      INNER JOIN ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} AS embeddings
        ON embeddings.index_version = chunks.index_version
        AND embeddings.chunk_id = chunks.id
      WHERE chunks.index_version = $1
        AND chunks.locale = $2
      ORDER BY embeddings.embedding <=> $3::vector ASC
      LIMIT $4
    `,
    [
      activeIndexVersion,
      params.locale,
      buildVectorLiteral(params.questionEmbedding),
      params.maximumSemanticCandidates,
    ],
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
