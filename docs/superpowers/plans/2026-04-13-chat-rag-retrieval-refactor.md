# Chat RAG Retrieval Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 질문 해석, lexical retrieval, semantic RAG를 정리해서 프로젝트/소개/블로그 문서 검색 품질을 안정화한다.

**Architecture:** control plane은 유지하고 retrieval plane을 정리한다. 먼저 query 전처리와 문서 search term 생성을 분리하고, 다음으로 project/about/assistant source를 블로그와 유사한 chunk 구조로 맞춘 뒤, lexical candidate와 semantic candidate를 공통 rerank로 합친다.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Vitest 4, pg/pgvector, ai SDK, OpenAI-compatible embedding provider

---

### Task 1: Query Pipeline 분리와 lexical 검색 회귀 보강

**Files:**
- Create: `features/chat/lib/chat-query-normalization.ts`
- Create: `features/chat/lib/chat-query-normalization.test.ts`
- Modify: `features/chat/lib/chat-search.ts`
- Modify: `features/chat/lib/question-analysis.ts`
- Modify: `shared/config/search-terms.ts`
- Modify: `features/chat/lib/chat-search.test.ts`

- [ ] **Step 1: failing test 추가**
  - `"[프로젝트명] 알아?"`, `"[프로젝트명]가 뭐야?"`, `"[기술명] 관련 글"` 케이스를 `chat-search.test.ts`와 `chat-query-normalization.test.ts`에 추가한다.

- [ ] **Step 2: test 실패 확인**
  - Run: `pnpm test:run features/chat/lib/chat-search.test.ts features/chat/lib/chat-query-normalization.test.ts`
  - Expected: 새 회귀 테스트가 실패한다.

- [ ] **Step 3: query 전용 정규화 구현**
  - 질문형 군더더기 표현, entity/title exact match, source category hint를 `chat-query-normalization.ts`로 분리한다.
  - `question-analysis.ts`가 `additionalKeywords`, `preferredSourceCategories`를 채우도록 연결한다.

- [ ] **Step 4: 최소 구현으로 lexical search 연결**
  - `chat-search.ts`가 query normalization 결과를 사용하도록 바꾼다.
  - `shared/config/search-terms.ts`는 document indexing용 기본 설정만 남기고, query stopword는 query 전용 모듈로 옮긴다.

- [ ] **Step 5: 검증**
  - Run: `pnpm test:run features/chat/lib/chat-search.test.ts features/chat/lib/chat-query-normalization.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - Run: `pnpm exec eslint features/chat/lib/chat-query-normalization.ts features/chat/lib/chat-query-normalization.test.ts features/chat/lib/chat-search.ts features/chat/lib/question-analysis.ts shared/config/search-terms.ts features/chat/lib/chat-search.test.ts`
  - Run: `pnpm exec tsc --noEmit`

- [ ] **Step 6: commit**
  - `git add docs/superpowers/plans/2026-04-13-chat-rag-retrieval-refactor.md features/chat/lib/chat-query-normalization.ts features/chat/lib/chat-query-normalization.test.ts features/chat/lib/chat-search.ts features/chat/lib/question-analysis.ts shared/config/search-terms.ts features/chat/lib/chat-search.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - `git commit -m "refactor(chat): improve query normalization"`

### Task 2: Project/About/Assistant source chunking

**Files:**
- Create: `features/chat/lib/chat-curated-source-records.ts`
- Create: `features/chat/lib/chat-curated-source-records.test.ts`
- Modify: `features/chat/model/get-curated-chat-sources.ts`
- Modify: `features/chat/model/get-curated-chat-sources.test.ts`
- Modify: `features/chat/model/chat-evidence.ts`
- Modify: `scripts/generate-chat-rag-postgres.ts`

- [ ] **Step 1: failing test 추가**
  - project/about/assistant source가 intro + heading section 레벨로 분할되는 테스트를 추가한다.

- [ ] **Step 2: test 실패 확인**
  - Run: `pnpm test:run features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.test.ts`
  - Expected: 새 chunking 테스트가 실패한다.

- [ ] **Step 3: curated source record builder 구현**
  - MDX heading 분해, anchor/url 생성, excerpt/content trimming, semantic term 연결을 공용 유틸로 분리한다.
  - `get-curated-chat-sources.ts`는 문서 타입별 raw 데이터를 만들고, record builder를 호출하도록 단순화한다.

- [ ] **Step 4: RAG 인덱싱 입력 정렬**
  - chunk id와 sectionTitle이 프로젝트/소개/assistant에도 안정적으로 들어가도록 맞춘다.

