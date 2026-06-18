# Stateful Conversational RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `ChatQuestionPlan` pipeline with a stateful conversational RAG pipeline that preserves normalized intent from planner through execution, retrieval, cache, and SDK persistence.

**Architecture:** The planner produces a `ChatIntentPatch`, a pure reducer combines it with validated client state into a `NormalizedChatIntent`, and executors consume that intent directly. The server remains stateless; `lee-chat-sdk` persists the latest `ChatConversationState` in assistant metadata through its existing localStorage persistence.

**Tech Stack:** Next.js 16.1.1, React 19.1, TypeScript, Zod 4.1.5, AI SDK 6.0.149, `@ai-sdk/openai` 3.0.51, LangGraph 1.2.7, `lee-chat-sdk` 0.3.1, Vitest 4

---

## File Map

### New domain files

- `features/chat/model/chat-intent.ts`: canonical intent enums, target, patch, normalized intent, and result schemas.
- `features/chat/model/chat-conversation-state.ts`: versioned client state and pending clarification schemas.
- `features/chat/model/reduce-chat-conversation-state.ts`: pure state transition and suspended-intent resume rules.
- `features/chat/model/execute-chat-intent.ts`: executor selection and deterministic response orchestration.
- `features/chat/lib/chat-intent-cache-key.ts`: stable semantic cache-key serialization.
- `features/chat/lib/chat-required-concepts.ts`: alias normalization and required-concept evidence filtering.

### Reworked files

- `features/chat/api/plan-chat-question.ts`: replace full-frame/legacy-plan output with patch generation and one retry.
- `features/chat/model/retrieve-blog-chat-evidence.ts`: accept `NormalizedChatIntent` directly.
- `features/chat/lib/chat-retrieval-scope.ts`: derive scope from intent, not plan.
- `features/chat/lib/chat-search.ts`: rank optional concepts without treating them as hard requirements.
- `features/chat/lib/select-final-chat-evidence.ts`: enforce required concepts before `TOP_K`.
- `features/chat/lib/should-rerank-chat-evidence.ts`: use intent properties.
- `features/chat/model/answer-blog-chat-question.ts`: orchestrate state validation, patch reduction, cache, execution, and response state.
- `features/chat/model/chat-schema.ts`: transport conversation state in request and response.
- `app/api/chat/route.ts`: read the latest state from SDK assistant metadata and return the next state.
- `features/chat/model/chat-observability.ts`: log normalized intent fields and planner failure kind.
- `features/chat/fixtures/chat-planner-evaluation.ts`: express expected normalized intents and state transitions.

### Removed after migration

- `features/chat/model/chat-question-plan.ts`
- `features/chat/model/chat-question-routing.ts`
- `features/chat/model/resolve-chat-intent-frame.ts`
- `features/chat/lib/chat-question-plan-routing.ts`
- Their colocated tests and all imports of `ChatQuestionPlan`

## Task 1: Define the Canonical Intent and Conversation State Contracts

**Files:**
- Create: `features/chat/model/chat-intent.ts`
- Create: `features/chat/model/chat-intent.test.ts`
- Create: `features/chat/model/chat-conversation-state.ts`
- Create: `features/chat/model/chat-conversation-state.test.ts`
- Modify: `features/chat/model/chat-intent-frame.ts`

- [ ] **Step 1: Write failing schema tests**

Add tests that parse a complete intent, reject an unknown operation, distinguish `preserve` from `clear`, accept state version `1`, and reject a state with more than eight required concepts.

```ts
const intent = NormalizedChatIntentSchema.parse({
  standaloneQuestion: '이윤수가 Vercel을 사용한 경험이 있나요?',
  operation: 'answer',
  target: {
    kind: 'profile',
    sourceCategory: 'profile',
    slug: 'about',
    title: '이윤수',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Vercel'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'The target and required concept are explicit.',
})

expect(intent.requiredConcepts).toEqual(['Vercel'])
expect(ChatTargetUpdateSchema.parse({ kind: 'preserve' })).toEqual({
  kind: 'preserve',
})
expect(() => ChatConversationStateSchema.parse({
  ...EMPTY_CHAT_CONVERSATION_STATE,
  version: 2,
})).toThrow()
```

