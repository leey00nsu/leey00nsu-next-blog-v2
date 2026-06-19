# LangGraph Query Plan Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heuristic `NormalizedChatIntent` pipeline with a structured `ChatQueryPlan -> ChatRetrievalPlan` compiler and make one deterministic LangGraph workflow the chatbot application orchestrator.

**Architecture:** The planner describes question meaning with discriminated source and temporal selections. A pure compiler resolves canonical targets, conversation transitions, execution kind, and retrieval constraints. A single `StateGraph` routes clarification, cache, deterministic metadata, retrieval, answer generation, citation validation, and cache storage; HTTP validation and usage limiting stay outside the graph.

**Tech Stack:** Next.js 16.1.1, React 19.1, TypeScript 5, Zod 4.1.5, `@langchain/langgraph` 1.2.7, AI SDK 6.0.149, Vitest 4.0.16, PostgreSQL/pg 8.20

---

## File Structure

New files:

- `features/chat/model/chat-query-plan.ts`: planner-owned semantic contract.
- `features/chat/model/chat-retrieval-plan.ts`: compiler-owned executable contract.
- `features/chat/model/compile-chat-retrieval-plan.ts`: pure canonical target, transition, invariant, and execution-kind compiler.
- `features/chat/model/compile-chat-retrieval-plan.test.ts`: compiler contract matrix.
- `features/chat/model/execute-chat-retrieval-plan.ts`: deterministic direct metadata and hybrid retrieval executor.
- `features/chat/model/execute-chat-retrieval-plan.test.ts`: source, temporal, and execution behavior.
- `features/chat/model/chat-workflow.ts`: single application `StateGraph`.
- `features/chat/model/chat-workflow.test.ts`: conditional-edge and side-effect isolation tests.

Modified files:

- `features/chat/api/plan-chat-intent-patch.ts`: produce `ChatQueryPlan` and use the new prompt.
- `features/chat/model/chat-evidence.ts`: replace overloaded project `publishedAt` semantics with typed evidence time.
- `features/chat/lib/chat-curated-source-records.ts`: accept typed evidence time.
- `features/chat/model/get-curated-chat-sources.ts`: emit project start/end time explicitly.
- `features/chat/model/chat-rag-workflow.ts`: become retrieval computation used by the main graph, not a second orchestrator.
- `features/chat/model/chat-rag-database.ts`: preserve evidence time in semantic candidates.
- `features/chat/model/chat-schema.ts`: add new workflow refusal reasons without changing the public response envelope.
- `features/chat/lib/chat-intent-cache-key.ts`: key by compiled retrieval plan.
- `features/chat/model/answer-blog-chat-question.ts`: invoke the new graph and log query/retrieval plans.
- planner/retrieval fixtures and evaluation scripts: assert source and temporal modes plus graph paths.

Removed after the new entry point is active:

- `features/chat/model/chat-intent.ts`
- `features/chat/model/normalize-chat-intent-plan.ts`
- `features/chat/model/execute-chat-intent.ts`
- `features/chat/model/retrieve-blog-chat-evidence.ts`
- `features/chat/model/run-stateful-blog-chat-pipeline.ts`
- `features/chat/lib/resolve-chat-intent-request.ts`
- their superseded tests and fixtures that only describe the old contract

### Task 1: Add the semantic and executable contracts

