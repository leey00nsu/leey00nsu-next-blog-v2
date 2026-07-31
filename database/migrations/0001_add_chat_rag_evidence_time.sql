DO $migration$
BEGIN
  IF to_regclass('chat_rag_chunks') IS NOT NULL THEN
    ALTER TABLE chat_rag_chunks
    ADD COLUMN IF NOT EXISTS evidence_time_kind TEXT;

    ALTER TABLE chat_rag_chunks
    ADD COLUMN IF NOT EXISTS evidence_time_value TIMESTAMPTZ;
  END IF;
END
$migration$;
