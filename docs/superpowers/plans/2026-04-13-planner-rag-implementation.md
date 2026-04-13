# Planner RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** hard selector routing을 planner 기반 soft decision으로 교체해 mixed-intent와 multi-turn 질문에서도 retrieval이 안정적으로 동작하게 만든다.

**Architecture:** 기존 `classify -> route gate -> retrieval fallback` 구조를 `planner -> direct/clarify/retrieval decision -> hybrid retrieval` 구조로 바꾼다. deterministic action은 최소 범위만 유지하고, assistant identity 계열은 retrieval 경로로 이동시킨다.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, ai SDK 6, gpt-5.4-mini, Vitest 4, pg/pgvector

---

### Task 1: Planner Schema와 Fallback Planner 추가

**Files:**
- Create: `features/chat/model/chat-question-plan.ts`
- Create: `features/chat/api/plan-chat-question.ts`
- Create: `features/chat/api/plan-chat-question.test.ts`
- Modify: `features/chat/lib/rewrite-chat-question.ts`

- [ ] Step 1: planner structured output 테스트 추가
- [ ] Step 2: fallback planner가 mixed-intent와 clarification을 구분하도록 구현
- [ ] Step 3: `gpt-5.4-mini` planner prompt와 schema 연결
- [ ] Step 4: planner 단위 테스트 실행
- [ ] Step 5: commit

### Task 2: Route를 Planner Orchestration으로 교체

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/chat/route.test.ts`
- Modify: `features/chat/model/chat-schema.ts` (clarification response 확인 필요 시)

- [ ] Step 1: failing test 추가
- [ ] Step 2: route에서 classification 제거, planner 우선 실행
- [ ] Step 3: `social_reply`, `clarification`, `deterministic_action`, `retrieval` 경로로 정리
- [ ] Step 4: route 테스트 실행
- [ ] Step 5: commit

### Task 3: Retrieval 결합부와 Deterministic Action 정리

**Files:**
- Modify: `features/chat/lib/resolve-chat-request.ts`
- Modify: `features/chat/lib/resolve-chat-request.test.ts`
- Modify: `features/chat/lib/chat-retrieval-evaluation.test.ts`
- Modify: `features/chat/fixtures/chat-retrieval-evaluation.ts`

- [ ] Step 1: assistant identity hard gate 제거
- [ ] Step 2: deterministic action은 `contact/latest/oldest/social_reply`만 유지
- [ ] Step 3: clarification과 current-post 흐름을 planner 기준으로 정리
- [ ] Step 4: retrieval evaluation 보강
- [ ] Step 5: commit

### Task 4: 전체 회귀 검증

**Files:**
- Modify as needed based on failures

- [ ] Step 1: `pnpm test:run features/chat/**/*.test.ts app/api/chat/route.test.ts`
- [ ] Step 2: `pnpm exec eslint features/chat app/api/chat/route.ts`
- [ ] Step 3: `pnpm exec tsc --noEmit`
- [ ] Step 4: commit