**Files:**
- Create: `features/chat/model/chat-query-plan.ts`
- Create: `features/chat/model/chat-retrieval-plan.ts`
- Create: `features/chat/model/chat-query-plan.test.ts`
- Create: `features/chat/model/chat-retrieval-plan.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from 'vitest'
import { ChatQueryPlanSchema } from '@/features/chat/model/chat-query-plan'
import { ChatRetrievalPlanSchema } from '@/features/chat/model/chat-retrieval-plan'

describe('ChatQueryPlanSchema', () => {
  it('source와 temporal discriminated union의 잘못된 조합을 거부한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        standaloneQuestion: '최근 프로젝트에서 AI를 어떻게 활용해?',
        contextAction: 'reset',
        targetSelection: { kind: 'none' },
        operation: 'explain',
        sourceSelection: { mode: 'all', categories: ['project'] },
        temporalSelection: { mode: 'none', order: 'latest' },
        requestedFields: ['content'],
        requiredConcepts: ['AI'],
        optionalConcepts: [],
        missingSlots: [],
        clarificationQuestion: null,
        confidence: 'high',
        reason: 'Cross-project explanation.',
      }).success,
    ).toBe(false)
  })
})

describe('ChatRetrievalPlanSchema', () => {
  it('compiled plan의 nullable temporal order를 검증한다', () => {
    expect(
      ChatRetrievalPlanSchema.safeParse({
        executionKind: 'retrieve_and_generate',
        standaloneQuestion: 'AI 활용을 설명해줘',
        operation: 'explain',
        canonicalTargets: [],
        sourceStrategy: 'all',
        sourceCategories: [],
        requiredConcepts: ['AI'],
        optionalConcepts: [],
        requestedFields: ['content'],
        temporalStrategy: 'none',
        temporalOrder: null,
        maximumEvidenceCount: 5,
      }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/chat-query-plan.test.ts features/chat/model/chat-retrieval-plan.test.ts`

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement both Zod contracts**

`chat-query-plan.ts` must define `lookup | explain | summarize | compare | recommend | social_reply | contact`, use non-empty unique categories for `only | prefer`, and define candidate/preserve/current_source/none target selection plus the existing conversation action values.

```ts
export const ChatSourceSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('all') }),
  z.object({
    mode: z.enum(['only', 'prefer']),
    categories: z.array(ChatSourceCategorySchema).min(1).transform(unique),
  }),
])

export const ChatTemporalSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }),
  z.object({
    mode: z.enum(['rank', 'single']),
    order: z.enum(['latest', 'oldest']),
  }),
])
```

`chat-retrieval-plan.ts` must export `ChatExecutionKindSchema`, `ChatRetrievalPlanSchema`, and inferred interfaces. Reuse `ChatTargetSchema`, `ChatRequestedFieldSchema`, and shared limits by moving those neutral primitives from the old Intent file rather than importing the old aggregate contract.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm vitest run features/chat/model/chat-query-plan.test.ts features/chat/model/chat-retrieval-plan.test.ts`

Expected: 2 test files pass.

```bash
git add features/chat/model/chat-query-plan.ts features/chat/model/chat-query-plan.test.ts features/chat/model/chat-retrieval-plan.ts features/chat/model/chat-retrieval-plan.test.ts
git commit -m "feat(chat): add query and retrieval plan contracts"
```

### Task 2: Build the deterministic compiler

**Files:**
- Create: `features/chat/model/compile-chat-retrieval-plan.ts`
- Create: `features/chat/model/compile-chat-retrieval-plan.test.ts`
- Modify: `features/chat/model/reduce-chat-conversation-state.ts`
- Modify: `features/chat/model/reduce-chat-conversation-state.test.ts`

- [ ] **Step 1: Write compiler RED tests**

Cover these exact cases in table-driven tests:

```ts
const CASES = [
  {
    name: 'latest project content uses ranked retrieval',
    queryPlan: {
      ...BASE_QUERY_PLAN,
      operation: 'explain',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'rank', order: 'latest' },
      requestedFields: ['content'],
    },
    expected: {
      executionKind: 'retrieve_and_generate',
      sourceStrategy: 'only',
      sourceCategories: ['project'],
      temporalStrategy: 'rank',
      temporalOrder: 'latest',
    },
  },
  {
    name: 'latest blog metadata uses direct response',
    queryPlan: {
      ...BASE_QUERY_PLAN,
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['blog'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['title', 'published_at'],
    },
    expected: { executionKind: 'direct_metadata' },
  },
] as const
```

Also assert:

- `lookup + single + content` compiles to `retrieve_and_generate`, not direct metadata.
- unknown candidate returns `invalid_candidate`.
- missing slots return `clarification` and do not create a retrieval plan.
- target category upgrades `all` to `prefer` with that category.
- `current_source` resolves to the supplied current post slug and fails when the slug is absent.
- invalid clarification continuation returns `invalid_transition`.
- the same inputs produce deeply equal outputs.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/compile-chat-retrieval-plan.test.ts`

