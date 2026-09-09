CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "chat_observability_events" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locale" TEXT NOT NULL,
    "original_question" TEXT NOT NULL,
    "resolved_question" TEXT,
    "normalized_question" TEXT,
    "current_post_slug" TEXT,
    "cache_kind" TEXT NOT NULL,
    "reranked" BOOLEAN NOT NULL DEFAULT false,
    "planner_reason" TEXT,
    "planner_action" TEXT,
    "planner_retrieval_mode" TEXT,
    "planner_deterministic_action" TEXT,
    "preferred_source_categories_json" JSONB NOT NULL,
    "additional_keywords_json" JSONB NOT NULL,
    "lexical_matches_json" JSONB NOT NULL,
    "semantic_matches_json" JSONB NOT NULL,
    "final_matches_json" JSONB NOT NULL,
    "citations_json" JSONB NOT NULL,
    "grounded" BOOLEAN NOT NULL,
    "refusal_reason" TEXT,
    "duration_milliseconds" INTEGER NOT NULL,
    "answer" TEXT,
    "intent_operation" TEXT,
    "intent_target_kind" TEXT,
    "intent_evidence_scope" TEXT,
    "intent_temporal_order" TEXT,
    "intent_requested_fields_json" JSONB NOT NULL DEFAULT '[]',
    "intent_required_concepts_json" JSONB NOT NULL DEFAULT '[]',
    "intent_optional_concepts_json" JSONB NOT NULL DEFAULT '[]',
    "planner_failure_kind" TEXT,
    "query_operation" TEXT,
    "source_strategy" TEXT,
    "source_categories_json" JSONB NOT NULL DEFAULT '[]',
    "temporal_strategy" TEXT,
    "temporal_order" TEXT,
    "execution_kind" TEXT,
    "graph_path_json" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "chat_observability_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rag_active_index" (
    "singleton_id" SMALLINT NOT NULL,
    "active_index_version" TEXT NOT NULL,

    CONSTRAINT "chat_rag_active_index_pkey" PRIMARY KEY ("singleton_id")
);

-- CreateTable
CREATE TABLE "chat_rag_chunk_embeddings" (
    "index_version" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "embedding" vector NOT NULL,

    CONSTRAINT "chat_rag_chunk_embeddings_pkey" PRIMARY KEY ("index_version","chunk_id")
);

-- CreateTable
CREATE TABLE "chat_rag_chunks" (
    "index_version" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "section_title" TEXT,
    "tags_json" JSONB NOT NULL,
    "search_terms_json" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "source_category" TEXT NOT NULL,
    "entity_ids_json" JSONB NOT NULL,
    "evidence_time_kind" TEXT,
    "evidence_time_value" TIMESTAMPTZ(6),

    CONSTRAINT "chat_rag_chunks_pkey" PRIMARY KEY ("index_version","id")
);

-- CreateTable
CREATE TABLE "chat_rag_entities" (
    "index_version" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "chunk_ids_json" JSONB NOT NULL,

    CONSTRAINT "chat_rag_entities_pkey" PRIMARY KEY ("index_version","id")
);

-- CreateTable
CREATE TABLE "chat_rag_index_versions" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "commit_sha" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMPTZ(6),
    "embedding_provider" TEXT,
    "embedding_model_id" TEXT,
    "embedding_dimension" INTEGER,
    "chunking_version" TEXT,

    CONSTRAINT "chat_rag_index_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rag_relations" (
    "index_version" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "source_entity_id" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" REAL NOT NULL,

    CONSTRAINT "chat_rag_relations_pkey" PRIMARY KEY ("index_version","id")
);

-- CreateTable
CREATE TABLE "engagement_events" (
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_name" TEXT NOT NULL,
    "anonymous_visitor_id_hash" TEXT NOT NULL,
    "session_id_hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "page_path" TEXT NOT NULL,
    "content_slug" TEXT,
    "document_kind" TEXT,
    "target_kind" TEXT,
    "referrer_host" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "device_category" TEXT NOT NULL,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "chat_observability_events_created_at_index" ON "chat_observability_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_rag_embeddings_locale_index" ON "chat_rag_chunk_embeddings"("index_version", "locale");

-- CreateIndex
CREATE INDEX "chat_rag_chunks_locale_index" ON "chat_rag_chunks"("index_version", "locale");

-- CreateIndex
CREATE INDEX "chat_rag_entities_locale_index" ON "chat_rag_entities"("index_version", "locale");

-- CreateIndex
CREATE INDEX "chat_rag_relations_locale_index" ON "chat_rag_relations"("index_version", "locale");

-- CreateIndex
CREATE INDEX "engagement_events_content_slug_created_at_index" ON "engagement_events"("content_slug", "created_at" DESC) WHERE (content_slug IS NOT NULL);

-- CreateIndex
CREATE INDEX "engagement_events_created_at_index" ON "engagement_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "engagement_events_name_created_at_index" ON "engagement_events"("event_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "engagement_events_visitor_created_at_index" ON "engagement_events"("anonymous_visitor_id_hash", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "chat_rag_active_index" ADD CONSTRAINT "chat_rag_active_index_active_index_version_fkey" FOREIGN KEY ("active_index_version") REFERENCES "chat_rag_index_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_rag_chunk_embeddings" ADD CONSTRAINT "chat_rag_chunk_embeddings_index_version_chunk_id_fkey" FOREIGN KEY ("index_version", "chunk_id") REFERENCES "chat_rag_chunks"("index_version", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_rag_chunk_embeddings" ADD CONSTRAINT "chat_rag_chunk_embeddings_index_version_fkey" FOREIGN KEY ("index_version") REFERENCES "chat_rag_index_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_rag_chunks" ADD CONSTRAINT "chat_rag_chunks_index_version_fkey" FOREIGN KEY ("index_version") REFERENCES "chat_rag_index_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_rag_entities" ADD CONSTRAINT "chat_rag_entities_index_version_fkey" FOREIGN KEY ("index_version") REFERENCES "chat_rag_index_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_rag_relations" ADD CONSTRAINT "chat_rag_relations_index_version_fkey" FOREIGN KEY ("index_version") REFERENCES "chat_rag_index_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


ALTER TABLE "chat_rag_active_index"
ADD CONSTRAINT "chat_rag_active_index_singleton_id_check" CHECK (singleton_id = 1);

ALTER TABLE "engagement_events"
ADD CONSTRAINT "engagement_events_event_name_check"
CHECK (event_name IN ('about_view', 'blog_list_view', 'blog_post_view', 'resume_download', 'portfolio_download', 'contact_click'));
