DO $migration$
BEGIN
  IF to_regclass('chat_rag_index_versions') IS NOT NULL THEN
    ALTER TABLE chat_rag_index_versions
    ADD COLUMN IF NOT EXISTS embedding_provider TEXT;

    ALTER TABLE chat_rag_index_versions
    ADD COLUMN IF NOT EXISTS embedding_model_id TEXT;

    ALTER TABLE chat_rag_index_versions
    ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER;

    ALTER TABLE chat_rag_index_versions
    ADD COLUMN IF NOT EXISTS chunking_version TEXT;
  END IF;
END
$migration$;