Expected: FAIL because compiler is missing.

- [ ] **Step 3: Implement the pure compiler**

Use an explicit result union:

```ts
export type CompileChatRetrievalPlanResult =
  | {
      ok: true
      queryPlan: ChatQueryPlan
      retrievalPlan: ChatRetrievalPlan
      nextConversationState: ChatConversationState
      contextAction: ChatContextAction
    }
  | {
      ok: false
      failureKind:
        | 'invalid_query_plan'
        | 'invalid_candidate'
        | 'invalid_transition'
      nextConversationState: ChatConversationState
    }
```

Implement separate pure helpers for canonical target resolution, source selection, execution kind, and conversation transition. Do not inspect `standaloneQuestion` text and do not import query phrase constants.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
pnpm vitest run features/chat/model/compile-chat-retrieval-plan.test.ts features/chat/model/reduce-chat-conversation-state.test.ts
pnpm exec tsc --noEmit
```

Expected: compiler and existing conversation transition tests pass.

```bash
git add features/chat/model/compile-chat-retrieval-plan.ts features/chat/model/compile-chat-retrieval-plan.test.ts features/chat/model/reduce-chat-conversation-state.ts features/chat/model/reduce-chat-conversation-state.test.ts
git commit -m "feat(chat): compile deterministic retrieval plans"
```

### Task 3: Migrate the planner to the semantic query contract

**Files:**
- Modify: `features/chat/api/plan-chat-intent-patch.ts`
- Modify: `features/chat/api/plan-chat-intent-patch.test.ts`
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `features/chat/lib/chat-planner-evaluation.test.ts`
- Modify: `scripts/evaluate-chat-planner.ts`

- [ ] **Step 1: Change planner tests to require source and temporal semantics**

For `recent-project-ai-usage`, require:

```ts
expect(queryPlan).toMatchObject({
  operation: 'explain',
  sourceSelection: { mode: 'only', categories: ['project'] },
  temporalSelection: { mode: 'rank', order: 'latest' },
  requestedFields: expect.arrayContaining(['content']),
  missingSlots: [],
})
```

For `latest-post-date`, require `lookup + only blog + single latest + title/published_at`. For a cross-source AI question, require `sourceSelection: { mode: 'all' }` and `rank latest`.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/api/plan-chat-intent-patch.test.ts features/chat/lib/chat-planner-evaluation.test.ts`

Expected: old Intent output does not contain the new discriminated fields.

- [ ] **Step 3: Update planner output and prompt**

Import `ChatQueryPlanSchema`. Replace evidence-scope instructions with:

```text
Source rules:
- only: the question explicitly limits evidence to listed source categories.
- prefer: listed categories are preferred, but cross-category evidence is allowed.
- all: no source category restriction is expressed.
- Do not infer source categories from target names not supplied in entityCandidates.

Temporal rules:
- single: the user asks for one newest or oldest item.
- rank: recency/age should influence evidence ranking for an explanatory, summary, comparison, or recommendation answer.
- none: time is not part of the request.
```

Keep one schema-repair retry and rename result properties from `intentPlan` to `queryPlan`.

- [ ] **Step 4: Update live evaluator diagnostics**