- [ ] **Step 5: 검증**
  - Run: `pnpm test:run features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/lib/chat-search.test.ts`
  - Run: `pnpm exec eslint features/chat/lib/chat-curated-source-records.ts features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/model/chat-evidence.ts scripts/generate-chat-rag-postgres.ts`
  - Run: `pnpm exec tsc --noEmit`

- [ ] **Step 6: commit**
  - `git add features/chat/lib/chat-curated-source-records.ts features/chat/lib/chat-curated-source-records.test.ts features/chat/model/get-curated-chat-sources.ts features/chat/model/get-curated-chat-sources.test.ts features/chat/model/chat-evidence.ts scripts/generate-chat-rag-postgres.ts`
  - `git commit -m "refactor(chat): chunk curated retrieval sources"`

### Task 3: Lexical + Semantic 통합 rerank

**Files:**
- Create: `features/chat/lib/chat-retrieval-ranking.ts`
- Create: `features/chat/lib/chat-retrieval-ranking.test.ts`
- Modify: `features/chat/model/chat-rag-workflow.ts`
- Modify: `features/chat/lib/resolve-chat-request.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `features/chat/config/chat-rag.ts`

- [ ] **Step 1: failing test 추가**
  - lexical에서는 잡히고 semantic에서는 약한 케이스, semantic에서는 잡히고 lexical에서는 약한 케이스를 합쳐 top-k가 안정적으로 나오는 테스트를 추가한다.

- [ ] **Step 2: test 실패 확인**
  - Run: `pnpm test:run features/chat/lib/chat-retrieval-ranking.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - Expected: 새 통합 ranking 테스트가 실패한다.

- [ ] **Step 3: candidate merger/reranker 구현**
  - lexical top N과 semantic top N을 합치고, entity/title/source category/current post boost를 공통 계산하는 모듈을 만든다.

- [ ] **Step 4: route 흐름 개편**
  - retrieval/corpus 질문은 lexical 선행 실패 후 RAG fallback이 아니라 공동 candidate generation을 사용하도록 route를 정리한다.

- [ ] **Step 5: 검증**
  - Run: `pnpm test:run features/chat/lib/chat-retrieval-ranking.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts features/chat/model/chat-rag-workflow.test.ts`
  - Run: `pnpm exec eslint features/chat/lib/chat-retrieval-ranking.ts features/chat/lib/chat-retrieval-ranking.test.ts features/chat/model/chat-rag-workflow.ts features/chat/lib/resolve-chat-request.ts app/api/chat/route.ts features/chat/config/chat-rag.ts`
  - Run: `pnpm exec tsc --noEmit`

- [ ] **Step 6: commit**
  - `git add features/chat/lib/chat-retrieval-ranking.ts features/chat/lib/chat-retrieval-ranking.test.ts features/chat/model/chat-rag-workflow.ts features/chat/lib/resolve-chat-request.ts app/api/chat/route.ts features/chat/config/chat-rag.ts`
  - `git commit -m "refactor(chat): unify lexical and semantic retrieval"`

### Task 4: 평가셋과 회귀 검증 보강

**Files:**
- Create: `features/chat/fixtures/chat-retrieval-evaluation.ts`
- Create: `features/chat/lib/chat-retrieval-evaluation.test.ts`
- Modify: `features/chat/lib/chat-search.test.ts`
- Modify: `features/chat/lib/resolve-chat-request.test.ts`
- Modify: `app/api/chat/route.test.ts`

- [ ] **Step 1: 대표 질의 평가셋 작성**
  - project/profile/assistant/blog/current-post/corpus를 포함하는 representative query set을 fixture로 만든다.

- [ ] **Step 2: 평가 테스트 작성**
  - 최소 top-1 또는 top-k hit expectation을 검증한다.

- [ ] **Step 3: 검증**
  - Run: `pnpm test:run features/chat/lib/chat-retrieval-evaluation.test.ts features/chat/lib/chat-search.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - Run: `pnpm exec eslint features/chat/fixtures/chat-retrieval-evaluation.ts features/chat/lib/chat-retrieval-evaluation.test.ts features/chat/lib/chat-search.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - Run: `pnpm exec tsc --noEmit`

- [ ] **Step 4: 전체 회귀 검증**
  - Run: `pnpm test:run features/chat/**/*.test.ts app/api/chat/route.test.ts`
  - Run: `pnpm exec eslint features/chat app/api/chat/route.ts shared/config/search-terms.ts`
  - Run: `pnpm exec tsc --noEmit`

- [ ] **Step 5: commit**
  - `git add features/chat/fixtures/chat-retrieval-evaluation.ts features/chat/lib/chat-retrieval-evaluation.test.ts features/chat/lib/chat-search.test.ts features/chat/lib/resolve-chat-request.test.ts app/api/chat/route.test.ts`
  - `git commit -m "test(chat): add retrieval evaluation coverage"`
