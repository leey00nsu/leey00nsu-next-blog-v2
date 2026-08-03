DO $migration$
BEGIN
  IF to_regclass('engagement_events') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS engagement_events_created_at_index
    ON engagement_events(created_at DESC);
  END IF;
END
$migration$;