Emit source mode/categories, temporal mode/order, compiled execution kind, graph path, and citation categories. The evaluator must fail if `recent-project-ai-usage` compiles to `direct_metadata` or lacks project evidence.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm vitest run features/chat/api/plan-chat-intent-patch.test.ts features/chat/lib/chat-planner-evaluation.test.ts
pnpm eval:chat-planner
```

Expected: unit fixtures pass; live golden cases return the new plan shape.

```bash
git add features/chat/api/plan-chat-intent-patch.ts features/chat/api/plan-chat-intent-patch.test.ts features/chat/fixtures/chat-planner-evaluation.ts features/chat/lib/chat-planner-evaluation.test.ts scripts/evaluate-chat-planner.ts
git commit -m "feat(chat): plan structured source and time semantics"
```

### Task 4: Introduce typed evidence time

**Files:**
- Modify: `features/chat/model/chat-evidence.ts`
- Modify: `features/chat/lib/chat-curated-source-records.ts`
- Modify: `features/chat/lib/chat-curated-source-records.test.ts`
- Modify: `features/chat/model/get-curated-chat-sources.ts`
- Modify: `features/chat/model/get-curated-chat-sources.test.ts`
- Modify: `features/chat/model/chat-rag-database.ts`
- Modify: `features/chat/model/chat-rag-database.test.ts`
- Modify: `scripts/generate-chat-rag-postgres.ts`

- [ ] **Step 1: Write RED tests for blog and project time meaning**

```ts
expect(blogRecord.evidenceTime).toEqual({
  kind: 'published',
  value: '2026-04-21T00:00:00.000Z',
})
expect(leemageRecord.evidenceTime).toEqual({
  kind: 'project_ended',
  value: '2026-01-01T00:00:00.000Z',
})
expect(leemageRecord.publishedAt).toBeUndefined()
```

Add a current project fixture with no end date and assert `project_started` unless explicit updated metadata exists.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/model/chat-rag-database.test.ts`

Expected: evidence records do not expose typed time yet.

- [ ] **Step 3: Implement evidence time**

```ts
export const CHAT_EVIDENCE_TIME_KINDS = [
  'published',
  'updated',
  'project_started',
  'project_ended',
] as const

export interface ChatEvidenceTime {
  kind: (typeof CHAT_EVIDENCE_TIME_KINDS)[number]
  value: string
}
```

Add `evidenceTime?: ChatEvidenceTime | null` to `ChatEvidenceRecord`. Generated blog adapters map `publishedAt` to `published`; curated project builders map period end/start without setting `publishedAt`. PostgreSQL row mapping and generation preserve both fields during the migration, but ranking reads only `evidenceTime` after Task 5.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
pnpm vitest run features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/model/chat-rag-database.test.ts
pnpm exec tsc --noEmit
```

```bash
git add features/chat/model/chat-evidence.ts features/chat/lib/chat-curated-source-records.ts features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/model/chat-rag-database.ts features/chat/model/chat-rag-database.test.ts scripts/generate-chat-rag-postgres.ts
git commit -m "refactor(chat): model evidence time explicitly"
```

### Task 5: Execute compiled retrieval plans

**Files:**
- Create: `features/chat/model/execute-chat-retrieval-plan.ts`
- Create: `features/chat/model/execute-chat-retrieval-plan.test.ts`
- Modify: `features/chat/model/chat-rag-workflow.ts`
- Modify: `features/chat/model/chat-rag-workflow.test.ts`
- Modify: `features/chat/lib/select-final-chat-evidence.ts`
- Modify: `features/chat/lib/select-final-chat-evidence.test.ts`
- Modify: `features/chat/lib/should-rerank-chat-evidence.ts`
- Modify: `features/chat/lib/should-rerank-chat-evidence.test.ts`

- [ ] **Step 1: Write RED execution tests**

Use blog and project fixtures where a newer AI blog competes with an older matching project. Assert:

```ts
expect(
  await executeChatRetrievalPlan({
    plan: RECENT_PROJECT_AI_PLAN,
    locale: 'ko',
    blogRecords: [NEWER_AI_BLOG],
    curatedRecords: [RECENT_AI_PROJECT, OLDER_AI_PROJECT],
  }),
).toMatchObject({
  kind: 'evidence',
  matches: [expect.objectContaining({ sourceCategory: 'project' })],
})
```

Also assert:

- `only` excludes every unlisted category before scoring.
- `prefer` keeps other categories but boosts listed categories.
- `rank latest` applies time only after required-concept coverage.
- `single latest` chooses one entity/document, not one arbitrary section.
- direct metadata is only produced for compiler-authorized plans.
- executor source behavior is unchanged if question wording omits `project` but plan says `only project`.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/execute-chat-retrieval-plan.test.ts`

