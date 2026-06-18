# Stateful Conversational RAG Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the deployed chatbot's answer quality and complete a version 2 stateful conversational RAG pipeline grounded by a dynamic entity catalog.

**Architecture:** Build canonical entity candidates from existing post, project, profile, and assistant sources. The planner selects candidate IDs and an explicit context action; a normalizer and invariant validator produce an executable intent, and a reducer persists only minimal version 2 state. Existing retrieval and answer execution remain downstream consumers of `NormalizedChatIntent`.

**Tech Stack:** Next.js 16.1.1, React 19.1, TypeScript 5, Zod 4.1.5, AI SDK 6.0.149, `@ai-sdk/openai` 3.0.51, `lee-chat-sdk` 0.3.1, Vitest 4

---

## File Map

- `features/chat/model/chat-entity-candidate.ts`: candidate schema and catalog-facing domain types.
- `features/chat/model/get-chat-entity-candidates.ts`: build locale-specific candidates from existing content records.
- `features/chat/lib/match-chat-entity-candidates.ts`: pure normalized title, slug, and alias matching.
- `features/chat/model/chat-intent.ts`: version 2 planner and normalized intent schemas.
- `features/chat/model/normalize-chat-intent-plan.ts`: candidate resolution, scope normalization, and invariant validation.
- `features/chat/model/chat-conversation-state.ts`: minimal version 2 client state.
- `features/chat/model/reduce-chat-conversation-state.ts`: explicit `continue`, `reset`, and `resolve_clarification` transitions.
- `features/chat/api/plan-chat-intent-patch.ts`: rename behavior to candidate-grounded `planChatIntent` while keeping the file path direct.
- `features/chat/model/run-stateful-blog-chat-pipeline.ts`: candidate lookup, planning, normalization, reduction, and unchanged execution/cache orchestration.
- `features/chat/fixtures/chat-planner-evaluation.ts`: golden planner and conversation cases.
- `scripts/evaluate-chat-planner.ts`: live `.env` planner evaluation with non-zero exit on regression.
- `app/api/chat/route.ts`: version 2 state metadata validation and persistence.

## Task 1: Add Golden Planner Regression Cases and Live Evaluator

**Files:**
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `features/chat/lib/chat-planner-evaluation.test.ts`
- Create: `scripts/evaluate-chat-planner.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing golden assertions**

Add cases for these exact questions and assert that none requests clarification:

```ts
const GOLDEN_QUESTIONS = [
  'lee-spec-kit을 왜 만들었어?',
  'Leemage에서 Presigned URL을 사용한 이유가 뭐야?',
  '최근 프로젝트에서 AI를 어떻게 활용하고 있어?',
] as const
```

The first two must select their canonical project candidate and use `entity`; the last must use `corpus`. Add a conversation case for `이 사람 Vercel 써봤어? -> 블로그 주인 -> 왜 그만 썼어? -> Leemage...` and assert the last turn resets the prior clarification.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run features/chat/lib/chat-planner-evaluation.test.ts`

Expected: FAIL because version 2 candidate and context-action fields do not exist.

- [ ] **Step 3: Add the live evaluator contract**

Create an evaluator that loads `.env`, invokes the real planner for every golden case, prints JSON, and sets `process.exitCode = 1` when any expected context action, candidate ID, scope, required concept, or clarification expectation differs. If `OPENAI_API_KEY` is missing, exit non-zero with `missing_api_key`; do not report success.

Add:

```json
"eval:chat-planner": "tsx scripts/evaluate-chat-planner.ts"
```

- [ ] **Step 4: Commit regression definitions**

```bash
git add features/chat/fixtures/chat-planner-evaluation.ts features/chat/lib/chat-planner-evaluation.test.ts scripts/evaluate-chat-planner.ts package.json
git commit -m "test(chat): define conversational rag golden baseline"
```

## Task 2: Build and Match the Dynamic Entity Catalog

**Files:**
- Create: `features/chat/model/chat-entity-candidate.ts`
- Create: `features/chat/model/get-chat-entity-candidates.ts`
- Create: `features/chat/model/get-chat-entity-candidates.test.ts`
- Create: `features/chat/lib/match-chat-entity-candidates.ts`
- Create: `features/chat/lib/match-chat-entity-candidates.test.ts`

- [ ] **Step 1: Write failing catalog tests**

Assert that candidates built from injected evidence records:

