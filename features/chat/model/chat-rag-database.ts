import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'
import type {
  GraphRagChunk,
  GraphRagEntity,
  GraphRagRelation,
} from '@/features/chat/model/graph-rag'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_RAG_DATABASE = {
  PRAGMA_STATEMENTS: ['journal_mode = WAL', 'foreign_keys = ON'],
  TABLES: {
    CHUNKS: 'chat_rag_chunks',
    EMBEDDINGS: 'chat_rag_chunk_embeddings',
    ENTITIES: 'chat_rag_entities',
    RELATIONS: 'chat_rag_relations',
  },
} as const

export interface ChatRagChunkEmbedding {
  chunkId: string
  embedding: number[]
}

export interface ChatRagLocaleIndex {
  chunks: GraphRagChunk[]
  entities: GraphRagEntity[]
  relations: GraphRagRelation[]
  embeddings: ChatRagChunkEmbedding[]
}

let chatRagDatabaseSingleton: Database.Database | null = null

function createDatabaseDirectory(databaseFilePath: string): void {
  fs.mkdirSync(path.dirname(databaseFilePath), {
    recursive: true,
  })
}

function parseJsonArray<T>(jsonValue: string): T[] {
  return JSON.parse(jsonValue) as T[]
}

export function initializeChatRagDatabase(database: Database.Database): void {
  for (const pragmaStatement of CHAT_RAG_DATABASE.PRAGMA_STATEMENTS) {
    database.pragma(pragmaStatement)
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.CHUNKS} (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      section_title TEXT,
      tags_json TEXT NOT NULL,
      search_terms_json TEXT NOT NULL,
      published_at TEXT,
      source_category TEXT NOT NULL,
      entity_ids_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} (
      chunk_id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      embedding_json TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES ${CHAT_RAG_DATABASE.TABLES.CHUNKS}(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.ENTITIES} (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      chunk_ids_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${CHAT_RAG_DATABASE.TABLES.RELATIONS} (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS chat_rag_chunks_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.CHUNKS}(locale);

    CREATE INDEX IF NOT EXISTS chat_rag_embeddings_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS}(locale);

    CREATE INDEX IF NOT EXISTS chat_rag_entities_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.ENTITIES}(locale);

    CREATE INDEX IF NOT EXISTS chat_rag_relations_locale_index
    ON ${CHAT_RAG_DATABASE.TABLES.RELATIONS}(locale);
  `)
}

export function getChatRagDatabase(): Database.Database {
  if (chatRagDatabaseSingleton) {
    return chatRagDatabaseSingleton
  }

  createDatabaseDirectory(CHAT_RAG.DATABASE.FILE_PATH)

  chatRagDatabaseSingleton = new Database(CHAT_RAG.DATABASE.FILE_PATH)
  initializeChatRagDatabase(chatRagDatabaseSingleton)

  return chatRagDatabaseSingleton
}

export function replaceChatRagLocaleIndex(params: {
  database: Database.Database
  locale: SupportedLocale
  chunks: GraphRagChunk[]
  entities: GraphRagEntity[]
  relations: GraphRagRelation[]
  embeddings: ChatRagChunkEmbedding[]
}): void {
  const deleteChunksStatement = params.database.prepare(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.CHUNKS} WHERE locale = ?`,
  )
  const deleteEmbeddingsStatement = params.database.prepare(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} WHERE locale = ?`,
  )
  const deleteEntitiesStatement = params.database.prepare(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.ENTITIES} WHERE locale = ?`,
  )
  const deleteRelationsStatement = params.database.prepare(
    `DELETE FROM ${CHAT_RAG_DATABASE.TABLES.RELATIONS} WHERE locale = ?`,
  )
  const insertChunkStatement = params.database.prepare(`
    INSERT INTO ${CHAT_RAG_DATABASE.TABLES.CHUNKS} (
      id, locale, slug, title, url, excerpt, content, section_title,
      tags_json, search_terms_json, published_at, source_category, entity_ids_json
    ) VALUES (
      @id, @locale, @slug, @title, @url, @excerpt, @content, @sectionTitle,
      @tagsJson, @searchTermsJson, @publishedAt, @sourceCategory, @entityIdsJson
    )
  `)
  const insertEmbeddingStatement = params.database.prepare(`
    INSERT INTO ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} (
      chunk_id, locale, embedding_json
    ) VALUES (
      @chunkId, @locale, @embeddingJson
    )
  `)
  const insertEntityStatement = params.database.prepare(`
    INSERT INTO ${CHAT_RAG_DATABASE.TABLES.ENTITIES} (
      id, locale, name, normalized_name, kind, chunk_ids_json
    ) VALUES (
      @id, @locale, @name, @normalizedName, @kind, @chunkIdsJson
    )
  `)
  const insertRelationStatement = params.database.prepare(`
    INSERT INTO ${CHAT_RAG_DATABASE.TABLES.RELATIONS} (
      id, locale, source_entity_id, target_entity_id, type, weight
    ) VALUES (
      @id, @locale, @sourceEntityId, @targetEntityId, @type, @weight
    )
  `)

  const replaceTransaction = params.database.transaction(() => {
    deleteEmbeddingsStatement.run(params.locale)
    deleteChunksStatement.run(params.locale)
    deleteEntitiesStatement.run(params.locale)
    deleteRelationsStatement.run(params.locale)

    for (const chunk of params.chunks) {
      insertChunkStatement.run({
        id: chunk.id,
        locale: chunk.locale,
        slug: chunk.slug,
        title: chunk.title,
        url: chunk.url,
        excerpt: chunk.excerpt,
        content: chunk.content,
        sectionTitle: chunk.sectionTitle,
        tagsJson: JSON.stringify(chunk.tags),
        searchTermsJson: JSON.stringify(chunk.searchTerms),
        publishedAt: chunk.publishedAt ?? null,
        sourceCategory: chunk.sourceCategory,
        entityIdsJson: JSON.stringify(chunk.entityIds),
      })
    }

    for (const embedding of params.embeddings) {
      insertEmbeddingStatement.run({
        chunkId: embedding.chunkId,
        locale: params.locale,
        embeddingJson: JSON.stringify(embedding.embedding),
      })
    }

    for (const entity of params.entities) {
      insertEntityStatement.run({
        id: entity.id,
        locale: entity.locale,
        name: entity.name,
        normalizedName: entity.normalizedName,
        kind: entity.kind,
        chunkIdsJson: JSON.stringify(entity.chunkIds),
      })
    }

    for (const relation of params.relations) {
      insertRelationStatement.run(relation)
    }
  })

  replaceTransaction()
}