Expected: executor module is missing.

- [ ] **Step 3: Implement deterministic execution order**

Return this union:

```ts
export type ExecuteChatRetrievalPlanResult =
  | { kind: 'direct'; response: BlogChatResponse; matches: ChatEvidenceRecord[] }
  | {
      kind: 'evidence'
      matches: ChatEvidenceRecord[]
      lexicalMatches: ChatEvidenceRecord[]
      semanticMatches: ChatEvidenceRecord[]
      reranked: boolean
    }
  | {
      kind: 'refusal'
      refusalReason: 'insufficient_search_match'
      matches: []
    }
```

Apply: only filter -> target filter -> lexical/semantic candidate collection -> required coverage -> prefer boost -> score fusion -> temporal rank/single -> diversity -> Top-K. Pass the compiled plan to semantic retrieval and final selection; remove any question-text source-category detection.

- [ ] **Step 4: Verify retrieval baseline and commit**

Run:

```bash
pnpm vitest run features/chat/model/execute-chat-retrieval-plan.test.ts features/chat/model/chat-rag-workflow.test.ts features/chat/lib/select-final-chat-evidence.test.ts features/chat/lib/should-rerank-chat-evidence.test.ts
pnpm eval:chat-retrieval
```

Expected: all tests pass and recall@1/3/5 plus MRR remain 1.0.

```bash
git add features/chat/model/execute-chat-retrieval-plan.ts features/chat/model/execute-chat-retrieval-plan.test.ts features/chat/model/chat-rag-workflow.ts features/chat/model/chat-rag-workflow.test.ts features/chat/lib/select-final-chat-evidence.ts features/chat/lib/select-final-chat-evidence.test.ts features/chat/lib/should-rerank-chat-evidence.ts features/chat/lib/should-rerank-chat-evidence.test.ts
git commit -m "feat(chat): execute compiled retrieval plans"
```

### Task 6: Build the single application StateGraph

**Files:**
- Create: `features/chat/model/chat-workflow.ts`
- Create: `features/chat/model/chat-workflow.test.ts`
- Modify: `features/chat/lib/chat-intent-cache-key.ts`
- Modify: `features/chat/lib/chat-intent-cache-key.test.ts`

- [ ] **Step 1: Write graph-path RED tests**

Inject node dependencies and assert call isolation for:

```ts
it('cache hit은 retrieval과 answer model을 건너뛴다', async () => {
  const result = await runChatWorkflow({ request, dependencies })

  expect(result.graphPath).toEqual([
    'resolve-context',
    'plan-query',
    'compile-plan',
    'cache-lookup',
    'finalize',
  ])
  expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
  expect(dependencies.answerQuestion).not.toHaveBeenCalled()
})
```

Add equivalent tests for clarification, direct metadata, evidence generation, insufficient evidence, invalid query plan, and ungrounded answer. Assert planner/compiler failures preserve previous conversation state.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/chat-workflow.test.ts`

Expected: workflow module is missing.

- [ ] **Step 3: Implement state and conditional edges**

Use `Annotation.Root` for request, profiles, candidates, query plan, retrieval plan, evidence, draft, response, next state, cache kind, failure kind, and graph path. Build one `StateGraph` with named nodes from the design and conditional routes after compile, cache lookup, retrieval, and response validation.

```ts
return new StateGraph(CHAT_WORKFLOW_STATE)
  .addNode('resolve-context', resolveContextNode)
  .addNode('plan-query', planQueryNode)
  .addNode('compile-plan', compilePlanNode)
  .addNode('cache-lookup', cacheLookupNode)
  .addNode('execute-direct', executeDirectNode)
  .addNode('retrieve-evidence', retrieveEvidenceNode)
  .addNode('generate-answer', generateAnswerNode)
  .addNode('validate-response', validateResponseNode)
  .addNode('store-cache', storeCacheNode)
  .addNode('finalize', finalizeNode)
  .addEdge(START, 'resolve-context')
  .addEdge('resolve-context', 'plan-query')
  .addEdge('plan-query', 'compile-plan')
  .addConditionalEdges('compile-plan', routeCompiledPlan)
  .addConditionalEdges('cache-lookup', routeCacheResult)
  .addConditionalEdges('retrieve-evidence', routeEvidenceResult)
  .addConditionalEdges('validate-response', routeValidatedResponse)
  .addEdge('finalize', END)
  .compile()
