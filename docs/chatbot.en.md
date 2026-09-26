# Blog Q&A: architecture and operations

[한국어](./chatbot.md) · [Back to README](../README.en.md)

## Question flow

Open Blog Q&A from a blog list/detail page or the About page. The default limit is 200 characters per question and 100 requests per day across the service (KST); both are configurable.

1. TypeSafe Jev uses the question and conversation state to decide whether a prepared reply suffices for greetings, chatbot identity, author identity, or contact requests. Otherwise it builds a retrieval plan with the subject, scope, time constraints, and follow-up context. Jev's `llm_planner` is a route label, not a separate LLM Question Planner call.
2. Grounded questions combine build-generated blog lexical records, curated sources from About/projects/internal assistant documentation, and Postgres (`pgvector`) semantic candidates. Assistant-internal evidence is not turned into a user-facing citation link. If the Postgres index is missing or semantic search fails, matching lexical and curated evidence can still support an answer.
3. Final evidence selection considers question tokens, titles and sections, search terms, and scope. An LLM reranker runs only when candidates exceed the final evidence budget. When only semantic evidence remains, Jev checks its direct relevance to the question.
4. The answer model uses supplied evidence only and returns evidence IDs in structured output. The server validates the selected evidence and citations and returns a safe response when support is insufficient or validation fails. The answer model has no external browsing, search tool, or file-editing access.

Exact and semantic response caches use the shared Postgres `chat_response_cache` table when configured, otherwise process memory. Their default TTLs are five and ten minutes. Cache keys include both a generated build version (the Git commit SHA, or a unique build ID when Git metadata is unavailable) and the current active Postgres index version. Reindexing the same commit therefore cannot reuse an earlier answer. If a database is configured but its active index version cannot be read, the chatbot skips the caches and continues through normal retrieval and answering. Coolify does not need a manually configured `GIT_COMMIT_SHA`.

## Local Postgres and schema

`docker compose` reads the root `.env`. Before local indexing, use `.env.example` to check that `.env` or `.env.local` points to a local database rather than production: indexing really modifies the configured database.

```bash
docker compose -f docker-compose.postgres.yml up -d
pnpm run db:migrate
pnpm run verify:chat-rag
```

Schema and migrations live in `prisma/schema.prisma` and `prisma/migrations`. `pnpm dev`, `pnpm start`, and RAG indexing apply stored Prisma migrations. Never run `prisma migrate dev` or `db push` against the deployed database. When connecting an existing database for the first time, back it up and compare its schema before deciding whether to mark the baseline migration as applied.

`verify:chat-rag` requires database, embedding-service, and OpenAI reranker access. The unverified `gen:chat-rag-postgres` command is for local experiments, not deployment.

## Content generation and indexing

- `pnpm run gen:content` runs before development, builds, and tests. It derives image metadata, post/project data, chatbot lexical records, and the build version from source MDX and the build environment. Generated `*.generated.ts` files are not tracked. The app does not crawl `.next` HTML.
- Indexing chunks lexical records and curated sources, embeds them, and writes a candidate Postgres `index_version`. Embedding input is title → section title → content → search terms, prioritizing early content. Vectors are reused from the active index when provider, model, recipe, and input match.
- Keep the app's `BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH` and Modal's `MODAL_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH` equal. Both default to 128. The app includes its setting in the index recipe version, but cannot automatically detect a Modal-only setting change.
- `pnpm run gen:chat-rag-postgres --verify` evaluates live hybrid retrieval on the candidate and activates it only after passing. Failures leave the previous active index in place. Plain `gen:chat-rag-postgres` skips this check and may silently skip indexing if required connections are absent.

## Retrieval evaluation

`pnpm run test:run` includes generated-corpus regression checks: expected evidence must exist, each positive case must reach the top three, aggregate recall@1 ≥ 0.8, and MRR ≥ 0.85. These checks establish a lexical baseline, not the health of the deployed Postgres index.

```bash
BLOG_CHAT_EVALUATE_LIVE_SEMANTIC=true pnpm run eval:chat-retrieval
pnpm run eval:chat-workflow
```

The first command evaluates the active index, embedding endpoint, and reranker. It requires a semantic expected-evidence hit rate ≥ 0.8 and checks retrieval/reranking failures. `verify:chat-rag` applies the same live retrieval evaluation to its candidate before activation. The second runs three representative questions through planning, retrieval, answer generation, and citations; passing does not guarantee every answer is factually correct. Both can incur API charges.

Compare live metrics before and after adjusting the semantic candidate count (`BLOG_CHAT_RAG_MAXIMUM_SEMANTIC_CANDIDATES`, default 8) or similarity floor (`BLOG_CHAT_RAG_MINIMUM_SIMILARITY_SCORE`, default 0.15).

## Coolify deployment

The app currently uses Nixpacks. Its Coolify Build Command is `pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build`. Builds run `pnpm run gen:content` but do not update the production Postgres index. Set the Coolify application's **Post-deployment Command** to `pnpm run verify:chat-rag`. This setting lives in Coolify; editing repository documentation alone will not apply it.

In the new container, the command generates content, writes a candidate index, evaluates live retrieval against that candidate, and activates it after passing. A failure preserves the old active index, but Coolify may still show the deployment as successful when its post-deployment command fails. Check the deployment log for `Indexed ... Active version` and verify the active index was updated; monitor failures or missing updates separately. Index protection does not roll back the already deployed app.

Minimum runtime settings:

- `BLOG_CHAT_RAG_DATABASE_URL` (or the supported `DATABASE_URL` fallback)
- `MODAL_EMBEDDING_BASE_URL`; when using Modal proxy auth, `MODAL_EMBEDDING_KEY` and `MODAL_EMBEDDING_SECRET`
- `OPENAI_API_KEY` and either `OPENAI_BLOG_CHAT_RERANK_MODEL` or `OPENAI_BLOG_CHAT_MODEL`

Jev question routing separately requires `TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`. Without either key, the chatbot returns a safe refusal. `TYPESAFE_DEFAULT_MODEL` is optional and defaults to `jev-latest`.

Enable the `pgvector` extension in Postgres. On the first deployment, confirm the new image contains source content and scripts needed by the post-deployment command.
