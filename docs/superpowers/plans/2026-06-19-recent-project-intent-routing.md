# Recent Project Intent Routing Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent recent multi-project content questions from being collapsed into the deterministic latest-blog-post response.

**Architecture:** Restrict chronological single-record execution to explicit metadata lookup intents whose requested fields contain only `title` and `published_at`. Keep temporal order as a retrieval/ranking hint for corpus content questions. Strengthen planner evaluation so operation, temporal constraint, requested fields, execution kind, and source category are verified.

**Tech Stack:** TypeScript 5, Zod 4.1.5, AI SDK 6.0.149, Vitest 4, Next.js 16.1.1

---

## Task 1: Reproduce the Executor Regression

**Files:**
- Modify: `features/chat/lib/resolve-chat-intent-request.test.ts`

- [ ] **Step 1: Add a failing regression test**

Add a corpus Intent matching the live planner's problematic output:

```ts
{
  operation: 'answer',
  temporalConstraint: { order: 'latest' },
  requestedFields: ['content', 'summary', 'published_at'],
  evidenceScope: 'corpus',
  requiredConcepts: ['AI'],
  optionalConcepts: ['프로젝트'],
}
```

Assert it calls the answer model with AI/project evidence and does not return `최신 글은 ...`.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm vitest run features/chat/lib/resolve-chat-intent-request.test.ts`

Expected: FAIL because the current chronological branch returns a direct response.

## Task 2: Guard Chronological Direct Lookup

**Files:**
- Modify: `features/chat/lib/resolve-chat-intent-request.ts`
- Modify: `features/chat/lib/resolve-chat-intent-request.test.ts`

- [ ] **Step 1: Implement a semantic guard**

Add a pure predicate:

```ts
function isChronologicalMetadataLookup(intent: NormalizedChatIntent): boolean {
  return (
    intent.operation === 'answer' &&
    intent.requestedFields.length > 0 &&
    intent.requestedFields.every((field) => {
      return field === 'title' || field === 'published_at'
    })
  )
}
```

Call `selectChronologicalRecord` only for this predicate. Content, summary, explain, compare, and recommendation intents continue into normal scoped retrieval.

- [ ] **Step 2: Verify GREEN and existing latest-post behavior**

Run: `pnpm vitest run features/chat/lib/resolve-chat-intent-request.test.ts features/chat/lib/chat-retrieval-evaluation.test.ts`

Expected: PASS, including existing latest title/date tests.

## Task 3: Strengthen Golden Planner and Execution Evaluation

**Files:**
- Modify: `features/chat/fixtures/chat-planner-evaluation.ts`
- Modify: `features/chat/lib/chat-planner-evaluation.test.ts`
- Modify: `scripts/evaluate-chat-planner.ts`

- [ ] **Step 1: Expand golden expectations**

Add expected `operation`, `temporalConstraint`, `requestedFields`, execution kind, and source categories to `ChatPlannerGoldenCase`. For `recent-project-ai-usage`, require content-oriented model execution and project evidence; reject chronological direct response.

- [ ] **Step 2: Update unit and live evaluators**

Compare every new expected field. Include actual values in failure output so model drift is diagnosable.

- [ ] **Step 3: Verify evaluation**

Run:

```bash
pnpm vitest run features/chat/lib/chat-planner-evaluation.test.ts
pnpm eval:chat-planner
pnpm eval:chat-retrieval
```

Expected: all golden cases pass and retrieval failures remain empty.

## Task 4: Full Runtime Verification

**Files:**
- Modify only files required by discovered failures.

- [ ] **Step 1: Run static and automated checks**

```bash
pnpm exec tsc --noEmit
pnpm eslint features/chat scripts/evaluate-chat-planner.ts
pnpm test:run
git diff --check
```

- [ ] **Step 2: Verify the original question in the browser**

Ask `최근 프로젝트에서 AI를 어떻게 활용하고 있어?`. Assert the response discusses project AI usage, cites project sources, and does not use the deterministic `최신 글은 ...` answer.

- [ ] **Step 3: Build and commit**

Run `pnpm build`, then commit the focused regression fix and tests.
