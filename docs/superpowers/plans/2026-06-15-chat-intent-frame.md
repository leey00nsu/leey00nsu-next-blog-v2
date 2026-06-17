# Chat Intent Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** planner의 중복 라우팅 판단을 typed intent frame과 순수 validator로 대체한다.

**Architecture:** AI는 사용자의 의미를 `ChatIntentFrame`으로만 반환한다. 순수 model 함수가 frame을 정규화하고 기존 `ChatQuestionPlan`으로 변환해 현재 executor와 retrieval 파이프라인을 유지한다.

**Tech Stack:** TypeScript 5, Zod 4, AI SDK 6, Vitest 4

---

### Task 1: Intent Frame Schema

**Files:**
- Create: `features/chat/model/chat-intent-frame.ts`
- Create: `features/chat/model/chat-intent-frame.test.ts`

- [ ] **Step 1: Write the failing schema tests**

최신 글 게시일 질문과 작성자 사용 경험 질문을 표현하는 frame을 파싱하고, 필수 검색 개념과 누락 slot의 타입을 검증한다.

- [ ] **Step 2: Run the schema test and verify it fails**

Run: `pnpm vitest run features/chat/model/chat-intent-frame.test.ts`

Expected: FAIL because `chat-intent-frame.ts` does not exist.

- [ ] **Step 3: Implement the Zod schema and exported interfaces**

`operation`, `target`, `temporalConstraint`, `requestedFields`, `evidenceScope`, `searchConcepts`, `missingSlots`, `confidence`, `reason`을 명시한다.

- [ ] **Step 4: Run the schema test and verify it passes**

Run: `pnpm vitest run features/chat/model/chat-intent-frame.test.ts`

Expected: PASS.

### Task 2: Validator and Compatibility Adapter

**Files:**
- Create: `features/chat/model/resolve-chat-intent-frame.ts`
- Create: `features/chat/model/resolve-chat-intent-frame.test.ts`

- [ ] **Step 1: Write failing behavior tests**

다음 계약을 테스트한다.

- 최신 글 게시일 frame은 `latest_post` direct plan이 된다.
- 최신 글 요약 frame은 최신 글 selector를 유지하면서 모델 호출이 가능한 plan이 된다.
- 작성자 target은 profile source를 사용한다.
- missing slot이 있으면 clarify plan이 된다.
- required search concepts는 `additionalKeywords`에 보존된다.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run features/chat/model/resolve-chat-intent-frame.test.ts`

Expected: FAIL because resolver does not exist.

- [ ] **Step 3: Implement normalization and plan conversion**

frame 내부 모순을 정규화하고 `ChatQuestionPlanSchema`로 최종 결과를 검증한다.

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run features/chat/model/resolve-chat-intent-frame.test.ts`

Expected: PASS.

### Task 3: Planner Integration

**Files:**
- Modify: `features/chat/api/plan-chat-question.ts`
- Modify: `features/chat/api/plan-chat-question.test.ts`
- Modify: `features/chat/api/plan-chat-question.model-normalization.test.ts`

- [ ] **Step 1: Change planner tests to return intent frames**

문자열 패턴 보정 없이 frame의 시간 조건과 requested field가 기존 plan으로 변환되는지 검증한다.

- [ ] **Step 2: Run planner tests and verify they fail**

Run: `pnpm vitest run features/chat/api/plan-chat-question.test.ts features/chat/api/plan-chat-question.model-normalization.test.ts`

Expected: FAIL because planner still requests `ChatQuestionPlanSchema`.

- [ ] **Step 3: Request `ChatIntentFrameSchema` and invoke the adapter**

prompt에서 파생 필드인 route/direct action 지시를 제거하고 intent frame 필드를 설명한다. 기존 follow-up context는 입력 맥락 보강 용도로 유지한다.

- [ ] **Step 4: Run planner tests and verify they pass**

Run: `pnpm vitest run features/chat/api/plan-chat-question.test.ts features/chat/api/plan-chat-question.model-normalization.test.ts`

Expected: PASS.

### Task 4: Regression Verification

**Files:**
- Modify as required by type errors in existing chat tests.

- [ ] **Step 1: Run all chat tests**

Run: `pnpm vitest run app/api/chat features/chat`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: no ESLint errors.

- [ ] **Step 3: Exercise representative questions**

Verify `vercel 써봤어?`, confirmed author follow-up, and `마지막 글 언제야?` through the application-level chat function or local API.

Expected: grounded answers without repeated clarification.