- [ ] **Step 2: Run the schema tests and verify they fail**

Run: `pnpm vitest run features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.test.ts`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement the schemas and named exports**

Define the following contracts with Zod limits declared as named constants:

```ts
export const CHAT_OPERATIONS = [
  'answer',
  'summarize',
  'explain',
  'recommend',
  'compare',
  'social_reply',
  'contact',
] as const

export const ChatTargetUpdateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('preserve') }),
  z.object({ kind: z.literal('replace'), target: ChatTargetSchema }),
  z.object({ kind: z.literal('clear') }),
])

export const ChatIntentPatchSchema = z.object({
  standaloneQuestion: z.string().trim().min(1).max(300),
  targetUpdate: ChatTargetUpdateSchema,
  operation: ChatOperationSchema,
  temporalConstraint: ChatTemporalConstraintSchema,
  requestedFields: z.array(ChatRequestedFieldSchema).max(5),
  evidenceScope: ChatEvidenceScopeSchema,
  requiredConcepts: z.array(ChatConceptSchema).max(8),
  optionalConcepts: z.array(ChatConceptSchema).max(8),
  missingSlots: z.array(ChatMissingSlotSchema).max(4),
  clarificationQuestion: z.string().trim().min(1).max(160).nullable(),
  confidence: ChatConfidenceSchema,
  reason: z.string().trim().min(1).max(160),
})
```

Define `ChatPendingClarificationSchema` with `missingSlots`, `clarificationQuestion`, and `suspendedIntent`. Define `ChatConversationStateSchema`, `EMPTY_CHAT_CONVERSATION_STATE`, and `CHAT_CONVERSATION_STATE_VERSION = 1`. Reuse canonical schemas from `chat-intent.ts` and reduce `chat-intent-frame.ts` to temporary compatibility imports only.

- [ ] **Step 4: Run schema tests and type checking**

Run: `pnpm vitest run features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit the contracts**

```bash
git add features/chat/model/chat-intent.ts features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.ts features/chat/model/chat-conversation-state.test.ts features/chat/model/chat-intent-frame.ts
git commit -m "feat(chat): define conversational intent state contracts"
```

## Task 2: Implement Pure Conversation State Reduction

**Files:**
- Create: `features/chat/model/reduce-chat-conversation-state.ts`
- Create: `features/chat/model/reduce-chat-conversation-state.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Cover these state transitions:

```ts
it('preserves a resolved target while replacing operation concepts', () => {})
it('clears the target for an independent context reset', () => {})
it('suspends an intent when a required slot is missing', () => {})
it('resumes the suspended Vercel question when the owner target is supplied', () => {})
it('does not carry old concepts into a new independent question', () => {})
it('ignores a stale or invalid client state by starting from the empty state', () => {})
it('builds an executable intent from complete state when the planner is unavailable', () => {})
```

The resume assertion must require `requiredConcepts: ['Vercel']`, target `이윤수`, no missing slots, and `pendingClarification: null` after the follow-up `블로그 주인`.

- [ ] **Step 2: Run the reducer tests and verify they fail**

Run: `pnpm vitest run features/chat/model/reduce-chat-conversation-state.test.ts`

Expected: FAIL because `reduceChatConversationState` is missing.

- [ ] **Step 3: Implement the reducer as a pure domain function**

Use this public contract:

```ts
interface ReduceChatConversationStateParams {
  previousState: ChatConversationState
  intentPatch: ChatIntentPatch
}

export interface ReduceChatConversationStateResult {
  intent: NormalizedChatIntent
  nextState: ChatConversationState
}

export function reduceChatConversationState(
  params: ReduceChatConversationStateParams,
): ReduceChatConversationStateResult

export function buildIntentFromConversationState(params: {
  question: string
  state: ChatConversationState
}): NormalizedChatIntent | null
```