```

The public `runChatWorkflow` wraps invocation once and returns application response, query plan, retrieval plan, evidence diagnostics, cache kind, failure kind, and graph path.

- [ ] **Step 4: Key cache by compiled plan**

Replace the old Intent cache key input with `ChatRetrievalPlan`; include operation, canonical target identifiers, source strategy/categories, temporal strategy/order, fields, concepts, locale, current source, and evidence version.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm vitest run features/chat/model/chat-workflow.test.ts features/chat/lib/chat-intent-cache-key.test.ts
pnpm exec tsc --noEmit
```

```bash
git add features/chat/model/chat-workflow.ts features/chat/model/chat-workflow.test.ts features/chat/lib/chat-intent-cache-key.ts features/chat/lib/chat-intent-cache-key.test.ts
git commit -m "feat(chat): orchestrate answers with one LangGraph workflow"
```

### Task 7: Switch the application entry point and observability

**Files:**
- Modify: `features/chat/model/answer-blog-chat-question.ts`
- Modify: `features/chat/model/answer-blog-chat-question-stateful.test.ts`
- Modify: `features/chat/model/chat-observability.ts`
- Modify: `features/chat/model/chat-observability.test.ts`
- Modify: `app/api/chat/route-adapter.test.ts`

- [ ] **Step 1: Write entry-point RED tests**

Mock `runChatWorkflow` and assert `answerBlogChatQuestion` calls it after validation and usage limiting. Assert logs contain:

```ts
expect(recordedEvent).toMatchObject({
  queryOperation: 'explain',
  sourceStrategy: 'only',
  sourceCategories: ['project'],
  temporalStrategy: 'rank',
  temporalOrder: 'latest',
  executionKind: 'retrieve_and_generate',
  graphPath: expect.arrayContaining(['compile-plan', 'retrieve-evidence']),
})
```

Ensure the Lee Chat response envelope and version 2 conversation-state metadata remain unchanged.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/answer-blog-chat-question-stateful.test.ts features/chat/model/chat-observability.test.ts app/api/chat/route-adapter.test.ts`

Expected: application still imports the manual pipeline and observability lacks new fields.

- [ ] **Step 3: Switch to the graph**

Replace `runStatefulBlogChatPipeline` with `runChatWorkflow`. Map graph diagnostics directly into observability; do not reconstruct source or temporal meaning from question text. Keep rate limit, concurrent slot, daily usage, cache cleanup, profile loading, and route adapter outside the graph.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
pnpm vitest run features/chat/model/answer-blog-chat-question-stateful.test.ts features/chat/model/chat-observability.test.ts app/api/chat/route-adapter.test.ts
pnpm exec tsc --noEmit
```

```bash
git add features/chat/model/answer-blog-chat-question.ts features/chat/model/answer-blog-chat-question-stateful.test.ts features/chat/model/chat-observability.ts features/chat/model/chat-observability.test.ts app/api/chat/route-adapter.test.ts
git commit -m "refactor(chat): route application flow through LangGraph"
```

### Task 8: Remove the legacy contract and orchestration