export function selectChatRagLocaleIndex(params: {
  database: Database.Database
  locale: SupportedLocale
}): ChatRagLocaleIndex {
  const chunkRows = params.database
    .prepare(
      `SELECT * FROM ${CHAT_RAG_DATABASE.TABLES.CHUNKS} WHERE locale = ?`,
    )
    .all(params.locale) as Array<{
    id: string
    locale: SupportedLocale
    slug: string
    title: string
    url: string
    excerpt: string
    content: string
    section_title: string | null
    tags_json: string
    search_terms_json: string
    published_at: string | null
    source_category: GraphRagChunk['sourceCategory']
    entity_ids_json: string
  }>
  const embeddingRows = params.database
    .prepare(
      `SELECT * FROM ${CHAT_RAG_DATABASE.TABLES.EMBEDDINGS} WHERE locale = ?`,
    )
    .all(params.locale) as Array<{
    chunk_id: string
    embedding_json: string
  }>
  const entityRows = params.database
    .prepare(
      `SELECT * FROM ${CHAT_RAG_DATABASE.TABLES.ENTITIES} WHERE locale = ?`,
    )
    .all(params.locale) as Array<{
    id: string
    locale: SupportedLocale
    name: string
    normalized_name: string
    kind: GraphRagEntity['kind']
    chunk_ids_json: string
  }>
  const relationRows = params.database
    .prepare(
      `SELECT * FROM ${CHAT_RAG_DATABASE.TABLES.RELATIONS} WHERE locale = ?`,
    )
    .all(params.locale) as Array<{
    id: string
    locale: SupportedLocale
    source_entity_id: string
    target_entity_id: string
    type: GraphRagRelation['type']
    weight: number
  }>

  return {
    chunks: chunkRows.map((chunkRow) => {
      return {
        id: chunkRow.id,
        locale: chunkRow.locale,
        slug: chunkRow.slug,
        title: chunkRow.title,
        url: chunkRow.url,
        excerpt: chunkRow.excerpt,
        content: chunkRow.content,
        sectionTitle: chunkRow.section_title,
        tags: parseJsonArray<string>(chunkRow.tags_json),
        searchTerms: parseJsonArray<string>(chunkRow.search_terms_json),
        publishedAt: chunkRow.published_at,
        sourceCategory: chunkRow.source_category,
        entityIds: parseJsonArray<string>(chunkRow.entity_ids_json),
      }
    }),
    embeddings: embeddingRows.map((embeddingRow) => {
      return {
        chunkId: embeddingRow.chunk_id,
        embedding: parseJsonArray<number>(embeddingRow.embedding_json),
      }
    }),
    entities: entityRows.map((entityRow) => {
      return {
        id: entityRow.id,
        locale: entityRow.locale,
        name: entityRow.name,
        normalizedName: entityRow.normalized_name,
        kind: entityRow.kind,
        chunkIds: parseJsonArray<string>(entityRow.chunk_ids_json),
      }
    }),
    relations: relationRows.map((relationRow) => {
      return {
        id: relationRow.id,
        locale: relationRow.locale,
        sourceEntityId: relationRow.source_entity_id,
        targetEntityId: relationRow.target_entity_id,
        type: relationRow.type,
        weight: relationRow.weight,
      }
    }),
  }
}