Apply `targetUpdate` first. If the previous state has `pendingClarification` and the patch fills every missing slot, merge the suspended operation, temporal constraint, requested fields, and concepts before validation. For a normal independent question, use the patch fields rather than concatenating prior concepts. Deduplicate concepts while preserving order. `buildIntentFromConversationState` returns `null` unless the state has no pending clarification and contains enough target, operation, field, and scope data for deterministic execution.

- [ ] **Step 4: Run reducer and schema tests**

Run: `pnpm vitest run features/chat/model/reduce-chat-conversation-state.test.ts features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the reducer**

```bash
git add features/chat/model/reduce-chat-conversation-state.ts features/chat/model/reduce-chat-conversation-state.test.ts
git commit -m "feat(chat): reduce conversational intent state"
```

## Task 3: Replace Planner Output With Intent Patches and Retry

**Files:**
- Modify: `features/chat/api/plan-chat-question.ts`
- Modify: `features/chat/api/plan-chat-question.test.ts`
- Modify: `features/chat/api/plan-chat-question.model-normalization.test.ts`
- Modify: `features/chat/lib/chat-question-context.ts`
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `features/chat/lib/chat-planner-evaluation.test.ts`

- [ ] **Step 1: Replace planner tests with patch behavior tests**

Mock AI SDK output and assert:

- `마지막 글 언제야?` produces `order: 'latest'` and `requestedFields: ['title', 'published_at']` without phrase post-processing.
- A known owner in state produces `targetUpdate: { kind: 'preserve' }` for `이 사람`.
- A clarification answer produces `replace` and no repeated clarification.
- First generation failure causes exactly one retry.
- Two generation failures return `planner_unavailable` internally and public `model_error`.

- [ ] **Step 2: Run planner tests and verify they fail**

Run: `pnpm vitest run features/chat/api/plan-chat-question.test.ts features/chat/api/plan-chat-question.model-normalization.test.ts`

Expected: FAIL because the function still returns `ChatQuestionPlanResult`.

- [ ] **Step 3: Change the planner contract**

Rename the export to `planChatIntentPatch` and accept validated state:

```ts
interface PlanChatIntentPatchParams {
  question: string
  locale: SupportedLocale
  conversationState: ChatConversationState
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

export type PlanChatIntentPatchResult =
  | { ok: true; intentPatch: ChatIntentPatch }
  | {
      ok: false
      refusalReason: 'missing_api_key' | 'model_error'
      failureKind: 'planner_unavailable' | 'invalid_intent_patch'
    }
```

Use `Output.object({ schema: ChatIntentPatchSchema })`. Put `conversationState` in a delimited JSON section of the prompt and retain only the minimum recent conversation needed to interpret corrections. Execute `generateText` at most twice with the same schema. Delete affirmative-answer arrays, Korean ending arrays, chronological phrase arrays, legacy plan parsing, and `buildQuestionPlanFromPlannerOutput`.

- [ ] **Step 4: Run planner evaluation and type checking**

Run: `pnpm vitest run features/chat/api/plan-chat-question.test.ts features/chat/api/plan-chat-question.model-normalization.test.ts features/chat/lib/chat-planner-evaluation.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit`

Expected: PASS. Keep a temporary local conversion inside `answer-blog-chat-question.ts` so the existing orchestrator can consume the patch until Task 8. The conversion must stay private to that file and must not introduce a new shared compatibility module.

- [ ] **Step 5: Commit the planner replacement**

```bash
git add features/chat/api/plan-chat-question.ts features/chat/api/plan-chat-question.test.ts features/chat/api/plan-chat-question.model-normalization.test.ts features/chat/lib/chat-question-context.ts features/chat/fixtures/chat-planner-evaluation.ts features/chat/lib/chat-planner-evaluation.test.ts features/chat/model/answer-blog-chat-question.ts
git commit -m "refactor(chat): plan conversational intent patches"
```

## Task 4: Enforce Required Concepts Before Evidence Ranking

**Files:**
- Create: `features/chat/lib/chat-required-concepts.ts`
- Create: `features/chat/lib/chat-required-concepts.test.ts`
- Modify: `features/chat/lib/chat-search.ts`
- Modify: `features/chat/lib/chat-search.test.ts`
- Modify: `features/chat/lib/select-final-chat-evidence.ts`
- Modify: `features/chat/lib/select-final-chat-evidence.test.ts`
- Modify: `features/chat/lib/question-analysis.ts`

- [ ] **Step 1: Write failing retrieval contract tests**

Add fixtures where profile evidence matches `이윤수` but only a blog record matches `Vercel`. Assert that required-concept filtering retains the Vercel record. Add an optional concept that changes rank but does not remove records. Add an alias fixture such as `버셀 -> vercel` through the existing semantic term expansion configuration.

- [ ] **Step 2: Run focused retrieval tests and verify they fail**

Run: `pnpm vitest run features/chat/lib/chat-required-concepts.test.ts features/chat/lib/chat-search.test.ts features/chat/lib/select-final-chat-evidence.test.ts`

Expected: FAIL because required and optional concepts are still flattened.

- [ ] **Step 3: Implement concept normalization and filtering**

Expose:

```ts
export function normalizeChatConcepts(params: {
  concepts: string[]
  locale: SupportedLocale
}): string[]

export function selectEvidenceCoveringRequiredConcepts(params: {
  matches: ChatEvidenceRecord[]
  requiredConcepts: string[]
  locale: SupportedLocale
}): ChatEvidenceRecord[]
```

Build normalized record text from title, section title, content, tags, and search terms. The selected evidence set qualifies when every required concept group is represented by at least one record, allowing comparison concepts to be covered by different records. Return an empty array if any concept has no supporting record. Place one best record per required concept before the remaining ranked records, deduplicate by evidence id, and only then apply `TOP_K`. Pass optional concepts to lexical scoring only. Remove `preserveAdditionalKeywordMatches` and `buildPrioritizedAdditionalKeywordTokens`, because hard requirements now run before ranking rather than being inserted into ranked output.

- [ ] **Step 4: Run retrieval tests**

Run: `pnpm vitest run features/chat/lib/chat-required-concepts.test.ts features/chat/lib/chat-search.test.ts features/chat/lib/select-final-chat-evidence.test.ts features/chat/lib/chat-retrieval-fusion.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the retrieval contract**

```bash
git add features/chat/lib/chat-required-concepts.ts features/chat/lib/chat-required-concepts.test.ts features/chat/lib/chat-search.ts features/chat/lib/chat-search.test.ts features/chat/lib/select-final-chat-evidence.ts features/chat/lib/select-final-chat-evidence.test.ts features/chat/lib/question-analysis.ts
git commit -m "refactor(chat): separate required and optional evidence concepts"
```

## Task 5: Implement Intent-Native Retrieval and Executors

**Files:**
- Create: `features/chat/model/execute-chat-intent.ts`
- Create: `features/chat/model/execute-chat-intent.test.ts`
- Modify: `features/chat/model/retrieve-blog-chat-evidence.ts`
- Modify: `features/chat/model/retrieve-blog-chat-evidence.test.ts`
- Modify: `features/chat/lib/chat-retrieval-scope.ts`
- Modify: `features/chat/lib/chat-retrieval-scope.test.ts`
- Modify: `features/chat/lib/resolve-chat-request.ts`
- Modify: `features/chat/lib/resolve-chat-request.test.ts`
- Modify: `features/chat/lib/should-rerank-chat-evidence.ts`
- Modify: `features/chat/lib/should-rerank-chat-evidence.test.ts`
- Modify: `features/chat/model/chat-rag-workflow.ts`

- [ ] **Step 1: Write failing executor tests**

Cover the complete execution matrix:

```ts
it('returns a clarification and next state when missingSlots is non-empty', () => {})
it('returns the latest title without calling the answer model', () => {})
it('includes the date only when requestedFields contains published_at', () => {})
it('selects the latest post and calls the answer model for summarize', () => {})
it('returns contact data without retrieval', () => {})
it('retrieves only the current post for current_source scope', () => {})
it('returns insufficient_search_match when required concepts have no evidence', () => {})
it('returns unsupported_intent for an invalid operation and field combination', () => {})
```

- [ ] **Step 2: Run executor and retrieval tests and verify they fail**

Run: `pnpm vitest run features/chat/model/execute-chat-intent.test.ts features/chat/model/retrieve-blog-chat-evidence.test.ts features/chat/lib/resolve-chat-request.test.ts`

Expected: FAIL because retrieval still requires `ChatQuestionPlan`.

- [ ] **Step 3: Convert scope and reranking functions to intent input**

Use these contracts:

```ts
export function resolveChatRetrievalScope(params: {
  intent: NormalizedChatIntent
  currentPostSlug?: string
}): ChatResolvedRetrievalScope

export function shouldRerankChatEvidence(params: {
  question: string
  conversationHistoryCount: number
  matchCount: number
  intent: NormalizedChatIntent
}): boolean
```

`retrieveBlogChatEvidence` receives `intent` and passes `requiredConcepts` and `optionalConcepts` separately through lexical, semantic, fusion, and reranking stages.

- [ ] **Step 4: Implement executor selection**

Return a discriminated result:

```ts
export type ExecuteChatIntentResult =
  | { kind: 'direct'; response: BlogChatResponse; matches: ChatEvidenceRecord[] }
  | { kind: 'model'; question: string; matches: ChatEvidenceRecord[] }
  | {
      kind: 'refusal'
      refusalReason: 'insufficient_search_match' | 'model_error'
      failureKind?: 'unsupported_intent'
    }
```

Use `requestedFields.includes('published_at')` for date output. Do not inspect Korean or English date phrases. For latest/oldest summarize, explain, and compare operations, select the chronological record and return `kind: 'model'`.

- [ ] **Step 5: Run intent-native execution tests**

Run: `pnpm vitest run features/chat/model/execute-chat-intent.test.ts features/chat/model/retrieve-blog-chat-evidence.test.ts features/chat/lib/chat-retrieval-scope.test.ts features/chat/lib/resolve-chat-request.test.ts features/chat/lib/should-rerank-chat-evidence.test.ts features/chat/model/chat-rag-workflow.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit intent-native execution**

```bash
git add features/chat/model/execute-chat-intent.ts features/chat/model/execute-chat-intent.test.ts features/chat/model/retrieve-blog-chat-evidence.ts features/chat/model/retrieve-blog-chat-evidence.test.ts features/chat/lib/chat-retrieval-scope.ts features/chat/lib/chat-retrieval-scope.test.ts features/chat/lib/resolve-chat-request.ts features/chat/lib/resolve-chat-request.test.ts features/chat/lib/should-rerank-chat-evidence.ts features/chat/lib/should-rerank-chat-evidence.test.ts features/chat/model/chat-rag-workflow.ts
git commit -m "refactor(chat): execute normalized intents directly"
```

## Task 6: Build Semantic Cache Keys and Intent Observability

**Files:**
- Create: `features/chat/lib/chat-intent-cache-key.ts`
- Create: `features/chat/lib/chat-intent-cache-key.test.ts`
- Modify: `features/chat/model/chat-observability.ts`
- Modify: `features/chat/model/chat-observability.test.ts`
- Modify: `features/chat/model/chat-semantic-cache.ts`
- Modify: `features/chat/model/chat-semantic-cache.test.ts`

- [ ] **Step 1: Write failing cache-key tests**

Assert that two wording variants with equal intents have the same key, while changing target, `published_at`, required concepts, current slug, or evidence version changes the key. Assert stable ordering for concept arrays.

- [ ] **Step 2: Run cache and observability tests and verify they fail**

Run: `pnpm vitest run features/chat/lib/chat-intent-cache-key.test.ts features/chat/model/chat-observability.test.ts features/chat/model/chat-semantic-cache.test.ts`

Expected: FAIL because cache identity is question-based.

- [ ] **Step 3: Implement stable intent serialization**

Use an explicit ordered tuple rather than `JSON.stringify` on the whole object:

```ts
export function buildChatIntentCacheKey(params: {
  locale: SupportedLocale
  intent: NormalizedChatIntent
  currentPostSlug?: string
  evidenceVersion: string
}): string {
  return [
    params.locale,
    params.intent.target.kind,
    params.intent.target.slug ?? '',
    params.intent.target.title ?? '',
    params.intent.operation,
    params.intent.temporalConstraint.order,
    [...params.intent.requestedFields].sort().join(','),
    [...params.intent.requiredConcepts].map(normalizeCachePart).sort().join(','),
    params.intent.evidenceScope,
    params.currentPostSlug ?? '',
    params.evidenceVersion,
  ].map(encodeURIComponent).join(':')
}
```

Add `BLOG_CHAT.EVIDENCE_VERSION`, resolved as `process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'development'`, so deployed semantic cache entries are tied to the content-bearing commit. Replace observability plan fields with `operation`, `targetKind`, `evidenceScope`, `temporalOrder`, `requestedFields`, `requiredConcepts`, `optionalConcepts`, and `plannerFailureKind`. Add database columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so existing deployments migrate safely.

- [ ] **Step 4: Run cache and observability tests**

Run: `pnpm vitest run features/chat/lib/chat-intent-cache-key.test.ts features/chat/model/chat-observability.test.ts features/chat/model/chat-semantic-cache.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit cache and observability changes**

```bash
git add features/chat/lib/chat-intent-cache-key.ts features/chat/lib/chat-intent-cache-key.test.ts features/chat/model/chat-observability.ts features/chat/model/chat-observability.test.ts features/chat/model/chat-semantic-cache.ts features/chat/model/chat-semantic-cache.test.ts features/chat/config/constants.ts
git commit -m "refactor(chat): key cache and telemetry by normalized intent"
```

## Task 7: Persist Conversation State Through the SDK Transport

**Files:**
- Modify: `features/chat/model/chat-schema.ts`
- Modify: `features/chat/model/chat-schema.test.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/chat/route-adapter.test.ts`
- Modify: `widgets/chatbot/ui/blog-chat-widget.tsx`
- Modify: `widgets/chatbot/ui/blog-chat-widget.test.tsx`

- [ ] **Step 1: Write failing transport tests**

Assert that:

- The latest valid assistant metadata state is forwarded as `conversationState` in the application request.
- Invalid or version `2` metadata is replaced with `EMPTY_CHAT_CONVERSATION_STATE`.
- The application result state is written to assistant message metadata.
- Existing citations remain preserved.

- [ ] **Step 2: Run route adapter and widget tests and verify they fail**

Run: `pnpm vitest run app/api/chat/route-adapter.test.ts widgets/chatbot/ui/blog-chat-widget.test.tsx features/chat/model/chat-schema.test.ts`

Expected: FAIL because metadata contains only `blogChatResponse`.

- [ ] **Step 3: Extend request and response contracts**

Add `conversationState` to `BlogChatRequestSchema`. Introduce a transport envelope so factual response and client state are explicit:

```ts
export const BlogChatApplicationResponseSchema = z.object({
  response: BlogChatResponseSchema,
  conversationState: ChatConversationStateSchema,
})
```

Keep Lee Chat visible content sourced from `response.answer`. Store both `blogChatResponse: response` and `conversationState` in assistant metadata. Read only the most recent valid assistant state from request history; do not merge multiple client states in the route adapter.

- [ ] **Step 4: Run transport tests**

Run: `pnpm vitest run app/api/chat/route-adapter.test.ts app/api/chat/route.test.ts widgets/chatbot/ui/blog-chat-widget.test.tsx features/chat/model/chat-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit SDK state persistence**

```bash
git add features/chat/model/chat-schema.ts features/chat/model/chat-schema.test.ts app/api/chat/route.ts app/api/chat/route-adapter.test.ts widgets/chatbot/ui/blog-chat-widget.tsx widgets/chatbot/ui/blog-chat-widget.test.tsx
git commit -m "feat(chat): persist conversation state in sdk metadata"
```

## Task 8: Replace the Application Orchestrator

**Files:**
- Modify: `features/chat/model/answer-blog-chat-question.ts`
- Modify: `features/chat/model/answer-blog-chat-question.test.ts`
- Modify: `features/chat/api/answer-blog-question.test.ts`
- Modify: `features/chat/config/constants.ts`
- Modify: `features/chat/lib/blog-chat-cache.ts`
- Modify: `features/chat/lib/blog-chat-cache.test.ts`

- [ ] **Step 1: Write failing end-to-end application tests**

Test these application-level flows with planner and answer model mocks:

```text
이 사람 Vercel 써봤어? -> clarification state
블로그 주인 + clarification state -> grounded answer without another clarification
마지막 글 언제야? -> title and published date
latest post summarize -> model-backed summary with latest-post evidence
tampered state -> empty state and safe replanning
same wording with different targets -> different exact cache entries
planner first failure then success -> normal answer
planner double failure with executable state -> deterministic answer
feature flag disabled -> legacy pipeline during the migration commit
feature flag enabled -> stateful pipeline
```

- [ ] **Step 2: Run orchestrator tests and verify they fail**

Run: `pnpm vitest run features/chat/model/answer-blog-chat-question.test.ts features/chat/api/answer-blog-question.test.ts`

Expected: FAIL because orchestration still branches on `route` and `directAction`.

- [ ] **Step 3: Rewrite orchestration around state and intent**

The application sequence must be exactly:

```ts
function buildFallbackStateResult(params: {
  question: string
  previousState: ChatConversationState
}): ReduceChatConversationStateResult | null {
  const intent = buildIntentFromConversationState({
    question: params.question,
    state: params.previousState,
  })

  if (!intent) {
    return null
  }

  return {
    intent,
    nextState: params.previousState,
  }
}

const previousState = parseOrResetConversationState(request.conversationState)
const patchResult = await planChatIntentPatch({
  question: request.question,
  locale,
  conversationState: previousState,
  conversationHistory: request.conversationHistory,
  currentPostSlug: request.currentPostSlug,
  assistantProfile,
})
const reducedState = patchResult.ok
  ? reduceChatConversationState({
      previousState,
      intentPatch: patchResult.intentPatch,
    })
  : buildFallbackStateResult({
      question: request.question,
      previousState,
    })
if (!reducedState) {
  return buildPlannerFailureApplicationResponse(patchResult)
}
const { intent, nextState } = reducedState
const cacheKey = buildChatIntentCacheKey({
  locale,
  intent,
  currentPostSlug: request.currentPostSlug,
  evidenceVersion: BLOG_CHAT.EVIDENCE_VERSION,
})
const execution = await executeChatIntent({ intent, locale, currentPostSlug: request.currentPostSlug })
```

Every return path must return `BlogChatApplicationResponse` containing `nextState`. Do not cache clarification or refusal responses. Keep rate limits, daily limits, citation validation, follow-up suggestions, and concurrent slot release behavior unchanged.

Gate the new branch with `BLOG_CHAT.PIPELINE.STATEFUL_RAG_ENABLED`, resolved from `BLOG_CHAT_STATEFUL_RAG_ENABLED !== 'false'`. This flag exists only for the migration commit. Task 9 removes the disabled branch and the flag after regression verification.

- [ ] **Step 4: Run application and API tests**

Run: `pnpm vitest run features/chat/model/answer-blog-chat-question.test.ts features/chat/api/answer-blog-question.test.ts app/api/chat`

Expected: PASS.

- [ ] **Step 5: Commit the new orchestrator**

```bash
git add features/chat/model/answer-blog-chat-question.ts features/chat/model/answer-blog-chat-question.test.ts features/chat/api/answer-blog-question.test.ts features/chat/config/constants.ts features/chat/lib/blog-chat-cache.ts features/chat/lib/blog-chat-cache.test.ts
git commit -m "refactor(chat): orchestrate stateful conversational rag"
```

## Task 9: Remove Legacy Planning and Complete Regression Verification

**Files:**
- Delete: `features/chat/model/chat-question-plan.ts`
- Delete: `features/chat/model/chat-question-plan.test.ts`
- Delete: `features/chat/model/chat-question-routing.ts`
- Delete: `features/chat/model/resolve-chat-intent-frame.ts`
- Delete: `features/chat/model/resolve-chat-intent-frame.test.ts`
- Delete: `features/chat/lib/chat-question-plan-routing.ts`
- Delete: `features/chat/model/chat-intent-frame.ts`
- Delete: `features/chat/model/chat-intent-frame.test.ts`
- Modify: all remaining `features/chat/**/*.ts` imports found by `rg`
- Modify: `scripts/evaluate-chat-retrieval.ts`
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `features/chat/lib/chat-planner-evaluation.test.ts`

- [ ] **Step 1: Prove legacy dependencies still exist before deletion**

Run: `rg -n "ChatQuestionPlan|directAction|retrievalScope|additionalKeywords|CHAT_CONFIRMATION_FOLLOW_UP|CHAT_CHRONOLOGICAL_DIRECT_ROUTING" features/chat app/api/chat scripts`

Expected: Matches remain and define the deletion scope.

- [ ] **Step 2: Remove legacy files and migrate remaining evaluation code**

Delete the legacy schemas, adapter, routing helpers, phrase lists, migration feature flag, disabled legacy branch, and their implementation-detail tests. Rewrite planner fixtures to store input state, model patch, expected normalized intent, and expected execution kind. Keep retrieval evaluation behavior assertions rather than route-string assertions.

- [ ] **Step 3: Confirm legacy symbols are gone**

Run: `rg -n "ChatQuestionPlan|directAction|retrievalScope|additionalKeywords|CHAT_CONFIRMATION_FOLLOW_UP|CHAT_CHRONOLOGICAL_DIRECT_ROUTING" features/chat app/api/chat scripts`

Expected: No matches. `retrievalScope` may remain only if it is part of a database or LangGraph external contract; rename internal values to `evidenceScope` where controlled by this repository.

- [ ] **Step 4: Run all chat tests**

Run: `pnpm vitest run app/api/chat features/chat widgets/chatbot`

Expected: All tests pass.

- [ ] **Step 5: Run static and repository checks**

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: Run retrieval evaluation**

Run: `pnpm eval:chat-retrieval`

Expected: all deterministic evaluation cases pass; model-dependent cases report results without schema failures.

- [ ] **Step 7: Run live local scenarios on port 3003**

Run: `pnpm dev --port 3003`

Verify through the UI or API:

```text
마지막 글 언제야?
이 사람 Vercel 써봤어? -> 블로그 주인
최신 글 요약해줘
이 글에서 핵심이 뭐야? on a blog post page
```

Expected: no repeated clarification, dates follow requested fields, responses have valid citations, and a page reload preserves resolved state through localStorage.

- [ ] **Step 8: Commit legacy removal and verification fixes**

```bash
git add -A
git commit -m "refactor(chat): remove legacy question plan pipeline"
```

## Completion Criteria

- `ChatQuestionPlan`, route strings, direct-action strings, and natural-language correction lists no longer exist.
- `ChatIntentPatch` and `ChatConversationState` are validated at every transport boundary.
- `NormalizedChatIntent` reaches executor, retrieval, cache, and observability without field flattening.
- Required concepts filter evidence before ranking; optional concepts only influence rank.
- Clarification responses suspend and resume the original intent without asking the same question twice.
- Cache identity includes semantic intent and evidence version.
- SDK localStorage persists the latest state without adding server-side persistence.
- Full chat tests, TypeScript, lint, retrieval evaluation, and live scenarios pass.