```ts
expect(candidates).toContainEqual(expect.objectContaining({
  entityId: 'project/leemage',
  kind: 'project',
  slug: 'leemage',
  title: 'Leemage',
}))
```

Assert normalized matching finds `project/lee-spec-kit` from `lee-spec-kit을 왜 만들었어?`, `project/leemage` from the Presigned URL question, and returns an empty array for `최근 프로젝트에서 AI를 어떻게 활용하고 있어?`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run features/chat/model/get-chat-entity-candidates.test.ts features/chat/lib/match-chat-entity-candidates.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement candidate schemas and pure matching**

Use named exports and these contracts:

```ts
export interface ChatEntityCandidate {
  entityId: string
  kind: 'post' | 'project' | 'profile' | 'assistant'
  slug: string
  title: string
  aliases: string[]
  searchTerms: string[]
  sourceCategory: ChatSourceCategory
}

export function buildChatEntityCandidates(params: {
  records: ChatEvidenceRecord[]
}): ChatEntityCandidate[]

export function matchChatEntityCandidates(params: {
  question: string
  candidates: ChatEntityCandidate[]
}): ChatEntityCandidate[]
```

Group evidence sections by source category and slug, derive project identity from project URLs/categories rather than a hardcoded name list, and deduplicate aliases case-insensitively. Match only title, slug, and aliases; broad search terms must not turn concepts such as `AI` into a project target.

- [ ] **Step 4: Implement the runtime loader**

`getChatEntityCandidates(locale)` combines the existing generated blog records with `getCuratedChatSources(locale)`, then calls the pure builder. Keep content loading in `model`, not `lib`.

- [ ] **Step 5: Verify and commit**

Run: `pnpm vitest run features/chat/model/get-chat-entity-candidates.test.ts features/chat/lib/match-chat-entity-candidates.test.ts`

```bash
git add features/chat/model/chat-entity-candidate.ts features/chat/model/get-chat-entity-candidates.ts features/chat/model/get-chat-entity-candidates.test.ts features/chat/lib/match-chat-entity-candidates.ts features/chat/lib/match-chat-entity-candidates.test.ts
git commit -m "feat(chat): build dynamic entity candidate catalog"
```

## Task 3: Define Version 2 Intent, State, Normalization, and Invariants

**Files:**
- Modify: `features/chat/model/chat-intent.ts`
- Modify: `features/chat/model/chat-intent.test.ts`
- Modify: `features/chat/model/chat-conversation-state.ts`
- Modify: `features/chat/model/chat-conversation-state.test.ts`
- Create: `features/chat/model/normalize-chat-intent-plan.ts`
- Create: `features/chat/model/normalize-chat-intent-plan.test.ts`

- [ ] **Step 1: Write failing schema and invariant tests**

Assert `ChatIntentPlanSchema` accepts:

```ts
{
  contextAction: 'reset',
  targetSelection: { kind: 'candidate', entityId: 'project/leemage' },
  operation: 'explain',
  evidenceScope: 'entity',
}
```

Assert state version `2` accepts only `focusedTarget`, `lastIntent`, and `pendingClarification`. Assert normalization rejects an unknown candidate, rejects `resolve_clarification` without pending state, rejects evidence operations with `none`, clears pending state on reset, and canonicalizes target-backed scope to `entity`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.test.ts features/chat/model/normalize-chat-intent-plan.test.ts`

Expected: FAIL on the old `targetUpdate` and version 1 state contract.

- [ ] **Step 3: Implement version 2 schemas**

Replace `ChatTargetUpdateSchema` and `ChatIntentPatchSchema` with:

```ts
export const ChatContextActionSchema = z.enum([
  'continue',
  'reset',
  'resolve_clarification',
])

export const ChatTargetSelectionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('candidate'), entityId: z.string().trim().min(1).max(180) }),
  z.object({ kind: z.literal('preserve') }),
  z.object({ kind: z.literal('none') }),
])
```

`ChatIntentPlanSchema` extends the existing meaning fields. Keep `NormalizedChatIntent` as the downstream execution contract.

Set `CHAT_CONVERSATION_STATE_VERSION = 2` and define:

```ts
interface ChatConversationState {
  version: 2
  focusedTarget: ChatTarget | null
  lastIntent: NormalizedChatIntent | null
  pendingClarification: ChatPendingClarification | null
}
```

- [ ] **Step 4: Implement normalization and invariants**

Use a discriminated result:

```ts
export function normalizeChatIntentPlan(params: {
  intentPlan: ChatIntentPlan
  candidates: ChatEntityCandidate[]
  previousState: ChatConversationState
  currentPostSlug?: string
}):
  | { ok: true; intent: NormalizedChatIntent }
  | { ok: false; failureKind: 'invalid_candidate' | 'invalid_intent_plan' | 'invalid_transition' }