**Files:**
- Delete: `features/chat/model/chat-intent.ts`
- Delete: `features/chat/model/chat-intent.test.ts`
- Delete: `features/chat/model/normalize-chat-intent-plan.ts`
- Delete: `features/chat/model/normalize-chat-intent-plan.test.ts`
- Delete: `features/chat/model/execute-chat-intent.ts`
- Delete: `features/chat/model/execute-chat-intent.test.ts`
- Delete: `features/chat/model/retrieve-blog-chat-evidence.ts`
- Delete: `features/chat/model/retrieve-blog-chat-evidence-by-intent.test.ts`
- Delete: `features/chat/model/run-stateful-blog-chat-pipeline.ts`
- Delete: `features/chat/model/run-stateful-blog-chat-pipeline.test.ts`
- Delete: `features/chat/lib/resolve-chat-intent-request.ts`
- Delete: `features/chat/lib/resolve-chat-intent-request.test.ts`
- Modify: every remaining import reported by `rg` and TypeScript.

- [ ] **Step 1: Prove the new entry point no longer references legacy modules**

Run:

```bash
rg -n "NormalizedChatIntent|normalizeChatIntentPlan|executeChatIntent|runStatefulBlogChatPipeline|resolveChatIntentRequest" app features scripts
```

Expected before deletion: only migration leftovers and old tests remain; no application entry-point import remains.

- [ ] **Step 2: Delete old files and repair direct imports**

Move any still-needed primitive types to `chat-query-plan.ts` or a focused file. Do not create an `index.ts` barrel and do not add compatibility wrappers that keep the old aggregate contract alive.

- [ ] **Step 3: Verify no legacy symbol remains**

Run:

```bash
rg -n "NormalizedChatIntent|normalizeChatIntentPlan|executeChatIntent|runStatefulBlogChatPipeline|resolvePreferredSourceCategories|resolveChatIntentRequest" app features scripts
pnpm exec tsc --noEmit
pnpm test:run
```

Expected: `rg` returns no matches and the full suite passes.

- [ ] **Step 4: Commit**

```bash
git add -A app features scripts
git commit -m "refactor(chat): remove legacy intent orchestration"
```

### Task 9: Complete evaluation, runtime verification, and documentation

**Files:**
- Modify: `docs/chatbot-langgraph-orchestration.md`
- Modify: `docs/superpowers/specs/2026-06-19-langgraph-query-plan-design.md` only if implementation differs from the approved contract.
- Modify: files required by verification failures only.

- [ ] **Step 1: Run static and automated verification**

```bash
pnpm exec tsc --noEmit
pnpm eslint app/api/chat features/chat scripts/evaluate-chat-planner.ts scripts/evaluate-chat-retrieval.ts
pnpm test:run
pnpm eval:chat-planner
pnpm eval:chat-retrieval
git diff --check
```

Expected: TypeScript/ESLint/Vitest pass; all planner golden cases pass; retrieval recall@1/3/5 and MRR equal 1.0.

- [ ] **Step 2: Build production output**

Run: `pnpm build`

Expected: Next.js production build and PDF postbuild complete successfully.

- [ ] **Step 3: Verify browser golden scenarios**

Run the app and verify:

1. `최근 프로젝트에서 AI를 어떻게 활용하고 있어?` returns project AI usage with project citations and never the deterministic latest-blog sentence.
2. `가장 최근 글의 제목과 날짜를 알려줘` returns one blog title/date through `direct_metadata`.
3. `Leemage에서 Presigned URL을 사용한 이유가 뭐야?` returns Leemage evidence.
4. `이 사람 Vercel 써봤어?` -> `블로그 주인` resolves clarification, then a new Leemage question resets the target.
5. Refresh preserves the existing version 2 conversation-state behavior.

- [ ] **Step 4: Audit acceptance criteria**

Confirm with source and command evidence:

- one application `StateGraph` entry point;
- no source keyword detection in executor;
- no project period stored as `publishedAt`;
- distinct `single` and `rank` routes;
- no legacy Intent/manual pipeline symbols;
- all required checks and browser scenarios passed.

- [ ] **Step 5: Commit final verification adjustments**

```bash
git add -A
git commit -m "test(chat): verify LangGraph query plan migration"
```
