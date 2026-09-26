ALTER TABLE "chat_observability_events"
  ADD COLUMN "jev_route" TEXT,
  ADD COLUMN "jev_route_confidence" DOUBLE PRECISION;