```

Resolve candidate IDs to canonical targets. Permit clarification only with actual missing slots. Scope normalization may fix `entity`, `current_source`, and `corpus`; it must not invent a missing canonical target or resume stale clarification.

- [ ] **Step 5: Verify and commit**

Run the three test files from Step 2 and `pnpm exec tsc --noEmit`.

```bash
git add features/chat/model/chat-intent.ts features/chat/model/chat-intent.test.ts features/chat/model/chat-conversation-state.ts features/chat/model/chat-conversation-state.test.ts features/chat/model/normalize-chat-intent-plan.ts features/chat/model/normalize-chat-intent-plan.test.ts
git commit -m "refactor(chat): define version two intent invariants"
```

## Task 4: Ground the Planner With Candidate IDs

**Files:**
- Modify: `features/chat/api/plan-chat-intent-patch.ts`
- Modify: `features/chat/api/plan-chat-intent-patch.test.ts`
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `scripts/evaluate-chat-planner.ts`

- [ ] **Step 1: Write failing planner tests**

Mock `generateText` and assert candidates are serialized into the prompt; valid output returns `intentPlan`; schema failure retries once; a second failure returns `invalid_intent_plan`; and no API key returns `planner_unavailable` without mutating state.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm vitest run features/chat/api/plan-chat-intent-patch.test.ts`

Expected: FAIL because the current planner returns `intentPatch` and has no candidates.

- [ ] **Step 3: Implement candidate-grounded planning**

Rename the exported function to `planChatIntent` and its result property to `intentPlan`. Accept `entityCandidates`. The prompt must state that target selection can use only supplied `entityId` values, `reset + candidate` represents an independent named topic, multi-document questions use `corpus`, and unknown non-pronoun terms should search corpus before clarification.

On validation failure, include the prior validation failure summary in the second attempt prompt. Keep the maximum attempt count as a named config constant.

- [ ] **Step 4: Verify and commit**

Run the planner test and golden fixture test.

```bash
git add features/chat/api/plan-chat-intent-patch.ts features/chat/api/plan-chat-intent-patch.test.ts features/chat/fixtures/chat-planner-evaluation.ts scripts/evaluate-chat-planner.ts
git commit -m "fix(chat): ground planner with entity candidates"
```

## Task 5: Replace State Reduction With Explicit Context Actions

**Files:**
- Modify: `features/chat/model/reduce-chat-conversation-state.ts`
- Modify: `features/chat/model/reduce-chat-conversation-state.test.ts`

- [ ] **Step 1: Write failing transition tests**

Cover `continue`, `reset`, and `resolve_clarification`. Specifically assert that a new Leemage reset after a pending Vercel clarification uses Leemage and removes the pending state, while `블로그 주인` with `resolve_clarification` resumes the suspended Vercel intent.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm vitest run features/chat/model/reduce-chat-conversation-state.test.ts`

Expected: FAIL because the reducer still infers resume from any target replacement.

- [ ] **Step 3: Implement the pure version 2 reducer**

Accept an already normalized current intent and its context action:

```ts
export function reduceChatConversationState(params: {
  previousState: ChatConversationState
  contextAction: ChatContextAction
  intent: NormalizedChatIntent
}): ReduceChatConversationStateResult
```

Only `resolve_clarification` merges the suspended intent. `reset` never reads old intent fields. `continue` may preserve the focused target already resolved by normalization but does not concatenate concepts. Invalid transitions return a typed failure rather than throwing.

- [ ] **Step 4: Verify and commit**

Run reducer, normalization, and state tests.

```bash
git add features/chat/model/reduce-chat-conversation-state.ts features/chat/model/reduce-chat-conversation-state.test.ts
git commit -m "fix(chat): enforce explicit conversation transitions"
```

## Task 6: Connect Catalog, Planner, Reducer, Retrieval, and SDK Metadata

**Files:**
- Modify: `features/chat/model/run-stateful-blog-chat-pipeline.ts`
- Modify: `features/chat/model/run-stateful-blog-chat-pipeline.test.ts`
- Modify: `features/chat/model/answer-blog-chat-question-stateful.test.ts`
- Modify: `features/chat/model/chat-intent-cache-key.ts`
- Modify: `features/chat/model/chat-intent-cache-key.test.ts`
- Modify: `features/chat/model/chat-observability.ts`
- Modify: `features/chat/model/chat-observability.test.ts`
- Modify: `features/chat/model/chat-schema.ts`
- Modify: `features/chat/model/chat-schema.test.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/chat/route-adapter.test.ts`
- Modify: `widgets/chatbot/ui/blog-chat-widget.test.tsx`

- [ ] **Step 1: Write failing pipeline and route tests**

Assert the pipeline calls candidate loading before planning, normalizes before reduction, preserves the previous state on planner/normalizer failure, and returns version 2 state in assistant metadata. Assert invalid version 1 metadata falls back to `EMPTY_CHAT_CONVERSATION_STATE`.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm vitest run features/chat/model/run-stateful-blog-chat-pipeline.test.ts features/chat/model/answer-blog-chat-question-stateful.test.ts app/api/chat/route-adapter.test.ts widgets/chatbot/ui/blog-chat-widget.test.tsx`

