-- CreateTable
CREATE TABLE "chat_response_cache" (
    "cache_key" TEXT NOT NULL,
    "cache_kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "current_post_slug" TEXT,
    "intent_cache_key" TEXT,
    "question_embedding" vector,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_response_cache_pkey" PRIMARY KEY ("cache_key")
);

-- CreateIndex
CREATE INDEX "chat_response_cache_lookup_index" ON "chat_response_cache"("cache_kind", "locale", "expires_at");

-- CreateIndex
CREATE INDEX "chat_response_cache_expires_at_index" ON "chat_response_cache"("expires_at");
