# Chat Refusal Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return a localized, non-empty user-facing answer for every chatbot refusal while preserving its structured refusal reason.

**Architecture:** Add one pure refusal-response builder keyed by locale and refusal reason. Route workflow and application refusals through it, enforce the non-empty public response contract in Zod, and verify the Lee Chat adapter no longer turns expected refusals into HTTP 500 errors.

**Tech Stack:** Next.js 16.1.1, TypeScript 5, Zod 4.1.5, Vitest 4.0.16, Lee Chat SDK 0.3.1

---

## File Structure

- Create `features/chat/lib/build-chat-refusal-response.ts`: localized refusal message mapping and response builder.
- Create `features/chat/lib/build-chat-refusal-response.test.ts`: exhaustive locale/reason contract tests.
- Modify `features/chat/model/chat-schema.ts`: require non-empty public answers.
- Modify `features/chat/model/chat-schema.test.ts`: reject empty public answers.
- Modify `features/chat/lib/blog-chat-response.ts`: use the shared builder for model/citation refusals.
- Modify `features/chat/model/chat-workflow.ts`: use the shared builder at every graph refusal branch.
- Modify `features/chat/model/answer-blog-chat-question.ts`: use the shared builder for application limits and validation refusals.
- Modify `features/chat/model/chat-workflow.test.ts`: cover an unsupported public fact.
- Modify `app/api/chat/route-adapter.test.ts`: prove Lee Chat returns a refusal as HTTP 200 text.

### Task 1: Define the refusal response contract

**Files:**
- Create: `features/chat/lib/build-chat-refusal-response.test.ts`
- Create: `features/chat/lib/build-chat-refusal-response.ts`
- Modify: `features/chat/model/chat-schema.test.ts`
- Modify: `features/chat/model/chat-schema.ts`

- [ ] **Step 1: Write failing tests**

Assert that `buildChatRefusalResponse({ locale: 'ko', refusalReason: 'insufficient_search_match' })` returns answer `공개된 정보에서는 확인할 수 없어요.`, empty citations, `grounded: false`, and the unchanged reason. Iterate every `BlogChatResponse['refusalReason']` for `ko` and `en` and assert a non-empty answer. Add a schema test that `BlogChatResponseSchema.safeParse({ answer: '', citations: [], grounded: false, refusalReason: 'insufficient_search_match' }).success` is false.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/lib/build-chat-refusal-response.test.ts features/chat/model/chat-schema.test.ts`

Expected: FAIL because the builder does not exist and the schema accepts an empty answer.

- [ ] **Step 3: Implement the pure builder and schema constraint**

Export `buildChatRefusalResponse(params: { locale: SupportedLocale; refusalReason: NonNullable<BlogChatResponse['refusalReason']> }): BlogChatResponse`. Use exhaustive `Record<SupportedLocale, Record<Reason, string>>` mappings and change `BlogChatResponseSchema.answer` to `z.string().trim().min(1)`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm vitest run features/chat/lib/build-chat-refusal-response.test.ts features/chat/model/chat-schema.test.ts`

Expected: both test files pass.

### Task 2: Route application refusals through the shared builder

**Files:**
- Modify: `features/chat/lib/blog-chat-response.ts`
- Modify: `features/chat/model/chat-workflow.ts`
- Modify: `features/chat/model/answer-blog-chat-question.ts`
- Modify: `features/chat/model/chat-workflow.test.ts`

- [ ] **Step 1: Write the failing workflow regression test**

Mock a compiled `lookup` plan for `이윤수의 나이` and make retrieval return `insufficient_search_match`. Assert the application response answer is `공개된 정보에서는 확인할 수 없어요.`, the refusal reason is preserved, and the answer model is not called.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run features/chat/model/chat-workflow.test.ts`

Expected: FAIL because the current graph returns an empty answer.

- [ ] **Step 3: Replace local refusal builders**

Import the shared builder in the workflow, response finalizer, and application entry point. Pass the request locale at each call. Keep model draft refusals separate until they are converted to a public `BlogChatResponse`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm vitest run features/chat/model/chat-workflow.test.ts features/chat/lib/blog-chat-response.test.ts features/chat/model/answer-blog-chat-question-stateful.test.ts`

Expected: all tests pass and no public refusal has an empty answer.

### Task 3: Verify the Lee Chat adapter and full application

**Files:**
- Modify: `app/api/chat/route-adapter.test.ts`

- [ ] **Step 1: Add the adapter regression test**

Return an application response containing `answer: '공개된 정보에서는 확인할 수 없어요.'`, `grounded: false`, and `refusalReason: 'insufficient_search_match'`. Assert `POST` returns status 200 and the Lee Chat assistant message contains that answer and structured metadata.

- [ ] **Step 2: Run targeted and full verification**

Run:

```bash
pnpm vitest run app/api/chat/route-adapter.test.ts features/chat/model/chat-workflow.test.ts features/chat/lib/build-chat-refusal-response.test.ts
pnpm exec tsc --noEmit
pnpm eslint app/api/chat features/chat
pnpm test:run
```

Expected: TypeScript, ESLint, and all Vitest files pass.

- [ ] **Step 3: Verify the original runtime scenario**

Send `이윤수의 나이` to the local chatbot. Assert HTTP 200, visible answer `공개된 정보에서는 확인할 수 없어요.`, no citations, and preserved `insufficient_search_match` or `insufficient_evidence` metadata.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat features/chat docs/superpowers/plans/2026-06-19-chat-refusal-response.md
git commit -m "fix(chat): return user-facing refusal messages"
```