Expected: FAIL on old planner dependency and version 1 metadata.

- [ ] **Step 3: Connect runtime dependencies**

The pipeline order must be:

```ts
const candidates = await getEntityCandidates(request.locale)
const matchingCandidates = matchEntityCandidates({
  question: request.question,
  candidates,
})
const plannerResult = await planIntent({
  ...request,
  entityCandidates: matchingCandidates,
})
const normalizedResult = normalizeIntentPlan({
  intentPlan: plannerResult.intentPlan,
  candidates: matchingCandidates,
  previousState: request.conversationState,
  currentPostSlug: request.currentPostSlug,
})
```

Then reduce, execute, validate citations, cache only grounded successful responses, and serialize version 2 state. Add context action and failure kinds to observability. Cache keys continue to use normalized execution meaning, not raw state.

- [ ] **Step 4: Remove obsolete version 1 symbols**

Run:

```bash
rg 'ChatIntentPatch|ChatTargetUpdate|targetUpdate|resolvedTarget|activeOperation|lastResolvedQuestion' features/chat app/api/chat widgets/chatbot
```

Expected: no production references. Test fixture references must also be migrated rather than retained as compatibility aliases.

- [ ] **Step 5: Verify and commit**

Run all files from Step 2 plus cache, observability, and schema tests.

```bash
git add features/chat app/api/chat widgets/chatbot
git commit -m "refactor(chat): connect version two conversational rag"
```

## Task 7: Full Verification and Runtime Regression Audit

**Files:**
- Modify only files required by failures discovered during verification.

- [ ] **Step 1: Run focused chat tests**

Run: `pnpm vitest run features/chat app/api/chat widgets/chatbot`

Expected: all tests pass with zero unhandled errors.

- [ ] **Step 2: Run static verification**

Run:

```bash
pnpm exec tsc --noEmit
pnpm eslint features/chat app/api/chat widgets/chatbot scripts/evaluate-chat-planner.ts
git diff --check
```

Expected: exit code 0 for every command.

- [ ] **Step 3: Run deterministic retrieval evaluation**

Run: `pnpm eval:chat-retrieval`

Expected: every golden case has Recall@3 and no failure entries.

- [ ] **Step 4: Run live planner evaluation**

Run: `pnpm eval:chat-planner`

Expected: all golden planner and transition expectations pass. Missing API credentials are a failed verification, not a pass.

- [ ] **Step 5: Run browser scenarios**

Start the worktree app and verify through the local browser:

```text
lee-spec-kit을 왜 만들었어?
Leemage에서 Presigned URL을 사용한 이유가 뭐야?
최근 프로젝트에서 AI를 어떻게 활용하고 있어?
이 사람 Vercel 써봤어? -> 블로그 주인 -> 왜 그만 썼어?
```

Reload after one answered turn and confirm localStorage restores version 2 state. Ask an independent Leemage question and confirm it resets the previous pending clarification.

- [ ] **Step 6: Run full project verification**

Run:

```bash
pnpm test:run
pnpm build
```

Expected: exit code 0.

- [ ] **Step 7: Commit verification fixes**

If verification required changes, commit them as:

```bash
git add <only-files-changed-for-verification>
git commit -m "test(chat): verify conversational rag recovery"
```

If no files changed, do not create an empty commit.
